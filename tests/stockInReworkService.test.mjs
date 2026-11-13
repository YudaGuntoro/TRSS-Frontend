import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
import ts from "typescript";

function loadService(serialNumber = { id: 42 }, lookupError) {
  const calls = [];
  const code = ts.transpileModule(
    fs.readFileSync(new URL("../src/services/StockInReworkService.ts", import.meta.url), "utf8"),
    { compilerOptions: { module: ts.ModuleKind.CommonJS, esModuleInterop: true } },
  ).outputText;
  const testModule = { exports: {} };
  const api = {
    get: async (url, options) => {
      calls.push({ url, options });
      return { data: { data: [], pagination: { total: 0 } } };
    },
    post: async (url, data, options) => {
      calls.push({ url, data, options });
      return { data: { success: true, data: [] } };
    },
  };
  vm.runInNewContext(code, {
    module: testModule, exports: testModule.exports,
    require: (name) => {
      if (name === "@/utils/api") return api;
      if (name === "./SerialNumberService") return {
        getSerialNumberByCode: async (code, options) => {
          calls.push({ lookup: code, options });
          if (lookupError) throw lookupError;
          return { data: serialNumber };
        },
      };
      return {};
    },
  });
  return { service: testModule.exports.default, calls };
}

test("history resolves exact serial to the supported backend ID filter", async () => {
  const { service, calls } = loadService();
  const signal = new AbortController().signal;
  await service.getStockInReworks({ serialNumberCode: " SN-001 ", disposition: "SCRAP", page: 2, limit: 10 }, { signal });
  assert.equal(calls[0].lookup, "SN-001");
  assert.equal(calls[0].options.signal, signal);
  assert.equal(calls[1].options.params.serialNumberId, 42);
  assert.equal(calls[1].options.params.serialNumberCode, undefined);
  assert.equal(calls[1].options.params.disposition, "SCRAP");
  assert.equal(calls[1].options.params.page, 2);
});

test("pending history uses the backend default without a serial lookup", async () => {
  const { service, calls } = loadService();
  await service.getStockInReworks({ disposition: "", page: 1 });
  assert.equal(calls.length, 1);
  assert.equal(calls[0].options.params.disposition, undefined);
});

test("a missing serial or cancelled lookup never requests unfiltered history", async () => {
  const missing = loadService(null);
  await assert.rejects(missing.service.getStockInReworks({ serialNumberCode: "missing" }), /tidak ditemukan/);
  assert.equal(missing.calls.length, 1);
  const cancelled = loadService(null, new DOMException("Aborted", "AbortError"));
  await assert.rejects(cancelled.service.getStockInReworks({ serialNumberCode: "SN" }), { name: "AbortError" });
  assert.equal(cancelled.calls.length, 1);
});

test("batch submission preserves both OK and NG values in one request", async () => {
  const { service, calls } = loadService();
  const data = { serialNumberCode: "SN-001", issueNumbers: [{ issueNumber: "I1", status: true }, { issueNumber: "I2", status: false }] };
  await service.createStockInRework(data);
  assert.equal(calls.length, 1);
  assert.equal(calls[0].url, "/api/stock-in-reworks");
  assert.equal(calls[0].data, data);
});
