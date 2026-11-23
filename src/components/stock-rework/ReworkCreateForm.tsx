"use client";

import { useEffect, useRef, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/context/ToastContext";
import { AlertIcon } from "@/icons";
import { PERMISSIONS } from "@/utils/auth";
import { parseReworkQr } from "@/utils/reworkQr";
import ProcessLogService from "@/services/ProcessLogService";
import StockInReworkService from "@/services/StockInReworkService";

type IssueRow = {
  issueNumber: string;
  partName?: string | null;
  partNumber?: string | null;
  status: boolean | null;
  note: string;
};

type BlockedScanInfo = {
  serialNumber: string;
  source: string;
  isFinished: boolean;
  status: boolean;
};

export default function ReworkCreateForm() {
  const { can } = useAuth();
  const toast = useToast();
  const inputRef = useRef<HTMLInputElement>(null);
  const requestRef = useRef<AbortController | null>(null);
  const scanTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const submittingRef = useRef(false);
  const [qr, setQr] = useState("");
  const [serialNumber, setSerialNumber] = useState("");
  const [issues, setIssues] = useState<IssueRow[]>([]);
  const [blockedScanInfo, setBlockedScanInfo] = useState<BlockedScanInfo | null>(null);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const canCreate = can(PERMISSIONS.STOCK_IN_REWORK_CREATE);
  const okCount = issues.filter((issue) => issue.status === true).length;
  const ngCount = issues.filter((issue) => issue.status === false).length;
  const remaining = issues.length - okCount - ngCount;

  useEffect(() => {
    if (!submitting && canCreate) inputRef.current?.focus();
  }, [submitting, canCreate]);

  useEffect(() => () => {
    requestRef.current?.abort();
    if (scanTimerRef.current) clearTimeout(scanTimerRef.current);
  }, []);

  const loadIssues = async (value: string) => {
    if (submittingRef.current || !canCreate) return;
    if (scanTimerRef.current) clearTimeout(scanTimerRef.current);
    requestRef.current?.abort();
    const controller = new AbortController();
    requestRef.current = controller;
    setIssues([]);
    setSerialNumber("");
    setBlockedScanInfo(null);
    setLoading(false);
    try {
      const code = serialNumber && value.trim() === serialNumber ? serialNumber : parseReworkQr(value);
      setLoading(true);
      const result = await ProcessLogService.getIssuesBySerialNumber(
        code, { signal: controller.signal },
      );
      if (controller.signal.aborted) return;
      if (result.data?.isFinished === true && result.data?.status === true) {
        setQr(result.data.serialNumber || code);
        setBlockedScanInfo({
          serialNumber: result.data.serialNumber || code,
          source: result.data.source || "Process / Traceability Log",
          isFinished: true,
          status: true,
        });
        return;
      }
      if (!result.data?.issues.length) {
        throw new Error("Issue number tidak ditemukan. Pastikan serial number sudah selesai proses dan berstatus NG.");
      }

      const targetSerial = result.data.serialNumber || code;
      const existingResponses = await Promise.all(
        (["", "STOCK_IN", "SCRAP"] as const).map((disposition) =>
          StockInReworkService.getStockInReworks(
            {
              serialNumberCode: targetSerial,
              disposition,
              limit: 100,
              page: 1,
            },
            { signal: controller.signal }
          )
        )
      );
      if (controller.signal.aborted) return;

      const existingIssueSet = new Set(
        existingResponses.flatMap((res) =>
          res.data.map((item) => item.issueNumberBefore.trim().toUpperCase())
        )
      );
      const duplicateList = result.data.issues
        .map((issue) => issue.issueNumber.trim())
        .filter((issueNumber) => existingIssueSet.has(issueNumber.toUpperCase()));

      if (duplicateList.length > 0) {
        throw new Error(
          `Serial number ${targetSerial} dengan issue number (${duplicateList.join(", ")}) sudah terdaftar di data rework dan tidak dapat di-scan ulang.`
        );
      }

      setSerialNumber(targetSerial);
      setQr(code);
      setIssues(result.data.issues.map((issue) => ({ ...issue, status: null, note: "" })));
    } catch (scanError) {
      if (!controller.signal.aborted) {
        toast.error({
          title: "Scan gagal",
          message: scanError instanceof Error ? scanError.message : "Gagal mengambil issue number.",
        });
      }
    } finally {
      if (!controller.signal.aborted) setLoading(false);
    }
  };

  const handleScanChange = (value: string) => {
    requestRef.current?.abort();
    if (scanTimerRef.current) clearTimeout(scanTimerRef.current);
    setQr(value);
    setSerialNumber("");
    setIssues([]);
    setBlockedScanInfo(null);
    setLoading(false);
    // Enter/Tab scanners trigger immediately; scanners without a suffix trigger
    // once input has stopped, including format validation for an invalid QR.
    if (value.trim()) {
      scanTimerRef.current = setTimeout(() => { void loadIssues(value); }, 300);
    }
  };

  const resetScan = () => {
    handleScanChange("");
    inputRef.current?.focus();
  };

  const handleSubmit = async () => {
    if (submittingRef.current || !canCreate || loading || !serialNumber || !issues.length || remaining || !ngCount) return;
    submittingRef.current = true;
    setSubmitting(true);
    try {
      await StockInReworkService.createStockInRework({
        serialNumberCode: serialNumber,
        issueNumbers: issues.map((issue) => ({
          issueNumber: issue.issueNumber,
          note: issue.note.trim() || undefined,
          status: issue.status === true,
        })),
      });
      resetScan();
      toast.success({ title: "Rework tersimpan", message: "Seluruh status issue number berhasil disimpan." });
    } catch (submitError) {
      const message = submitError instanceof Error ? submitError.message : "Gagal menyimpan rework.";
      toast.error({ title: "Submit gagal", message });
    } finally {
      submittingRef.current = false;
      setSubmitting(false);
      inputRef.current?.focus();
    }
  };

  return (
    <div className="space-y-5">
      {blockedScanInfo && (
        <div
          role="alert"
          className="rounded-xl border border-error-300 bg-error-50 p-4 text-error-800 dark:border-error-500/40 dark:bg-error-500/10 dark:text-error-300 sm:p-5"
        >
          <div className="flex items-start gap-3">
            <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-error-100 text-error-600 dark:bg-error-500/20 dark:text-error-400">
              <AlertIcon className="h-5 w-5 fill-current" />
            </div>
            <div className="min-w-0 flex-1 space-y-3">
              <div>
                <h3 className="text-sm font-bold text-error-800 dark:text-error-300 sm:text-base">
                  Tidak Dapat Memproses Rework — Produk Berstatus OK &amp; Sudah Selesai
                </h3>
                <p className="mt-1 text-xs leading-relaxed text-error-700 dark:text-error-300/90 sm:text-sm">
                  Produk dengan serial number ini telah selesai melewati seluruh tahapan proses produksi dengan hasil baik (OK) dan tidak ditemukan kerusakan (NG). Proses Rework hanya dapat dilakukan untuk produk yang sudah selesai diproduksi tetapi memiliki hasil pemeriksaan NG (Rusak).
                </p>
              </div>

              <div className="grid grid-cols-1 gap-2 rounded-lg border border-error-200 bg-white/70 p-3 text-xs dark:border-error-500/30 dark:bg-gray-900/50 sm:grid-cols-2 lg:grid-cols-4">
                <div>
                  <span className="text-error-600/80 dark:text-error-400/80">Serial Number</span>
                  <p className="mt-0.5 break-all font-mono font-semibold text-error-900 dark:text-error-200">
                    {blockedScanInfo.serialNumber}
                  </p>
                </div>
                <div>
                  <span className="text-error-600/80 dark:text-error-400/80">Sumber Data</span>
                  <p className="mt-0.5 font-semibold text-error-900 dark:text-error-200">
                    {blockedScanInfo.source}
                  </p>
                </div>
                <div>
                  <span className="text-error-600/80 dark:text-error-400/80">Tahap Produksi</span>
                  <p className="mt-0.5 font-semibold text-error-900 dark:text-error-200">
                    {blockedScanInfo.isFinished ? "Sudah Selesai" : "Belum Selesai"}
                  </p>
                </div>
                <div>
                  <span className="text-error-600/80 dark:text-error-400/80">Hasil Pemeriksaan</span>
                  <p className="mt-0.5 font-semibold text-error-900 dark:text-error-200">
                    {blockedScanInfo.status ? "OK (Tidak Ada Kerusakan)" : "NG (Rusak)"}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      <section className="overflow-hidden rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
        <div className="border-b border-brand-100 bg-brand-50 px-5 py-6 dark:border-brand-500/20 dark:bg-brand-500/10 sm:px-6">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-brand-600 dark:text-brand-400">01 / Scan label produksi</p>
          <h2 className="text-2xl font-semibold text-gray-800 dark:text-white/90">Scan Rework</h2>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">Scan QR menggunakan scanner untuk menampilkan daftar issue number. Pastikan proses produksi sudah selesai dengan hasil NG.</p>
        </div>
        <div className="space-y-3 p-5 sm:p-6">
          <label htmlFor="rework-qr" className="block text-sm font-medium text-gray-700 dark:text-gray-300">QR label produksi</label>
          <div className="flex items-center gap-2">
            <input ref={inputRef} id="rework-qr" autoFocus autoComplete="off" spellCheck={false}
              value={qr} onChange={(event) => handleScanChange(event.target.value)}
              onKeyDown={(event) => {
                if ((event.key === "Enter" || event.key === "Tab") && event.currentTarget.value.trim() && !event.nativeEvent.isComposing) {
                  event.preventDefault();
                  void loadIssues(event.currentTarget.value);
                }
              }}
              disabled={submitting || !canCreate} aria-invalid={!!blockedScanInfo}
              placeholder="Siap scan QR — daftar issue akan tampil otomatis"
              className="h-12 min-w-0 flex-1 rounded-xl border border-gray-300 bg-transparent px-4 text-sm text-gray-800 outline-none focus:border-brand-500 focus:ring-3 focus:ring-brand-500/10 disabled:opacity-50 dark:border-gray-700 dark:text-white/90" />
            <button type="button" onClick={resetScan} disabled={submitting || !canCreate}
              className="h-12 shrink-0 rounded-xl border border-gray-300 px-3 text-sm font-medium text-gray-600 hover:bg-gray-50 focus-visible:outline-2 focus-visible:outline-brand-500 disabled:opacity-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800">
              Clear
            </button>
          </div>
          {!canCreate && <p role="alert" className="text-sm text-error-600">Anda tidak memiliki akses untuk scan rework.</p>}
        </div>
      </section>

      <section aria-busy={loading} className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-900 sm:p-6">
        <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-gray-500">02 / Validasi rework</p>
            <h2 className="text-lg font-semibold text-gray-800 dark:text-white/90">Issue Number</h2>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{serialNumber ? `Serial Number: ${serialNumber}` : "Daftar issue akan muncul setelah QR berhasil dipindai."}</p>
          </div>
          {!!issues.length && <div aria-live="polite" className="flex flex-wrap gap-2 text-xs font-semibold">
            <span className="rounded-full bg-gray-100 px-3 py-2 text-gray-600 dark:bg-gray-800 dark:text-gray-300">{issues.length} Issue</span>
            <span className="rounded-full bg-success-50 px-3 py-2 text-success-700 dark:bg-success-500/10 dark:text-success-400">{okCount} OK</span>
            <span className="rounded-full bg-error-50 px-3 py-2 text-error-700 dark:bg-error-500/10 dark:text-error-400">{ngCount} NG</span>
          </div>}
        </div>
        {!issues.length ? <div role="status" className="rounded-xl border border-dashed border-gray-300 px-4 py-12 text-center text-sm text-gray-500 dark:border-gray-700 dark:text-gray-400">
          {loading ? "Mengambil daftar issue number..." : "Menunggu scan QR"}
        </div> : <div className="space-y-3">
          {issues.map((issue, index) => (
            <div
              key={issue.issueNumber}
              className="space-y-3.5 rounded-xl border border-gray-200 p-4 transition-colors hover:border-gray-300 dark:border-gray-800 dark:hover:border-gray-700"
            >
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex min-w-0 items-center gap-3">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gray-100 text-xs font-semibold text-gray-500 dark:bg-gray-800 dark:text-gray-400">
                    {index + 1}
                  </span>
                  <div className="min-w-0">
                    <p className="break-all text-sm font-semibold text-gray-800 dark:text-white/90">
                      {issue.issueNumber}
                    </p>
                    <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
                      {issue.partName || issue.partNumber || "-"}
                    </p>
                  </div>
                </div>
                <div
                  role="group"
                  aria-label={`Status ${issue.issueNumber}`}
                  className="grid shrink-0 grid-cols-2 gap-2 sm:w-56"
                >
                  {([true, false] as const).map((status) => (
                    <button
                      key={String(status)}
                      type="button"
                      disabled={submitting}
                      aria-pressed={issue.status === status}
                      onClick={() =>
                        setIssues((current) =>
                          current.map((row) =>
                            row.issueNumber === issue.issueNumber ? { ...row, status } : row
                          )
                        )
                      }
                      className={`rounded-lg border px-4 py-2.5 text-sm font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-brand-500 disabled:opacity-50 ${
                        issue.status === status
                          ? status
                            ? "border-success-500 bg-success-50 text-success-700 dark:bg-success-500/15 dark:text-success-400"
                            : "border-error-500 bg-error-50 text-error-700 dark:bg-error-500/15 dark:text-error-400"
                          : "border-gray-300 text-gray-500 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-400 dark:hover:bg-gray-800"
                      }`}
                    >
                      {status ? "OK" : "NG (Rusak)"}
                    </button>
                  ))}
                </div>
              </div>

              <div className="border-t border-gray-100 pt-3 dark:border-gray-800/80">
                <div className="mb-1.5 flex items-center justify-between gap-2">
                  <label
                    htmlFor={`issue-note-${index}`}
                    className="text-xs font-medium text-gray-600 dark:text-gray-300"
                  >
                    Catatan / Note
                  </label>
                  <span className="rounded-md bg-gray-100 px-2 py-0.5 text-[11px] font-medium text-gray-500 dark:bg-gray-800 dark:text-gray-400">
                    Opsional
                  </span>
                </div>
                <input
                  id={`issue-note-${index}`}
                  type="text"
                  maxLength={500}
                  disabled={submitting}
                  value={issue.note}
                  onChange={(event) =>
                    setIssues((current) =>
                      current.map((row) =>
                        row.issueNumber === issue.issueNumber
                          ? { ...row, note: event.target.value }
                          : row
                      )
                    )
                  }
                  placeholder="Tambahkan catatan untuk issue ini (opsional)..."
                  className="h-10 w-full rounded-lg border border-gray-200 bg-gray-50/70 px-3.5 text-sm text-gray-800 outline-none transition-colors placeholder:text-gray-400 focus:border-brand-500 focus:bg-white focus:ring-3 focus:ring-brand-500/10 disabled:opacity-50 dark:border-gray-700 dark:bg-gray-800/40 dark:text-white/90 dark:placeholder:text-gray-500 dark:focus:bg-gray-900"
                />
              </div>
            </div>
          ))}
          <div className="flex flex-col gap-4 border-t border-gray-200 pt-5 dark:border-gray-800 sm:flex-row sm:items-center sm:justify-between">
            <p aria-live="polite" className="text-sm text-gray-500 dark:text-gray-400">{remaining ? `${remaining} issue belum dipilih statusnya.` : !ngCount ? "Hasil seluruhnya OK belum dapat disimpan oleh layanan saat ini." : "Seluruh issue sudah divalidasi. Siap disimpan."}</p>
            <div className="flex gap-3">
              <button type="button" disabled={submitting} onClick={resetScan} className="rounded-lg border border-gray-300 px-5 py-2.5 text-sm font-medium text-gray-600 disabled:opacity-50 dark:border-gray-700 dark:text-gray-300">Scan Ulang</button>
              <button type="button" disabled={submitting || loading || !!remaining || !ngCount || !canCreate} onClick={() => { void handleSubmit(); }} className="rounded-lg bg-brand-500 px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-600 disabled:opacity-50">{submitting ? "Menyimpan..." : "Submit Rework"}</button>
            </div>
          </div>
        </div>}
      </section>
    </div>
  );
}
