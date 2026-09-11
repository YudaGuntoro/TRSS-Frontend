"use client";

import { Modal } from "@/components/ui/modal";
import DatePicker from "@/components/form/date-picker";
import { useToast } from "@/context/ToastContext";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { useProcessLogs } from "@/hooks/useProcessLogs";
import { CloseIcon, EyeIcon, RefreshIcon } from "@/icons";
import { ProcessLogDetail, ProcessLogListItem } from "@/services/ProcessLogService";
import { useEffect, useRef, useState } from "react";

type StatusFilter = "" | "ok" | "ng";
type FinishFilter = "" | "processing" | "finish";
type MeasurementKind = "clinching" | "endPlate";
type MeasurementModalState = {
  kind: MeasurementKind;
  serialNumberCode: string;
  timestamp: string;
  summary: string;
  values: unknown[];
};

const dateFormatter = new Intl.DateTimeFormat("en-GB", {
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  month: "short",
  year: "numeric",
});

const formatDate = (value: string) => {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "-" : dateFormatter.format(date);
};

const toDateFilterValue = (date: Date) => date.toISOString().split("T")[0];

const getPageNumbers = (currentPage: number, totalPage: number) => {
  const pageNumbers: number[] = [];
  const start = Math.max(1, currentPage - 1);
  const end = Math.min(totalPage, currentPage + 1);

  for (let page = start; page <= end; page += 1) {
    pageNumbers.push(page);
  }

  return pageNumbers;
};

const formatType = (value: string) =>
  value
    .replace(/[_-]/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());

const getDetailValue = (detail: ProcessLogDetail, key: string) =>
  detail[key] ?? detail[key.charAt(0).toUpperCase() + key.slice(1)];

const getBooleanValue = (value: unknown) => {
  if (typeof value === "boolean") {
    return value;
  }

  if (typeof value !== "string") {
    return null;
  }

  const normalizedValue = value.trim().toLowerCase();
  if (["true", "ok", "passed", "on"].includes(normalizedValue)) {
    return true;
  }

  if (["false", "ng", "rejected", "off"].includes(normalizedValue)) {
    return false;
  }

  return null;
};

const stripUnit = (value: unknown) =>
  String(value ?? "-")
    .replace(/\s*(?:mm|rpm|a)\b/gi, "")
    .trim();

const formatDecimalValue = (value: unknown) => {
  if (typeof value === "number") {
    return new Intl.NumberFormat("en-US", {
      maximumFractionDigits: 2,
    }).format(value);
  }

  const strippedValue = stripUnit(value);
  if (!/^-?\d+[,.]\d+$/.test(strippedValue)) {
    return strippedValue;
  }

  return new Intl.NumberFormat("en-US", {
    maximumFractionDigits: 2,
  }).format(Number(strippedValue.replace(",", ".")));
};

const formatValue = (value: unknown) => {
  if (value === null || value === undefined || value === "") {
    return "-";
  }

  const booleanValue = getBooleanValue(value);
  if (typeof booleanValue === "boolean") {
    return booleanValue ? "OK" : "NG";
  }

  if (Array.isArray(value)) {
    const passed = value.filter(Boolean).length;
    return `${passed}/${value.length} OK`;
  }

  if (typeof value === "number") {
    return formatDecimalValue(value);
  }

  return formatDecimalValue(value);
};

const detailFields = {
  clinching: [
    ["Name Label Clinching", "serialNumberClinching"],
    ["Core ASM Result", "coreAsmValue"],
    ["Upper Tank ASM Result", "upperTankAsmValue"],
    ["Lower Tank ASM Result", "lowerTankAsmValue"],
    ["O-Ring Set Result", "oRingSetResult"],
    ["NG Box Sensor Short Side", "ngBoxSensorShortSideValue"],
    ["Clinching Height Result", "clinchingHeightAverage"],
    ["End Plate Width Result", "endPlateWidthResults"],
    ["NG Box Sensor Long Side", "ngBoxSensorLongSideValue"],
    ["Cap Type Position Result", "capTypePositionResult"],
    ["Leak Result", "leakResult"],
    ["Leak Last Leakage Value", "leakLastLeakageValue"],
  ],
  mfan: [
    ["Name Label M-Fan", "serialNumberMFan"],
    ["Lot Fan ASM Result", "lotFanAsmResult"],
    ["Lot Motor ASM Result", "lotMotorAsmResult"],
    ["Lot Guide ASM Result", "lotGuideAsmResult"],
    ["Bolt Tighten Result", "boltTightenValue"],
    ["Bolt Tighten Qty", "boltTightenQtyValue"],
    ["Nut Tighten Result", "nutTightenValue"],
    ["M-Fan Inspection Rotation Speed Max Value", "mFanInspectionRotationSpeedMaxValue"],
    ["M-Fan Inspection Rotation Speed Min Value", "mFanInspectionRotationSpeedMinValue"],
    ["M-Fan Inspection Ampere Max Value", "mFanInspectionAmpereMaxValue"],
    ["M-Fan Inspection Ampere Min Value", "mFanInspectionAmpereMinValue"],
    ["M-Fan Inspection Wind Direction Value", "mFanInspectionWindDirectionValue"],
    ["M-Fan Test Result", "mFanTestResult"],
    ["NG Box Sensor M-Fan Inspection", "ngBoxSensorMFanInspectionValue"],
  ],
};

const getProcessTypeKey = (type?: string) =>
  type?.replace(/[-_\s]/g, "").toLowerCase() === "mfan" ? "mfan" : "clinching";

export default function ProcessLogTable() {
  const toast = useToast();
  const lastErrorRef = useRef<string | null>(null);
  const [search, setSearch] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [datePickerKey, setDatePickerKey] = useState(0);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("");
  const [finishFilter, setFinishFilter] = useState<FinishFilter>("");
  const [selectedLog, setSelectedLog] = useState<ProcessLogListItem | null>(null);
  const [measurement, setMeasurement] = useState<MeasurementModalState | null>(null);
  const debouncedSearch = useDebouncedValue(search.trim(), 500);

  const {
    data,
    error,
    isLoading,
    pagination,
    query,
    refetch,
    setLimit,
    setPage,
    setQuery,
  } = useProcessLogs({ limit: 10, page: 1 });
  const currentPage = pagination?.page ?? query.page;
  const currentLimit = pagination?.limit ?? query.limit;
  const totalPage = pagination?.totalPage ?? 1;
  const total = pagination?.total ?? data.length;
  const firstItem = data.length > 0 ? (currentPage - 1) * currentLimit + 1 : 0;
  const lastItem = data.length > 0 ? firstItem + data.length - 1 : 0;
  const pageNumbers = getPageNumbers(currentPage, totalPage);
  const resetFilters = () => {
    setSearch("");
    setStatusFilter("");
    setFinishFilter("");
    setStartDate("");
    setEndDate("");
    setDatePickerKey((current) => current + 1);
    setQuery({
      endDate: "",
      isFinished: null,
      serialNumberCode: "",
      startDate: "",
      status: null,
    });
  };

  useEffect(() => {
    if (debouncedSearch !== query.serialNumberCode) {
      setQuery({ serialNumberCode: debouncedSearch });
    }
  }, [debouncedSearch, query.serialNumberCode, setQuery]);

  useEffect(() => {
    const status =
      statusFilter === "" ? null : statusFilter === "ok";
    const isFinished =
      finishFilter === "" ? null : finishFilter === "finish";

    if (query.status === status && query.isFinished === isFinished) {
      return;
    }

    setQuery({ isFinished, status });
  }, [finishFilter, query.isFinished, query.status, setQuery, statusFilter]);

  useEffect(() => {
    if (
      startDate === (query.startDate ?? "") &&
      endDate === (query.endDate ?? "")
    ) {
      return;
    }

    setQuery({ endDate, startDate });
  }, [endDate, query.endDate, query.startDate, setQuery, startDate]);

  useEffect(() => {
    if (!error || lastErrorRef.current === error) {
      return;
    }

    lastErrorRef.current = error;
    toast.error({ title: "Failed to load process logs", message: error });
  }, [error, toast]);

  return (
    <>
      <div className="mx-4 my-4 overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-white/[0.05] dark:bg-white/[0.03]">
        <div className="border-b border-gray-100 px-5 py-4 dark:border-white/[0.05]">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex flex-wrap items-center gap-3">
              <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                Show
                <select
                  className="h-10 rounded-lg border border-gray-300 bg-transparent px-3 py-2 text-sm text-gray-800 outline-none focus:border-brand-300 focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
                  onChange={(event) => setLimit(Number(event.target.value))}
                  value={query.limit}
                >
                  {[10, 25, 50].map((limit) => (
                    <option key={limit} value={limit}>
                      {limit}
                    </option>
                  ))}
                </select>
                entries
              </label>
              <select
                className="h-10 rounded-lg border border-gray-300 bg-transparent px-3 py-2 text-sm font-medium text-gray-800 outline-none focus:border-brand-300 focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
                onChange={(event) => setStatusFilter(event.target.value as StatusFilter)}
                value={statusFilter}
              >
                <option value="">All Status</option>
                <option value="ok">OK</option>
                <option value="ng">NG</option>
              </select>
              <select
                className="h-10 rounded-lg border border-gray-300 bg-transparent px-3 py-2 text-sm font-medium text-gray-800 outline-none focus:border-brand-300 focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
                onChange={(event) => setFinishFilter(event.target.value as FinishFilter)}
                value={finishFilter}
              >
                <option value="">All Progress</option>
                <option value="processing">In Progress</option>
                <option value="finish">Finished</option>
              </select>
              <div className="w-[230px]">
                <DatePicker
                  className="h-10 px-3 py-2"
                  defaultDate={startDate && endDate ? [startDate, endDate] : startDate}
                  id="process-log-date-filter"
                  key={`process-log-date-filter-${datePickerKey}`}
                  mode="range"
                  onChange={(dates) => {
                    if (dates.length > 1) {
                      setStartDate(toDateFilterValue(dates[0]));
                      setEndDate(toDateFilterValue(dates[1]));
                    }
                  }}
                  onClose={(dates) => {
                    if (dates.length === 0) {
                      setStartDate("");
                      setEndDate("");
                      return;
                    }

                    setStartDate(toDateFilterValue(dates[0]));
                    setEndDate(
                      dates.length > 1 ? toDateFilterValue(dates[1]) : ""
                    );
                  }}
                  placeholder="Select date or range"
                />
              </div>
              <button
                aria-label="Refresh process logs"
                className="grid size-10 shrink-0 place-items-center rounded-lg border border-gray-300 bg-white text-gray-600 transition-colors hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300 dark:hover:bg-gray-800"
                onClick={refetch}
                title="Refresh"
                type="button"
              >
                <span className="grid size-5 place-items-center overflow-visible leading-none">
                  <RefreshIcon className="block size-[18px] overflow-visible fill-current" />
                </span>
              </button>
              <button
                aria-label="Reset process log filters"
                className="grid size-10 shrink-0 place-items-center rounded-lg border border-gray-300 bg-white text-gray-600 transition-colors hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300 dark:hover:bg-gray-800"
                onClick={resetFilters}
                title="Reset filters"
                type="button"
              >
                <span className="grid size-5 place-items-center overflow-visible leading-none">
                  <CloseIcon className="block size-[18px] overflow-visible fill-current" />
                </span>
              </button>
            </div>

            <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
              Search
              <input
                className="h-10 w-full rounded-lg border border-gray-300 bg-transparent px-3 py-2 text-sm text-gray-800 outline-none placeholder:text-gray-400 focus:border-brand-300 focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 sm:w-64"
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search serial number"
                value={search}
              />
            </label>
          </div>
        </div>

        <div className="mx-4 mb-4 mt-2 overflow-hidden rounded-lg border border-gray-100 dark:border-white/[0.05]">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[820px] text-left text-xs">
            <thead className="bg-[#6D8AF3] text-[11px] font-semibold uppercase text-white">
              <tr>
                <th className="w-16 px-4 py-3 text-center">No</th>
                <th className="px-4 py-3">Serial Number</th>
                <th className="px-4 py-3">Type</th>
                <th className="px-4 py-3 text-center">Progress</th>
                <th className="px-4 py-3 text-center">Status</th>
                <th className="w-28 px-4 py-3 text-center">Detail</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
              {data.map((log, index) => (
                <tr
                  className="transition-colors hover:bg-gray-50/80 dark:hover:bg-white/[0.03]"
                  key={log.id}
                >
                  <td className="px-4 py-3 text-center font-mono text-gray-600 dark:text-gray-300">
                    {(query.page - 1) * query.limit + index + 1}
                  </td>
                  <td className="px-4 py-3 font-mono font-semibold text-brand-600 dark:text-brand-300">
                    {log.serialNumberCode}
                  </td>
                  <td className="px-4 py-3">
                    <span className="inline-flex rounded-md border border-gray-200 bg-gray-50 px-2.5 py-1 text-xs font-semibold text-gray-700 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300">
                      {formatType(log.type)}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <ProgressPill finished={log.isFinished} />
                  </td>
                  <td className="px-4 py-3 text-center">
                    <StatusPill passed={log.status} />
                  </td>
                  <td className="px-4 py-3 text-center">
                    <button
                      className="process-log-details-button inline-flex h-8 items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-3 text-xs font-semibold text-brand-600 transition-colors hover:bg-brand-50 dark:border-gray-700 dark:bg-gray-900 dark:text-brand-300 dark:hover:bg-brand-500/10"
                      onClick={() => setSelectedLog(log)}
                      type="button"
                    >
                      <span className="inline-flex size-4 shrink-0 items-center justify-center overflow-visible">
                        <EyeIcon className="size-4 fill-current" />
                      </span>
                      Detail
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {data.length === 0 && (
          <div className="py-12 text-center text-sm text-gray-500 dark:text-gray-400">
            {isLoading ? "Loading process logs..." : error ?? "No process logs found."}
          </div>
        )}
        </div>

        <footer className="flex flex-col gap-3 border-t border-gray-100 px-5 py-4 text-sm text-gray-500 dark:border-white/[0.05] dark:text-gray-400 sm:flex-row sm:items-center sm:justify-between">
        <span>
          Showing {firstItem} to {lastItem} of {total} entries
        </span>
        <div className="flex flex-wrap items-center gap-2">
          <button
            className="rounded-lg border border-gray-300 px-3 py-2 font-medium text-gray-700 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-700 dark:text-gray-300"
            disabled={currentPage <= 1 || isLoading}
            onClick={() => setPage(currentPage - 1)}
            type="button"
          >
            Prev
          </button>
          {pageNumbers.map((page) => (
            <button
              className={`h-10 min-w-10 rounded-lg border px-3 text-sm font-medium ${
                page === currentPage
                  ? "border-brand-500 bg-brand-500 text-white"
                  : "border-gray-300 text-gray-700 dark:border-gray-700 dark:text-gray-300"
              }`}
              disabled={isLoading}
              key={page}
              onClick={() => setPage(page)}
              type="button"
            >
              {page}
            </button>
          ))}
          <button
            className="rounded-lg border border-gray-300 px-3 py-2 font-medium text-gray-700 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-700 dark:text-gray-300"
            disabled={currentPage >= totalPage || isLoading}
            onClick={() => setPage(currentPage + 1)}
            type="button"
          >
            Next
          </button>
          <button
            className="rounded-lg border border-gray-300 px-3 py-2 font-medium text-gray-700 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-700 dark:text-gray-300"
            disabled={currentPage >= totalPage || isLoading}
            onClick={() => setPage(totalPage)}
            type="button"
          >
            Last Page
          </button>
        </div>
        </footer>
      </div>

      <ProcessLogDetailModal
        log={selectedLog}
        onClose={() => setSelectedLog(null)}
        onOpenMeasurement={setMeasurement}
      />
      <MeasurementModal detail={measurement} onClose={() => setMeasurement(null)} />
    </>
  );
}

function StatusPill({ passed }: { passed: boolean }) {
  return (
    <span
      className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${
        passed
          ? "border-success-200 bg-success-50 text-success-700 dark:border-success-500/30 dark:bg-success-500/15 dark:text-success-400"
          : "border-error-200 bg-error-50 text-error-700 dark:border-error-500/30 dark:bg-error-500/15 dark:text-error-400"
      }`}
    >
      {passed ? "OK" : "NG"}
    </span>
  );
}

function ProgressPill({ finished }: { finished: boolean }) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${
        finished
          ? "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/15 dark:text-emerald-400"
          : "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-500/30 dark:bg-amber-500/15 dark:text-amber-400"
      }`}
    >
      <span
        className={`size-1.5 rounded-full ${
          finished ? "bg-emerald-500" : "bg-amber-500"
        }`}
      />
      {finished ? "Finished" : "In Progress"}
    </span>
  );
}

function ProcessLogDetailModal({
  log,
  onClose,
  onOpenMeasurement,
}: {
  log: ProcessLogListItem | null;
  onClose: () => void;
  onOpenMeasurement: (measurement: MeasurementModalState) => void;
}) {
  const type = getProcessTypeKey(log?.type);
  const fields = detailFields[type];

  return (
    <Modal className="mx-4 max-w-4xl overflow-hidden p-0" isOpen={Boolean(log)} onClose={onClose}>
      <div className="border-b border-gray-200 bg-white px-6 py-5 dark:border-gray-800 dark:bg-gray-950">
        <div className="pr-10">
          <div className="flex flex-wrap items-center gap-3">
            <h2 className="text-lg font-semibold text-gray-800 dark:text-white/90">
              Process Log Detail
            </h2>
            <span className="rounded-full border border-gray-200 bg-gray-50 px-2.5 py-1 text-xs font-semibold text-gray-700 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300">
              {log ? formatType(log.type) : "-"}
            </span>
            {log && <StatusPill passed={log.status} />}
          </div>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Serial: {log?.serialNumberCode ?? "-"} | Timestamp:{" "}
            {log ? formatDate(log.createdAt) : "-"}
          </p>
        </div>
      </div>

      <div className="max-h-[70vh] overflow-y-auto bg-gray-50 p-6 dark:bg-gray-950">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {fields.map(([label, key]) => {
            const value = getDetailValue(log?.detail ?? {}, key);
            const accentClass = getDetailCardClass(label, value);
            const isClinchingMeasurement =
              type === "clinching" &&
              (key === "clinchingHeightAverage" || key === "endPlateWidthResults");
            const measurementValues =
              key === "clinchingHeightAverage"
                ? getDetailValue(log?.detail ?? {}, "clinchingHeightValues")
                : value;
            const values = Array.isArray(measurementValues)
              ? measurementValues
              : value !== undefined && value !== null
                ? [value]
                : [];

            const cardContent = (
              <>
                <p className="text-xs font-semibold uppercase text-gray-500 dark:text-gray-400">
                  {label}
                </p>
                <p className={`mt-2 text-base font-semibold ${getValueClassName(value)}`}>
                  {formatValue(value)}
                </p>
                {isClinchingMeasurement && (
                  <span className="mt-3 inline-flex items-center gap-1.5 text-xs font-semibold text-brand-600 dark:text-brand-300">
                    Lihat titik
                    <MeasurementEyeIcon />
                  </span>
                )}
              </>
            );

            return isClinchingMeasurement ? (
              <button
                className={`cursor-pointer rounded-lg border border-gray-200 bg-white p-4 text-left shadow-theme-xs transition-colors hover:bg-brand-50 focus:outline-none focus:ring-2 focus:ring-brand-500/30 dark:border-gray-800 dark:bg-white/[0.03] dark:hover:bg-brand-500/10 ${accentClass}`}
                key={key}
                onClick={() =>
                  onOpenMeasurement({
                    kind:
                      key === "clinchingHeightAverage"
                        ? "clinching"
                        : "endPlate",
                    serialNumberCode: log?.serialNumberCode ?? "-",
                    summary: formatValue(value),
                    timestamp: log?.createdAt ?? "",
                    values,
                  })
                }
                type="button"
              >
                {cardContent}
              </button>
            ) : (
              <div
                className={`rounded-lg border border-gray-200 bg-white p-4 shadow-theme-xs dark:border-gray-800 dark:bg-white/[0.03] ${accentClass}`}
                key={key}
              >
                {cardContent}
              </div>
            );
          })}
        </div>
      </div>

      <div className="flex justify-end border-t border-gray-200 bg-white px-6 py-4 dark:border-gray-800 dark:bg-gray-950">
        <button
          className="rounded-lg bg-brand-500 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-brand-600"
          onClick={onClose}
          type="button"
        >
          Tutup
        </button>
      </div>
    </Modal>
  );
}

function MeasurementEyeIcon() {
  return (
    <svg
      aria-hidden="true"
      className="size-3.5"
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="2"
      viewBox="0 0 24 24"
    >
      <path d="M2.5 12s3.5-6 9.5-6 9.5 6 9.5 6-3.5 6-9.5 6-9.5-6-9.5-6Z" />
      <circle cx="12" cy="12" r="2.5" />
    </svg>
  );
}

function MeasurementModal({
  detail,
  onClose,
}: {
  detail: MeasurementModalState | null;
  onClose: () => void;
}) {
  const isClinching = detail?.kind === "clinching";
  const values = detail?.values ?? [];
  const passedCount = values.filter((value) => getBooleanValue(value) === true).length;
  const rejectedCount = values.filter((value) => getBooleanValue(value) === false).length;

  return (
    <Modal className="mx-4 max-w-5xl overflow-hidden p-0" isOpen={Boolean(detail)} onClose={onClose}>
      <div className="border-b border-gray-200 bg-white px-6 py-5 dark:border-gray-800 dark:bg-gray-950">
        <div className="pr-10">
          <div className="flex items-center gap-2">
            <span className={`size-2 rounded-full ${isClinching ? "bg-sky-500" : "bg-emerald-500"}`} />
            <h2 className="text-lg font-semibold text-gray-800 dark:text-white/90">
              {isClinching
                ? "Detail Pengukuran Clinching Height (Point 1 - 18)"
                : "Detail Pengukuran End Plate Width (Point 1 - 60)"}
            </h2>
          </div>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Serial: {detail?.serialNumberCode ?? "-"} | Timestamp:{" "}
            {detail ? formatDate(detail.timestamp) : "-"}
          </p>
        </div>
      </div>

      <div className="max-h-[70vh] overflow-y-auto bg-gray-50 p-6 pb-8 dark:bg-gray-950">
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <SummaryBox
            label={isClinching ? "Average Value" : "Total Titik Sensor"}
            tone={isClinching ? "sky" : "brand"}
            value={isClinching ? detail?.summary ?? "-" : `${values.length} Points`}
          />
          {isClinching ? (
            <>
              <SummaryBox label="Nilai Terendah (Min)" tone="cyan" value={getMinMax(values, "min")} />
              <SummaryBox label="Nilai Tertinggi (Max)" tone="indigo" value={getMinMax(values, "max")} />
              <SummaryBox label="Total Points" tone="emerald" value={`${values.length} Points`} />
            </>
          ) : (
            <>
              <SummaryBox label="Passed (OK)" tone="emerald" value={`${passedCount} Points`} />
              <SummaryBox label="Rejected (NG)" tone="rose" value={`${rejectedCount} Points`} />
              <SummaryBox
                label="Status Akhir Unit"
                tone={rejectedCount > 0 ? "rose" : "emerald"}
                value={rejectedCount > 0 ? "NG" : "OK"}
              />
            </>
          )}
        </div>

        <div
          className={`mt-6 grid gap-3 ${
            isClinching
              ? "grid-cols-2 sm:grid-cols-4 lg:grid-cols-6"
              : "grid-cols-[repeat(auto-fill,minmax(92px,1fr))]"
          }`}
        >
          {values.map((value, index) => {
            const booleanValue = getBooleanValue(value);
            const passed = booleanValue !== false;

            return (
              <div
                className={`min-h-20 rounded-lg border px-3 py-3 ${
                  !isClinching && !passed
                    ? "border-error-300 bg-white dark:border-error-500/35 dark:bg-gray-900"
                    : isClinching
                      ? "border-sky-200 bg-white dark:border-sky-500/30 dark:bg-gray-900"
                      : "border-emerald-200 bg-white dark:border-emerald-500/30 dark:bg-gray-900"
                }`}
                key={`${detail?.kind ?? "measurement"}-${index}`}
              >
                <p className="font-mono text-[11px] font-semibold text-gray-500 dark:text-gray-400">
                  Point {String(index + 1).padStart(2, "0")}
                </p>
                <p
                  className={`mt-3 text-center font-mono text-base font-bold leading-none ${
                    isClinching
                      ? "text-gray-900 dark:text-white"
                      : passed
                        ? "text-success-700 dark:text-success-300"
                        : "text-error-700 dark:text-error-300"
                  }`}
                >
                  {formatValue(value)}
                </p>
              </div>
            );
          })}
          {values.length === 0 && (
            <div className="col-span-full rounded-lg border border-dashed border-gray-200 px-5 py-8 text-center text-sm text-gray-500 dark:border-white/[0.12] dark:text-gray-400">
              No measurement values recorded.
            </div>
          )}
        </div>
      </div>

      <div className="flex justify-end border-t border-gray-200 bg-white px-6 py-4 dark:border-gray-800 dark:bg-gray-950">
        <button
          className="h-9 rounded-lg bg-brand-500 px-4 text-sm font-semibold text-white hover:bg-brand-600"
          onClick={onClose}
          type="button"
        >
          Tutup
        </button>
      </div>
    </Modal>
  );
}

function SummaryBox({
  label,
  tone = "brand",
  value,
}: {
  label: string;
  tone?: "brand" | "cyan" | "emerald" | "indigo" | "rose" | "sky";
  value: string;
}) {
  const toneClass = {
    brand: "border-brand-200 bg-white text-brand-700 dark:border-brand-500/30 dark:bg-gray-900 dark:text-brand-300",
    cyan: "border-cyan-200 bg-white text-cyan-700 dark:border-cyan-500/30 dark:bg-gray-900 dark:text-cyan-300",
    emerald: "border-success-200 bg-white text-success-700 dark:border-success-500/30 dark:bg-gray-900 dark:text-success-300",
    indigo: "border-indigo-200 bg-white text-indigo-700 dark:border-indigo-500/30 dark:bg-gray-900 dark:text-indigo-300",
    rose: "border-error-200 bg-white text-error-700 dark:border-error-500/30 dark:bg-gray-900 dark:text-error-300",
    sky: "border-sky-200 bg-white text-sky-700 dark:border-sky-500/30 dark:bg-gray-900 dark:text-sky-300",
  }[tone];

  return (
    <div className={`rounded-lg border p-4 ${toneClass}`}>
      <p className="text-xs font-medium opacity-80">{label}</p>
      <p className="mt-2 font-mono text-lg font-bold">{value}</p>
    </div>
  );
}

function getMinMax(values: unknown[], mode: "min" | "max") {
  const numbers = values
    .map((value) => Number(stripUnit(value).replace(",", ".")))
    .filter(Number.isFinite);

  if (numbers.length === 0) {
    return "-";
  }

  return String(mode === "min" ? Math.min(...numbers) : Math.max(...numbers));
}

function getValueClassName(value: unknown) {
  const formatted = formatValue(value).toLowerCase();

  if (formatted === "ok" || formatted === "on" || formatted.includes("/60 ok")) {
    return "text-success-600 dark:text-success-400";
  }

  if (formatted === "ng" || formatted === "off") {
    return "text-error-600 dark:text-error-400";
  }

  return "text-gray-800 dark:text-white/90";
}

function getDetailCardClass(label: string, value: unknown) {
  const formatted = formatValue(value).toLowerCase();

  if (formatted === "ok" || formatted === "on" || formatted.includes("/60 ok")) {
    return "border-l-4 border-l-success-500 bg-success-50/40 dark:border-l-success-400 dark:bg-success-500/[0.06]";
  }

  if (formatted === "ng" || formatted === "off") {
    return "border-l-4 border-l-error-500 bg-error-50/40 dark:border-l-error-400 dark:bg-error-500/[0.06]";
  }

  if (label.toLowerCase().includes("serial")) {
    return "border-l-4 border-l-brand-500 bg-brand-50/40 dark:border-l-brand-400 dark:bg-brand-500/[0.06]";
  }

  if (label.toLowerCase().includes("bolt") || label.toLowerCase().includes("nut")) {
    return "border-l-4 border-l-warning-500 bg-warning-50/40 dark:border-l-warning-400 dark:bg-warning-500/[0.06]";
  }

  if (label.toLowerCase().includes("rotation") || label.toLowerCase().includes("ampere")) {
    return "border-l-4 border-l-sky-500 bg-sky-50/40 dark:border-l-sky-400 dark:bg-sky-500/[0.06]";
  }

  return "border-l-4 border-l-gray-300 bg-gray-50/40 dark:border-l-gray-600 dark:bg-white/[0.02]";
}
