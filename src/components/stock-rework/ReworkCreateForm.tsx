"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/context/ToastContext";
import { PERMISSIONS } from "@/utils/auth";
import { parseReworkQr } from "@/utils/reworkQr";
import TraceabilityLogService from "@/services/TraceabilityLogService";
import StockInReworkService from "@/services/StockInReworkService";

type IssueRow = {
  issueNumber: string;
  partName?: string | null;
  partNumber?: string | null;
  status: boolean | null;
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
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [savedSerial, setSavedSerial] = useState("");
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
    setError(null);
    setSavedSerial("");
    setLoading(false);
    try {
      const code = parseReworkQr(value);
      setLoading(true);
      const result = await TraceabilityLogService.getTraceabilityLogIssuesBySerialNumber(
        code, false, { signal: controller.signal },
      );
      if (controller.signal.aborted) return;
      if (!result.data?.issues.length) {
        throw new Error("Issue number tidak ditemukan. Pastikan serial number sudah selesai proses dan berstatus NG.");
      }
      setSerialNumber(result.data.serialNumber);
      setIssues(result.data.issues.map((issue) => ({ ...issue, status: null })));
    } catch (scanError) {
      if (!controller.signal.aborted) {
        setError(scanError instanceof Error ? scanError.message : "Gagal mengambil issue number.");
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
    setError(null);
    setSavedSerial("");
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
    setError(null);
    try {
      await StockInReworkService.createStockInRework({
        serialNumberCode: serialNumber,
        issueNumbers: issues.map((issue) => ({
          issueNumber: issue.issueNumber,
          status: issue.status === true,
        })),
      });
      const saved = serialNumber;
      resetScan();
      setSavedSerial(saved);
      toast.success({ title: "Rework tersimpan", message: "Seluruh status issue number berhasil disimpan." });
    } catch (submitError) {
      const message = submitError instanceof Error ? submitError.message : "Gagal menyimpan rework.";
      setError(message);
      toast.error({ title: "Submit gagal", message });
    } finally {
      submittingRef.current = false;
      setSubmitting(false);
      inputRef.current?.focus();
    }
  };

  return (
    <div className="space-y-5">
      <section className="overflow-hidden rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
        <div className="border-b border-brand-100 bg-brand-50 px-5 py-6 dark:border-brand-500/20 dark:bg-brand-500/10 sm:px-6">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-brand-600 dark:text-brand-400">01 / Scan label produksi</p>
          <h2 className="text-2xl font-semibold text-gray-800 dark:text-white/90">Silahkan scan</h2>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">Scan QR menggunakan scanner untuk menampilkan daftar issue number. Pastikan proses produksi sudah selesai dengan hasil NG.</p>
        </div>
        <div className="space-y-3 p-5 sm:p-6">
          <label htmlFor="rework-qr" className="block text-sm font-medium text-gray-700 dark:text-gray-300">QR label produksi</label>
          <div className="flex flex-col gap-3 sm:flex-row">
            <input ref={inputRef} id="rework-qr" autoFocus autoComplete="off" spellCheck={false}
              value={qr} onChange={(event) => handleScanChange(event.target.value)}
              onKeyDown={(event) => {
                if ((event.key === "Enter" || event.key === "Tab") && event.currentTarget.value.trim() && !event.nativeEvent.isComposing) {
                  event.preventDefault();
                  void loadIssues(event.currentTarget.value);
                }
              }}
              disabled={submitting || !canCreate} aria-describedby="rework-qr-help" aria-invalid={!!error}
              placeholder="Siap scan QR — daftar issue akan tampil otomatis"
              className="h-12 min-w-0 flex-none rounded-xl border border-gray-300 bg-transparent px-4 text-sm text-gray-800 outline-none focus:border-brand-500 focus:ring-3 focus:ring-brand-500/10 disabled:opacity-50 dark:border-gray-700 dark:text-white/90 sm:flex-1" />
          </div>
          <p id="rework-qr-help" className="text-xs font-medium text-error-600 dark:text-error-400">Contoh: PARAMETER1;PARAMETER2;SERIAL-NUMBER;PARAMETER4. Serial number diambil dari parameter ke-3. Pemisah yang didukung: titik koma (;), koma (,), pipe (|), atau spasi.</p>
          {!canCreate && <p role="alert" className="text-sm text-error-600">Anda tidak memiliki akses untuk menambah rework.</p>}
        </div>
      </section>

      {error && <div role="alert" className="rounded-xl border border-error-200 bg-error-50 p-4 text-sm text-error-700 dark:border-error-500/30 dark:bg-error-500/10 dark:text-error-400">{error}</div>}
      {savedSerial && <div role="status" className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-success-200 bg-success-50 p-4 text-sm text-success-700 dark:border-success-500/30 dark:bg-success-500/10 dark:text-success-400">
        <span>Rework untuk <strong>{savedSerial}</strong> berhasil disimpan. Siap scan berikutnya.</span>
        <Link href="/rework/history" className="font-semibold underline">Lihat History</Link>
      </div>}

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
          {issues.map((issue, index) => <div key={issue.issueNumber} className="flex flex-col gap-4 rounded-xl border border-gray-200 p-4 dark:border-gray-800 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex min-w-0 items-center gap-3">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gray-100 text-xs font-semibold text-gray-500 dark:bg-gray-800">{index + 1}</span>
              <div className="min-w-0">
                <p className="break-all text-sm font-semibold text-gray-800 dark:text-white/90">{issue.issueNumber}</p>
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">{issue.partName || issue.partNumber || "-"}</p>
              </div>
            </div>
            <div role="group" aria-label={`Status ${issue.issueNumber}`} className="grid shrink-0 grid-cols-2 gap-2 sm:w-56">
              {([true, false] as const).map((status) => <button key={String(status)} type="button" disabled={submitting} aria-pressed={issue.status === status}
                onClick={() => setIssues((current) => current.map((row) => row.issueNumber === issue.issueNumber ? { ...row, status } : row))}
                className={`rounded-lg border px-4 py-2.5 text-sm font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-brand-500 disabled:opacity-50 ${issue.status === status
                  ? status ? "border-success-500 bg-success-50 text-success-700 dark:bg-success-500/15 dark:text-success-400" : "border-error-500 bg-error-50 text-error-700 dark:bg-error-500/15 dark:text-error-400"
                  : "border-gray-300 text-gray-500 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-400 dark:hover:bg-gray-800"}`}>
                {status ? "OK" : "NG (Rusak)"}
              </button>)}
            </div>
          </div>)}
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
