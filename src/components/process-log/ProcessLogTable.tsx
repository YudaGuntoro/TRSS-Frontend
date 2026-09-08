"use client";

import { Modal } from "@/components/ui/modal";
import { useToast } from "@/context/ToastContext";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { useProcessLogs } from "@/hooks/useProcessLogs";
import { EyeIcon, RefreshIcon } from "@/icons";
import { ProcessLogDetail, ProcessLogListItem } from "@/services/ProcessLogService";
import { useEffect, useRef, useState } from "react";

type StatusFilter = "" | "ok" | "ng";
type FinishFilter = "" | "processing" | "finish";

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

const formatValue = (value: unknown) => {
  if (value === null || value === undefined || value === "") {
    return "-";
  }

  if (typeof value === "boolean") {
    return value ? "OK" : "NG";
  }

  if (Array.isArray(value)) {
    const passed = value.filter(Boolean).length;
    return `${passed}/${value.length} OK`;
  }

  if (typeof value === "number") {
    return new Intl.NumberFormat("en-US", {
      maximumFractionDigits: 4,
    }).format(value);
  }

  return String(value);
};

const detailFields = {
  clinching: [
    ["Serial Clinching", "serialNumberClinching"],
    ["Core ASM", "coreAsmValue"],
    ["Upper Tank ASM", "upperTankAsmValue"],
    ["Lower Tank ASM", "lowerTankAsmValue"],
    ["O-Ring Set", "oRingSetResult"],
    ["NG Box Short", "ngBoxSensorShortSideValue"],
    ["Clinching Avg", "clinchingHeightAverage"],
    ["End Plate", "endPlateWidthResults"],
    ["End Plate Status", "endPlateWidthStatus"],
    ["NG Box Long", "ngBoxSensorLongSideValue"],
  ],
  mfan: [
    ["Serial M-Fan", "serialNumberMFan"],
    ["Lot Fan ASM", "lotFanAsmResult"],
    ["Lot Motor ASM", "lotMotorAsmResult"],
    ["Lot Guide ASM", "lotGuideAsmResult"],
    ["Bolt Tighten", "boltTightenValue"],
    ["Bolt Qty", "boltTightenQtyValue"],
    ["Nut Tighten", "nutTightenValue"],
    ["Rotation Max", "mFanInspectionRotationSpeedMaxValue"],
    ["Rotation Min", "mFanInspectionRotationSpeedMinValue"],
    ["Ampere Max", "mFanInspectionAmpereMaxValue"],
    ["Ampere Min", "mFanInspectionAmpereMinValue"],
    ["Wind Direction", "mFanInspectionWindDirectionValue"],
    ["M-Fan Test", "mFanTestResult"],
    ["NG Box M-Fan", "ngBoxSensorMFanInspectionValue"],
  ],
};

export default function ProcessLogTable() {
  const toast = useToast();
  const lastErrorRef = useRef<string | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("");
  const [finishFilter, setFinishFilter] = useState<FinishFilter>("");
  const [selectedLog, setSelectedLog] = useState<ProcessLogListItem | null>(null);
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
                <option value="processing">Processing</option>
                <option value="finish">Finish</option>
              </select>
              <button
                aria-label="Refresh process logs"
                className="inline-flex size-10 items-center justify-center rounded-lg border border-gray-300 bg-white text-gray-600 transition-colors hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300 dark:hover:bg-gray-800"
                onClick={refetch}
                title="Refresh"
                type="button"
              >
                <RefreshIcon className="size-4" />
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
                <th className="px-4 py-3 text-center">Finish</th>
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

      <ProcessLogDetailModal log={selectedLog} onClose={() => setSelectedLog(null)} />
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
      className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${
        finished
          ? "border-sky-200 bg-sky-50 text-sky-700 dark:border-sky-500/30 dark:bg-sky-500/15 dark:text-sky-300"
          : "border-warning-200 bg-warning-50 text-warning-700 dark:border-warning-500/30 dark:bg-warning-500/15 dark:text-warning-300"
      }`}
    >
      {finished ? "Finish" : "Processing"}
    </span>
  );
}

function ProcessLogDetailModal({
  log,
  onClose,
}: {
  log: ProcessLogListItem | null;
  onClose: () => void;
}) {
  const type = log?.type.toLowerCase() === "mfan" ? "mfan" : "clinching";
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

            return (
              <div
                className={`rounded-lg border border-gray-200 bg-white p-4 shadow-theme-xs dark:border-gray-800 dark:bg-white/[0.03] ${accentClass}`}
                key={key}
              >
                <p className="text-xs font-semibold uppercase text-gray-500 dark:text-gray-400">
                  {label}
                </p>
                <p className={`mt-2 text-base font-semibold ${getValueClassName(value)}`}>
                  {formatValue(value)}
                </p>
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
