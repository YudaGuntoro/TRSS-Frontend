"use client";

import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import Link from "next/link";
import DataTable, { type DataTableColumn } from "@/components/common/DataTable";
import { useTraceabilityReport } from "@/hooks/useTraceabilityReport";
import TraceabilityReportService, {
  getTraceabilityDetailFilename,
  normalizeTraceabilityReportFilters,
  type TraceabilityReportRow,
  type TraceabilityReportSort,
} from "@/services/TraceabilityReportService";
import { formatShortDateTime } from "@/utils/formatDateTime";
import DatePicker from "@/components/form/date-picker";
import { ResetActionIcon } from "@/components/ui/icons/ActionIcons";
import { PdfFileIcon } from "./ExportFileIcons";

const inputClassName = "h-10 w-full rounded-lg border border-gray-300 bg-transparent px-3 py-2 text-sm text-gray-800 outline-none focus:border-brand-300 focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90";
const outlineButtonClassName = "inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-gray-300 px-4 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-white/5";
const unavailableMessage = "Traceability report data is not available yet. Please try again later.";

export default function TraceabilityReport() {
  const report = useTraceabilityReport();
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [datePickerKey, setDatePickerKey] = useState(0);
  const [validationError, setValidationError] = useState("");
  const [rowErrors, setRowErrors] = useState<Record<number, string>>({});
  const [exportingIds, setExportingIds] = useState<Set<number>>(() => new Set());
  const exportControllers = useRef<Map<number, AbortController>>(new Map());
  useEffect(() => () => {
    exportControllers.current.forEach((controller) => controller.abort());
    exportControllers.current.clear();
  }, []);
  const onStartDateChange = useCallback((_: Date[], value: string) => { setStartDate(value); setValidationError(""); }, []);
  const onEndDateChange = useCallback((_: Date[], value: string) => { setEndDate(value); setValidationError(""); }, []);

  const search = (event: FormEvent) => {
    event.preventDefault();
    try {
      const filters = normalizeTraceabilityReportFilters({ startDate, endDate });
      setValidationError("");
      setRowErrors({});
      report.search(filters);
    } catch (error) {
      setValidationError(error instanceof Error ? error.message : "Please check the dates.");
    }
  };

  const reset = () => {
    setStartDate("");
    setEndDate("");
    setDatePickerKey((current) => current + 1);
    setValidationError("");
    setRowErrors({});
    report.reset();
  };

  const exportPdf = async (row: TraceabilityReportRow) => {
    if (!row.serialNumberClinching || row.serialNumberClinching === "-" || exportControllers.current.has(row.id)) return;
    const controller = new AbortController();
    exportControllers.current.set(row.id, controller);
    setExportingIds((current) => new Set(current).add(row.id));
    setRowErrors((current) => ({ ...current, [row.id]: "" }));
    try {
      const file = await TraceabilityReportService.exportDetailPdf(row.serialNumberClinching, { signal: controller.signal });
      if (controller.signal.aborted) return;
      const url = URL.createObjectURL(file);
      const link = document.createElement("a");
      link.href = url;
      link.download = getTraceabilityDetailFilename(row.serialNumberClinching);
      document.body.appendChild(link);
      link.click();
      link.remove();
      globalThis.setTimeout(() => URL.revokeObjectURL(url), 60_000);
    } catch (error) {
      if (!controller.signal.aborted) setRowErrors((current) => ({
        ...current,
        [row.id]: error instanceof Error && "status" in error && error.status === 404
          ? "PDF for this serial is not available yet."
          : error instanceof Error ? error.message : "Failed to export detail PDF.",
      }));
    } finally {
      exportControllers.current.delete(row.id);
      if (!controller.signal.aborted) setExportingIds((current) => {
        const next = new Set(current);
        next.delete(row.id);
        return next;
      });
    }
  };

  const columns: DataTableColumn<TraceabilityReportRow>[] = [
    { key: "serialNumberClinching", header: "Serial Clinching", render: (_, row) => row.serialNumberClinching && row.serialNumberClinching !== "-"
      ? <Link href={`/traceability-log/${encodeURIComponent(row.serialNumberClinching)}`} className="font-mono font-medium text-brand-600 hover:underline dark:text-brand-400">{row.serialNumberClinching}</Link>
      : "-" },
    { key: "serialNumberMfan", header: "Serial M-Fan", render: (_, row) => <span className="font-mono">{row.serialNumberMfan || "-"}</span> },
    { key: "clinchingIssues", header: "Clinching Issues", render: (_, row) => row.clinchingIssues?.join(", ") || "-" },
    { key: "mfanIssues", header: "M-Fan Issues", render: (_, row) => row.mfanIssues?.join(", ") || "-" },
    { key: "status", header: "Status", render: (_, row) => <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${row.status === "OK"
      ? "bg-success-50 text-success-700 dark:bg-success-500/15 dark:text-success-400"
      : "bg-error-50 text-error-700 dark:bg-error-500/15 dark:text-error-400"}`}>{row.status}</span> },
    { key: "createdAt", header: "Scan Time", render: (_, row) => formatShortDateTime(row.createdAt) },
    { key: "action", header: "Action", align: "center", render: (_, row) => <div className="flex min-w-36 flex-col items-center">
      <button type="button" onClick={() => exportPdf(row)}
        aria-label={`Export PDF for ${row.serialNumberClinching || "missing Clinching serial"}`}
        disabled={!row.serialNumberClinching || row.serialNumberClinching === "-" || exportingIds.has(row.id)}
        className="inline-flex min-h-9 items-center gap-1.5 rounded-lg border border-[#C62828]/35 bg-[#C62828]/5 px-3 text-xs font-semibold text-[#B42318] hover:border-[#C62828]/60 hover:bg-[#C62828]/10 disabled:cursor-not-allowed disabled:opacity-50 dark:border-red-400/35 dark:bg-red-400/10 dark:text-red-300 dark:hover:bg-red-400/15">
        <PdfFileIcon />{exportingIds.has(row.id) ? "Exporting..." : "Export PDF"}
      </button>
      {rowErrors[row.id] && <p role="alert" className="mt-1 max-w-52 text-center text-xs text-error-500">{rowErrors[row.id]}</p>}
    </div> },
  ];

  const filters = report.query.filters;
  const period = filters.startDate
    ? filters.startDate === filters.endDate ? filters.startDate : `${filters.startDate} to ${filters.endDate}`
    : filters.endDate ? `Through ${filters.endDate}` : "All dates";

  return (
    <div>
      <section className="mx-4 mb-4 rounded-xl border border-gray-200 bg-white p-5 dark:border-white/5 dark:bg-white/[0.03]">
        <h3 className="text-base font-semibold text-gray-800 dark:text-white/90">Traceability Report</h3>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Finished goods with linked Clinching and M-Fan serial numbers.</p>
        <form onSubmit={search} className="mt-5" aria-label="Traceability report filters">
          <fieldset className="grid min-w-0 grid-cols-1 items-end gap-4 sm:grid-cols-[repeat(2,minmax(0,260px))] lg:grid-cols-[repeat(2,minmax(0,260px))_auto]">
            <DatePicker id="traceability-report-start-date" key={`traceability-report-start-date-${datePickerKey}`}
              label="Start Date" placeholder="Select start date" className="h-10 px-3 py-2 pr-10"
              defaultDate={startDate || undefined} onChange={onStartDateChange} />
            <DatePicker id="traceability-report-end-date" key={`traceability-report-end-date-${datePickerKey}`}
              label="End Date" placeholder="Select end date" className="h-10 px-3 py-2 pr-10"
              defaultDate={endDate || undefined} onChange={onEndDateChange} />
            <div className="flex flex-wrap gap-3 sm:col-span-2 lg:col-span-1">
              <button type="submit" className="h-10 rounded-lg bg-brand-500 px-5 text-sm font-medium text-white hover:bg-brand-600">Search</button>
              <button type="button" onClick={reset} className={outlineButtonClassName}><ResetActionIcon className="size-[18px] shrink-0" />Reset Filter</button>
            </div>
          </fieldset>
          <p id="traceability-report-date-help" className="mt-3 text-xs text-gray-500 dark:text-gray-400">Start Date only: records on that day. End Date only: all records through that day.</p>
          {validationError && <p role="alert" className="mt-3 text-sm text-error-500">{validationError}</p>}
        </form>
      </section>

      <div className="mx-4 mb-3 flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-gray-500 dark:text-gray-400"><span className="font-medium">Applied period:</span> {period}</p>
      </div>
      {(report.unavailable || report.error) && (
        <div role={report.error ? "alert" : "status"} className="mx-4 mb-4 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-gray-200 bg-white p-4 text-sm text-gray-700 dark:border-gray-700 dark:bg-white/[0.03] dark:text-gray-300">
          <span>{report.unavailable ? unavailableMessage : report.error}</span>
          <button type="button" onClick={report.retry} className={outlineButtonClassName}>Retry</button>
        </div>
      )}
      <div aria-busy={report.isLoading}>
        <DataTable columns={columns} data={report.data} rowKey="id" title="Finished Goods"
          isLoading={report.isLoading} error={report.error}
          emptyMessage={report.unavailable ? unavailableMessage : "No finished goods match the applied dates."}
          pagination={report.pagination} onPageChange={report.setPage} onLimitChange={report.setLimit}
          actions={<label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">Sort by scan time
            <select value={report.query.sort} disabled={report.isLoading}
              onChange={(event) => report.setSort(event.target.value as TraceabilityReportSort)} className={inputClassName}>
              <option value="newest">Newest first</option>
              <option value="oldest">Oldest first</option>
            </select>
          </label>}
          minWidth="1150px" />
      </div>
    </div>
  );
}
