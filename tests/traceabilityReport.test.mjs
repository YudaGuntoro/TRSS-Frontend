import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
import ts from "typescript";

function loadService(api = { get: async () => { throw new Error("Unexpected request"); } }) {
  const testModule = { exports: {} };
  const source = fs.readFileSync(new URL("../src/services/TraceabilityReportService.ts", import.meta.url), "utf8");
  const code = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2017 },
  }).outputText;
  class ApiError extends Error {
    constructor(message, status) { super(message); this.status = status; }
  }
  vm.runInNewContext(code, {
    module: testModule, exports: testModule.exports, process: { env: {} },
    require(name) {
      if (name === "@/utils/api") return { __esModule: true, default: api, ApiError };
      throw new Error(`Unexpected import: ${name}`);
    },
  });
  return { ...testModule.exports, ApiError };
}
const plain = value => JSON.parse(JSON.stringify(value));

test("report filter date modes follow BE calendar-day contract", () => {
  const { normalizeTraceabilityReportFilters: normalize } = loadService();
  assert.deepEqual(plain(normalize({})), {});
  assert.deepEqual(plain(normalize({ startDate: "2026-10-26" })), { startDate: "2026-10-26", endDate: "2026-10-26" });
  assert.deepEqual(plain(normalize({ endDate: "2026-10-26" })), { endDate: "2026-10-26" });
  assert.deepEqual(plain(normalize({ startDate: "2026-10-01", endDate: "2026-10-26" })), { startDate: "2026-10-01", endDate: "2026-10-26" });
  assert.deepEqual(plain(normalize({ startDate: "", endDate: "" })), {});
  for (const filters of [
    { startDate: "2026-10-27", endDate: "2026-10-26" },
    { startDate: "2026-02-30" }, { endDate: "2026-13-01" },
  ]) assert.throws(() => normalize(filters));
});

test("report requests server-side pagination and sorting", async () => {
  const calls = [];
  const { default: service } = loadService({ get: async (path, options) => {
    calls.push({ path, options });
    return { data: { success: true, data: [{ id: 42, serialNumberClinching: "C42", serialNumberMfan: "M42", status: "OK" }], pagination: { page: options.params.page, limit: options.params.limit, total: 1, totalPage: 1 } } };
  } });
  const signal = new AbortController().signal;
  for (const sort of ["newest", "oldest"]) {
    const result = await service.getReport({ filters: { startDate: "2026-10-26" }, page: 2, limit: 25, sort }, { signal });
    assert.equal(result.data[0].serialNumberMfan, "M42");
  }
  assert.equal(calls.length, 2);
  for (const [index, sortOrder] of ["desc", "asc"].entries()) {
    assert.equal(calls[index].path, "/api/reports/traceability");
    assert.deepEqual(plain(calls[index].options.params), {
      startDate: "2026-10-26", endDate: "2026-10-26", page: 2, limit: 25,
      sortBy: "createdAt", sortOrder,
    });
    assert.equal(calls[index].options.signal, signal);
  }
});

test("detail PDF uses the BE route and the selected Clinching serial", async () => {
  const calls = [];
  const { default: service, getTraceabilityDetailFilename } = loadService({ get: async (path, options) => {
    calls.push({ path, options });
    return { data: new Blob(["%PDF-1.3"], { type: "application/pdf" }) };
  } });
  const signal = new AbortController().signal;
  const file = await service.exportDetailPdf(" PVRA/001? ", { signal });
  assert.equal(await file.text(), "%PDF-1.3");
  assert.equal(calls[0].path, "/api/reports/traceability-log/PVRA%2F001%3F/export");
  assert.deepEqual(plain(calls[0].options.params), { format: "pdf" });
  assert.equal(calls[0].options.responseType, "blob");
  assert.equal(calls[0].options.signal, signal);
  assert.equal(getTraceabilityDetailFilename(" PVRA/001? "), "Traceability_PVRA_001_.pdf");
});

test("different row exports use independent requests", async () => {
  const calls = [];
  const { default: service } = loadService({ get: async (path) => {
    calls.push(path);
    return { data: new Blob(["%PDF-1.3"], { type: "application/pdf" }) };
  } });
  await Promise.all([service.exportDetailPdf("PVRA001"), service.exportDetailPdf("PVRA002")]);
  assert.deepEqual(calls, [
    "/api/reports/traceability-log/PVRA001/export",
    "/api/reports/traceability-log/PVRA002/export",
  ]);
});

test("missing serial, empty file, and non-PDF responses are rejected", async () => {
  const { default: missing } = loadService();
  await assert.rejects(missing.exportDetailPdf(" "), /missing/);
  await assert.rejects(missing.exportDetailPdf("-"), /missing/);
  for (const data of [new Blob(), new Blob(["error"], { type: "application/json" })]) {
    const { default: invalid } = loadService({ get: async () => ({ data }) });
    await assert.rejects(invalid.exportDetailPdf("PVRA001"), /could not be downloaded/);
  }
});

test("unavailable endpoint is distinct from authentication and server failures", () => {
  const { isTraceabilityReportUnavailable, ApiError } = loadService();
  for (const status of [404, 405, 501]) assert.equal(isTraceabilityReportUnavailable(new ApiError("Pending", status)), true);
  for (const status of [401, 403, 500]) assert.equal(isTraceabilityReportUnavailable(new ApiError("Failure", status)), false);
});
