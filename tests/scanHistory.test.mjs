import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
import ts from "typescript";

// Exercise the actual TypeScript helpers without adding a test framework.
function loadTypeScript(file) {
  const testModule = { exports: {} };
  const code = ts.transpileModule(fs.readFileSync(new URL(`../${file}`, import.meta.url), "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2017 },
  }).outputText;
  vm.runInNewContext(code, {
    module: testModule, exports: testModule.exports,
    require: () => ({}), // The service's HTTP client is unused by normalization.
  });
  return testModule.exports;
}

const { groupScanSessions } = loadTypeScript("src/utils/scanHistory.ts");
const { normalizeTraceabilityDetail, mapTraceabilityLogV2Response, mapV2FullValues } = loadTypeScript("src/services/TraceabilityLogService.ts");
const entry = (id, code, seconds, status = null) => ({
  id, parameterCode: code, parameterName: code, value: 0, status,
  createdAt: `2026-10-15T10:00:${String(seconds).padStart(2, "0")}+07:00`,
});
const source = (entries, processCode = "HE_LEAK") => ({ processCode, processName: processCode, entries });

test("duplicate parameter starts a new session; reverse API order is handled", () => {
  const sessions = groupScanSessions([source([
    entry(4, "B", 3, false), entry(3, "A", 2, true),
    entry(2, "B", 1, null), entry(1, "A", 0, true),
  ])]);
  assert.equal(sessions.length, 2);
  assert.equal(sessions[0].number, 2);
  assert.equal(sessions[0].createdAt, entry(4, "B", 3).createdAt);
  assert.equal(sessions[0].okCount, 1);
  assert.equal(sessions[0].ngCount, 1);
  assert.equal(sessions[1].ngCount, 0); // Unknown status must not become NG.
  for (const session of sessions) {
    assert.equal(new Set(session.entries.map((item) => item.parameterCode)).size, session.entries.length);
  }
});

test("gap is measured between adjacent parameters, with an inclusive 5 second boundary", () => {
  const sessions = groupScanSessions([source([
    entry(1, "A", 0), entry(2, "B", 5), entry(3, "C", 10), entry(4, "D", 16),
  ])]);
  assert.equal(sessions.length, 2);
  assert.equal(sessions[1].entries.length, 3);
  assert.equal(groupScanSessions([source([entry(1, "A", 0), entry(2, "B", 6)])], 10_000).length, 1);
});

test("same timestamps use IDs and duplicate codes remain in different sessions", () => {
  const sessions = groupScanSessions([source([entry(3, "a", 0), entry(2, "B", 0), entry(1, "A", 0)])]);
  assert.equal(sessions.length, 2);
  assert.equal(sessions[1].entries.length, 2);
});

test("different processes never share a session and latest process comes first", () => {
  const sessions = groupScanSessions([
    source([entry(1, "A", 0)], "CLINCHING_SHORT"),
    source([entry(2, "B", 1)], "CLINCHING_LONG"),
  ]);
  assert.equal(sessions.length, 2);
  assert.equal(sessions[0].processCode, "CLINCHING_LONG");
});

test("empty history, missing codes, and invalid times are safe", () => {
  assert.equal(groupScanSessions([]).length, 0);
  const entries = [entry(1, "A", 0), { ...entry(2, "B", 1), createdAt: "invalid" },
    { ...entry(3, "C", 2), createdAt: undefined }, entry(4, "", 3), entry(5, "", 4)];
  const sessions = groupScanSessions([source(entries)]);
  assert.equal(sessions.reduce((count, session) => count + session.entries.length, 0), 5);
  assert.equal(sessions.at(-1).createdAt, undefined);
});

test("nested API sections preserve parameters and isolate history for all five cards", () => {
  const detail = {};
  for (const key of ["clinching", "heLeak", "mfan", "ecm", "final"]) {
    detail[key] = [{ processCode: key, processName: key,
      parameters: [{ parameter: "ZERO", value: 0, status: false }, { parameter: "BOOL", value: false }],
      history: [null, entry(1, "ZERO", 0, false), entry(2, "BOOL", 1, true)],
    }];
  }
  const result = normalizeTraceabilityDetail({ serialNumberClinching: "CC123", detail });
  for (const key of Object.keys(detail)) {
    assert.equal(result.detail[key][0].value, 0);
    assert.equal(result.detail[key][1].value, false);
    assert.equal(result.history[key][0].entries.length, 2);
    assert.equal(groupScanSessions(result.history[key]).length, 1);
  }
});

test("legacy flat parameters, absent history, and null collections still render", () => {
  const result = normalizeTraceabilityDetail({ detail: {
    clinching: [null, { parameter: "P1", parameterDesc: "Part", value: false, status: false }],
    heLeak: null, mfan: [{ parameters: null, history: null }],
  }});
  assert.equal(result.detail.clinching[0].parameterDesc, "Part");
  assert.equal(result.detail.clinching[0].value, false);
  assert.equal(groupScanSessions(result.history.clinching).length, 0);
  assert.equal(result.detail.heLeak.length, 0);
  assert.equal(result.detail.mfan.length, 0);
  assert.equal(normalizeTraceabilityDetail(null).detail.final.length, 0);
});

test("new process sections retain MQTT configuration, result, and sibling boundaries", () => {
  const result = normalizeTraceabilityDetail({ detail: { clinching: [
    { processCode: "CLINCHING_SHORT_SIDE", processName: "Short Side", result: false,
      isMqttPublisher: false, mqttPublisherStatus: "Disabled", reason: "Configured off",
      parameters: [{ parameter: "P1", value: "-", status: null }], history: [entry(1, "P1", 0)] },
    { processCode: "CLINCHING_LONG_SIDE", processName: "Long Side", result: true,
      isMqttPublisher: true, parameters: [{ parameter: "P1", value: false, status: false }], history: [] },
  ] } });
  assert.equal(result.sections.clinching.length, 2);
  assert.equal(result.sections.clinching[0].isMqttPublisher, false);
  assert.equal(result.sections.clinching[0].reason, "Configured off");
  assert.equal(result.sections.clinching[0].result, false);
  assert.equal(result.sections.clinching[1].isMqttPublisher, true);
  assert.equal(result.sections.clinching[1].parameters[0].value, false);
  assert.equal(result.sections.clinching[0].history.length, 1);
  assert.equal(result.history.clinching[0].entries[0].id, 1);
});

test("all traceability adapters read nested sections with backend process codes", () => {
  const log = { id: 1, serialNumberClinching: "CC123", createdAt: "2026-10-15T10:00:00Z",
    detail: { heLeak: [{ processCode: "HE_LEAK", processName: "Leak Inspection", result: false,
      parameters: [{ parameter: "LEAK_RESULT", parameterDesc: "Leak Result", value: false, status: false }] }] } };
  const mapped = mapTraceabilityLogV2Response(log);
  const leak = mapped.details.find((detail) => detail.processCode === "HE_LEAK");
  assert.equal(leak.processName, "Leak Inspection");
  assert.equal(leak.result, false);
  assert.equal(leak.parameters[0].parameterName, "Leak Result");
  assert.equal(leak.parameters[0].values[0], false);
  const full = mapV2FullValues(log);
  assert.equal(full.overall.length, 1);
  assert.equal(full.overall[0].processCode, "HE_LEAK");
  assert.equal(full.overall[0].parameterCode, "LEAK_RESULT");
  assert.equal(full.overall[0].value, false);
});

test("nullable root data and status alias are normalized safely", () => {
  const log = normalizeTraceabilityDetail({ issueNumbersClinching: null, issueNumbersMfan: [null, "ISS1"],
    detail: { ecm: [{ processCode: "ECM_ASSY", status: "Disabled", isMqttPublisher: null, parameters: null }] } });
  assert.equal(log.issueNumbersClinching.length, 0);
  assert.equal(log.issueNumbersMfan.length, 1);
  assert.equal(log.sections.ecm[0].mqttPublisherStatus, "Disabled");
  assert.equal(log.sections.ecm[0].isMqttPublisher, null);
  assert.equal(log.sections.ecm[0].parameters.length, 0);
});
