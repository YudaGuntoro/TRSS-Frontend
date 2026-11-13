import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
import ts from "typescript";

const testModule = { exports: {} };
const code = ts.transpileModule(
  fs.readFileSync(new URL("../src/utils/reworkQr.ts", import.meta.url), "utf8"),
  { compilerOptions: { module: ts.ModuleKind.CommonJS } },
).outputText;
vm.runInNewContext(code, { module: testModule, exports: testModule.exports });
const { parseReworkQr } = testModule.exports;

test("four supported delimiters extract only parameter three and preserve serial hyphens", () => {
  for (const separator of [";", ",", "|", " "]) {
    assert.equal(parseReworkQr(["PART-A", "PART-B", "CC20261113-001", "13112026"].join(separator)), "CC20261113-001");
  }
});

test("scanner whitespace and terminators are accepted", () => {
  assert.equal(parseReworkQr("  PART-A\tPART-B  CC20261113001 13112026\r\n"), "CC20261113001");
  assert.equal(parseReworkQr(" PART NAME ; SECOND PARAM ; SN-001 ; FOURTH PARAM \r\n"), "SN-001");
});

test("incomplete, ambiguous and stock-in labels cannot be submitted as serial numbers", () => {
  for (const value of ["", "CC20261113001", "A B 13112026", "A B SN EXTRA FIFTH", "A;B;;D", "A,B;SN;D", "A;B;SN WITH SPACE;D", "ISS;PART;NAME;10;2026.11.13;2026.11.13", "A;B;" + "S".repeat(101) + ";D"]) {
    assert.throws(() => parseReworkQr(value), /QR tidak valid/);
  }
});
