import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
import ts from "typescript";

function loadTypeScript(file, imports, globals = {}) {
  const testModule = { exports: {} };
  const code = ts.transpileModule(fs.readFileSync(new URL(`../${file}`, import.meta.url), "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2017 },
  }).outputText;
  vm.runInNewContext(code, {
    module: testModule, exports: testModule.exports,
    require: (name) => {
      assert.ok(name in imports, `Unexpected import: ${name}`);
      return imports[name];
    },
    process: { env: {} }, ...globals,
  });
  return testModule.exports;
}

class ApiError extends Error {
  constructor(message, status) { super(message); this.status = status; }
}

function setupService(get = async () => { throw new Error("Unexpected request"); }) {
  return loadTypeScript("src/services/StockInReportService.ts", {
    "@/utils/api": { __esModule: true, default: { get }, ApiError },
  });
}

const plain = (value) => JSON.parse(JSON.stringify(value));
const { normalizeStockInReportFilters: normalize } = setupService();

test("all date/part combinations preserve required calendar-date semantics", () => {
  const cases = [
    [{}, {}],
    [{ startDate: "2026-10-26" }, { startDate: "2026-10-26", endDate: "2026-10-26" }],
    [{ endDate: "2026-10-26" }, { endDate: "2026-10-26" }],
    [{ startDate: "2026-10-01", endDate: "2026-10-26" }, { startDate: "2026-10-01", endDate: "2026-10-26" }],
  ];
  for (const [input, expected] of cases) {
    for (const partId of [undefined, 42]) {
      const filters = { ...input, partId };
      assert.deepEqual(plain(normalize(filters)), plain({ ...expected, partId }));
      assert.deepEqual(plain(normalize(normalize(filters))), plain(normalize(filters)));
    }
  }
  assert.deepEqual(plain(normalize({ startDate: "", endDate: "" })), {});
});

test("reversed ranges, impossible dates, and invalid part IDs are rejected", () => {
  for (const input of [
    { startDate: "2026-10-27", endDate: "2026-10-26" },
    { startDate: "2026-02-30" }, { endDate: "2026-13-01" },
    { startDate: "26/10/2026" }, { endDate: "bad" },
    { partId: 0 }, { partId: -1 }, { partId: 1.5 },
  ]) assert.throws(() => normalize(input));
  assert.equal(normalize({ startDate: "2028-02-29" }).endDate, "2028-02-29");
});

test("PDF uses list filters without pagination and requests a binary file", async () => {
  const calls = [];
  const signal = new AbortController().signal;
  const { default: service } = setupService(async (path, options) => {
    calls.push({ path, options });
    if (path.endsWith("/export")) return {
      data: new Blob(["report"], { type: "application/pdf" }),
    };
    return { data: { success: true, data: [], pagination: { page: 3, limit: 25, total: 80, totalPage: 4 } } };
  });
  const filters = { startDate: "2026-10-26", partId: 42 };
  await service.getReport({ ...filters, page: 3, limit: 25 }, { signal });
  const file = await service.exportReport(filters, "pdf", { signal });
  assert.equal(await file.text(), "report");
  const expected = { startDate: "2026-10-26", endDate: "2026-10-26", partId: 42 };
  assert.deepEqual(plain(calls[0].options.params), { ...expected, page: 3, limit: 25 });
  assert.equal(calls[0].path, "/api/reports/stock-in");
  const { path, options } = calls[1];
  assert.equal(path, "/api/reports/stock-in/export");
  assert.deepEqual(plain(options.params), { ...expected, format: "pdf" });
  assert.equal(options.responseType, "blob");
  assert.equal(options.signal, signal);
});

test("unexpected/empty export files and failed/malformed lists are rejected", async () => {
  for (const data of [new Blob(), new Blob(['{"success":false}'], { type: "application/json" }), new Blob(["error"], { type: "text/html" })]) {
    const { default: service } = setupService(async () => ({ data }));
    await assert.rejects(service.exportReport({}, "pdf"));
  }
  for (const data of [{ success: false, message: "Report failed" }, { success: true, data: "wrong" }]) {
    const { default: service } = setupService(async () => ({ data }));
    await assert.rejects(service.getReport({}));
  }
});

test("only unavailable endpoints receive the pending availability state", () => {
  const { isStockInReportUnavailable } = setupService();
  for (const status of [404, 405, 501]) assert.equal(isStockInReportUnavailable(new ApiError("Pending", status)), true);
  for (const status of [401, 403, 500]) assert.equal(isStockInReportUnavailable(new ApiError("Error", status)), false);
  assert.equal(isStockInReportUnavailable(new Error("Network failure")), false);
});

function setupClient(fetch) {
  return loadTypeScript("src/utils/api.ts", {
    "@/utils/auth": { getAuthToken: () => null, isAuthTokenExpired: () => false },
  }, { fetch, Headers, AbortController, FormData, globalThis, Blob, URLSearchParams });
}

test("shared client parses successful binary exports and preserves JSON list responses", async () => {
  const calls = [];
  const { default: api } = setupClient(async (url, options) => {
    calls.push({ url, options });
    return url.includes("/export")
      ? new Response("pdf-content", { headers: { "Content-Type": "application/pdf" } })
      : Response.json({ success: true, data: [] });
  });
  const result = await api.get("/report/export", { responseType: "blob", params: { format: "pdf", startDate: "2026-10-26" } });
  assert.equal(await result.data.text(), "pdf-content");
  assert.equal(result.data.type, "application/pdf");
  assert.equal(calls[0].url, "/report/export?format=pdf&startDate=2026-10-26");
  assert.equal(calls[0].options.responseType, undefined);
  assert.equal(calls[0].options.credentials, "include");
  assert.deepEqual((await api.get("/report")).data, { success: true, data: [] });
});

test("binary request errors still expose the backend JSON error and status", async () => {
  const { default: api } = setupClient(async () => Response.json({ message: "Export pending" }, { status: 501 }));
  await assert.rejects(api.get("/report/export", { responseType: "blob" }), (error) => {
    assert.equal(error.message, "Export pending");
    assert.equal(error.status, 501);
    return true;
  });
});
