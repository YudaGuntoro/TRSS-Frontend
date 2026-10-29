"use client";

import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import DataTable, { type DataTableColumn } from "@/components/common/DataTable";
import { useStockInReport } from "@/hooks/useStockInReport";
import StockInReportService, {
  isStockInReportUnavailable,
  normalizeStockInReportFilters,
  type StockInReportFormat,
  type StockInReportRow,
} from "@/services/StockInReportService";
import { formatShortDateTime } from "@/utils/formatDateTime";
import DatePicker from "@/components/form/date-picker";
import { ResetActionIcon } from "@/components/ui/icons/ActionIcons";
import ReportPartSelect, { type ReportPart } from "./ReportPartSelect";
import { ExcelFileIcon } from "./ExportFileIcons";

const outlineButtonClassName = "inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-gray-300 px-4 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-white/5";
const unavailableMessage = "Stock in reports are not available yet. Please try again later.";
const getStockInReportFilename = () => {
  const now = new Date();
  const date = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}`;
  return `stock_in_${date}.xlsx`;
};

const columns: DataTableColumn<StockInReportRow>[] = [
  { key: "issueNumber", header: "Issue Number", render: (_, row) => row.issueNumber || "-" },
  { key: "partNumber", header: "Part Number", className: "font-mono" },
  { key: "partName", header: "Part Name" },
  { key: "supplyQty", header: "Supply Qty", align: "right", className: "font-mono" },
  { key: "receiptQty", header: "Receipt Qty", align: "right", className: "font-mono" },
  { key: "balance", header: "Balance Qty", align: "right", className: "font-mono", render: (_, row) => row.balance ?? "-" },
  { key: "supplyDate", header: "Supply Date", render: (_, row) => formatShortDateTime(row.supplyDate) },
  { key: "receiptDate", header: "Receipt Date", render: (_, row) => formatShortDateTime(row.receiptDate) },
];

export default function StockInReport() {
  const report = useStockInReport();
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [datePickerKey, setDatePickerKey] = useState(0);
  const [part, setPart] = useState<ReportPart | null>(null);
  const [validationError, setValidationError] = useState("");
  const [exportError, setExportError] = useState("");
  const [exporting, setExporting] = useState<StockInReportFormat | null>(null);
  const exportController = useRef<AbortController | null>(null);
  useEffect(() => () => exportController.current?.abort(), []);
  const onStartDateChange = useCallback((_: Date[], value: string) => { setStartDate(value); setValidationError(""); }, []);
  const onEndDateChange = useCallback((_: Date[], value: string) => { setEndDate(value); setValidationError(""); }, []);

  const search = (event: FormEvent) => {
    event.preventDefault();
    try {
      const filters = normalizeStockInReportFilters({ startDate, endDate, partId: part?.id });
      setValidationError("");
      setExportError("");
      report.search(filters);
    } catch (error) {
      setValidationError(error instanceof Error ? error.message : "Please check the filters.");
    }
  };

  const reset = () => {
    setStartDate("");
    setEndDate("");
    setDatePickerKey((current) => current + 1);
    setPart(null);
    setValidationError("");
    setExportError("");
    report.reset();
  };

  const exportReport = async (format: StockInReportFormat) => {
    if (exportController.current || report.isLoading || report.error || report.unavailable) return;
    const controller = new AbortController();
    exportController.current = controller;
    setExporting(format);
    setExportError("");
    try {
      const file = await StockInReportService.exportReport(report.query.filters, format, { signal: controller.signal });
      if (controller.signal.aborted) return;
      const url = URL.createObjectURL(file);
      const link = document.createElement("a");
      link.href = url;
      link.download = getStockInReportFilename();
      document.body.appendChild(link);
      link.click();
      link.remove();
      globalThis.setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (error) {
      if (!controller.signal.aborted) setExportError(isStockInReportUnavailable(error)
        ? "Report export is not available yet. Please try again later."
        : error instanceof Error ? error.message : "Failed to export report.");
    } finally {
      exportController.current = null;
      if (!controller.signal.aborted) setExporting(null);
    }
  };

  const exportsDisabled = report.isLoading || Boolean(report.error) || report.unavailable || report.pagination.total === 0 || exporting !== null;

  return (
    <div>
      <section className="mx-4 mb-4 rounded-xl border border-gray-200 bg-white p-5 dark:border-white/5 dark:bg-white/[0.03]">
        <h3 className="text-base font-semibold text-gray-800 dark:text-white/90">Stock In Report</h3>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">View incoming stock by period and part.</p>
        <form onSubmit={search} className="mt-5" aria-label="Stock in report filters">
          <fieldset disabled={exporting !== null} className="grid min-w-0 grid-cols-1 items-end gap-4 sm:grid-cols-[repeat(2,minmax(0,240px))] xl:grid-cols-[repeat(3,minmax(0,240px))_auto]">
            <DatePicker id="report-start-date" key={`report-start-date-${datePickerKey}`}
              label="Start Date" placeholder="Select start date" className="h-10 px-3 py-2 pr-10"
              defaultDate={startDate || undefined} onChange={onStartDateChange} />
            <DatePicker id="report-end-date" key={`report-end-date-${datePickerKey}`}
              label="End Date" placeholder="Select end date" className="h-10 px-3 py-2 pr-10"
              defaultDate={endDate || undefined} onChange={onEndDateChange} />
            <ReportPartSelect value={part} onChange={setPart} />
            <div className="flex flex-wrap gap-3 sm:col-span-2 xl:col-span-1">
              <button type="submit" className="h-10 rounded-lg bg-brand-500 px-5 text-sm font-medium text-white hover:bg-brand-600 disabled:cursor-not-allowed disabled:opacity-50">Filter</button>
              <button type="button" disabled={exportsDisabled} onClick={() => exportReport("excel")}
                className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-[#217346] px-4 text-sm font-semibold text-white shadow-theme-xs transition-colors hover:bg-[#185C37] disabled:cursor-not-allowed disabled:opacity-50">
                <ExcelFileIcon />{exporting === "excel" ? "Exporting..." : "Export Excel"}
              </button>
              <button type="button" onClick={reset} className={outlineButtonClassName}><ResetActionIcon className="size-[18px] shrink-0" />Reset Filter</button>
            </div>
          </fieldset>
          <p id="report-date-help" className="mt-3 text-xs text-gray-500 dark:text-gray-400">Start Date only: records on that day. End Date only: all records through that day.</p>
          {validationError && <p role="alert" className="mt-3 text-sm text-error-500">{validationError}</p>}
        </form>
      </section>

      {exportError && <p role="alert" className="mx-4 mb-3 text-sm text-error-500">{exportError}</p>}
      {(report.unavailable || report.error) && (
        <div role={report.error ? "alert" : "status"} className="mx-4 mb-4 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-gray-200 bg-white p-4 text-sm text-gray-700 dark:border-gray-700 dark:bg-white/[0.03] dark:text-gray-300">
          <span>{report.unavailable ? unavailableMessage : report.error}</span>
          <button type="button" disabled={exporting !== null} onClick={report.retry} className={outlineButtonClassName}>Retry</button>
        </div>
      )}
      <div aria-busy={report.isLoading}>
        <DataTable columns={columns} data={report.data} rowKey="id" title="Incoming Stock"
          isLoading={report.isLoading} error={report.error}
          emptyMessage={report.unavailable ? unavailableMessage : "No stock in records match the applied filters."}
          pagination={report.pagination} onPageChange={report.setPage} onLimitChange={report.setLimit}
          minWidth="1100px" />
      </div>
    </div>
  );
}
