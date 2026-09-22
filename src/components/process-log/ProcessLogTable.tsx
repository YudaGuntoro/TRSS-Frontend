"use client";

import { formatShortDateTime as formatDate } from "@/utils/formatDateTime";
import DatePicker from "@/components/form/date-picker";
import {
  RefreshActionIcon,
  ResetActionIcon,
} from "@/components/ui/icons/ActionIcons";
import { Modal } from "@/components/ui/modal";
import { useToast } from "@/context/ToastContext";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { useProcessLogs } from "@/hooks/useProcessLogs";
import { EyeIcon } from "@/icons";
import {
  ProcessLogListItem,
  ProcessLogParameter,
} from "@/services/ProcessLogService";
import { useEffect, useRef, useState } from "react";

type StatusFilter = "" | "ok" | "ng";
type FinishFilter = "" | "processing" | "finish";

type ArrayPointModalState = {
  parameter: string;
  parameterDesc?: string | null;
  values: unknown[];
  status?: boolean | null;
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

const isOkNgValue = (value: unknown): boolean => {
  if (typeof value === "boolean") return true;
  if (typeof value === "string") {
    const s = value.trim().toLowerCase();
    return [
      "ok",
      "ng",
      "true",
      "false",
      "passed",
      "rejected",
      "error",
      "err",
      "fail",
      "failed",
    ].includes(s);
  }
  return false;
};

const isPointFailed = (value: unknown): boolean => {
  if (value === false) return true;
  if (typeof value === "string") {
    const s = value.trim().toLowerCase();
    return ["ng", "false", "rejected", "error", "err", "fail", "failed"].includes(s);
  }
  return false;
};

const isOkNgArray = (values: unknown[]): boolean => {
  if (!values || values.length === 0) return false;
  return values.every((p) => isOkNgValue(p));
};

const getArrayDisplayValue = (
  values: unknown[]
): { text: string; isOkNg: boolean; isFailed: boolean } => {
  if (!values || values.length === 0) {
    return { text: "-", isOkNg: false, isFailed: false };
  }

  const isOkNg = isOkNgArray(values);

  if (isOkNg) {
    const hasNg = values.some((p) => isPointFailed(p));
    return {
      text: hasNg ? "NG" : "OK",
      isOkNg: true,
      isFailed: hasNg,
    };
  }

  const numericValues = values
    .map((v) => {
      if (typeof v === "number") return v;
      if (typeof v === "string") {
        const num = Number(v.replace(",", "."));
        return Number.isNaN(num) ? null : num;
      }
      return null;
    })
    .filter((v): v is number => v !== null);

  if (numericValues.length > 0) {
    const sum = numericValues.reduce((acc, curr) => acc + curr, 0);
    const avg = sum / numericValues.length;
    const formattedAvg = Number.isInteger(avg)
      ? avg.toString()
      : parseFloat(avg.toFixed(2)).toString();

    return {
      text: formattedAvg,
      isOkNg: false,
      isFailed: false,
    };
  }

  return {
    text: `${values.length} Points`,
    isOkNg: false,
    isFailed: false,
  };
};

const formatSingleValue = (value: unknown): string => {
  if (value === null || value === undefined || value === "") return "-";
  if (typeof value === "boolean") return value ? "true" : "false";
  return String(value);
};

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
  const [arrayPointModal, setArrayPointModal] =
    useState<ArrayPointModalState | null>(null);
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
    const status = statusFilter === "" ? null : statusFilter === "ok";
    const isFinished = finishFilter === "" ? null : finishFilter === "finish";

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
                onChange={(event) =>
                  setStatusFilter(event.target.value as StatusFilter)
                }
                value={statusFilter}
              >
                <option value="">All Status</option>
                <option value="ok">OK</option>
                <option value="ng">NG</option>
              </select>
              <select
                className="h-10 rounded-lg border border-gray-300 bg-transparent px-3 py-2 text-sm font-medium text-gray-800 outline-none focus:border-brand-300 focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
                onChange={(event) =>
                  setFinishFilter(event.target.value as FinishFilter)
                }
                value={finishFilter}
              >
                <option value="">All Progress</option>
                <option value="processing">In Progress</option>
                <option value="finish">Finished</option>
              </select>
              <div className="w-[230px]">
                <DatePicker
                  className="h-10 px-3 py-2"
                  defaultDate={
                    startDate && endDate ? [startDate, endDate] : startDate
                  }
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
                className="inline-flex size-10 shrink-0 items-center justify-center rounded-lg border border-gray-300 bg-white text-gray-600 leading-none transition-colors hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300 dark:hover:bg-gray-800"
                onClick={refetch}
                title="Refresh"
                type="button"
              >
                <span className="inline-flex size-[18px] items-center justify-center leading-none">
                  <RefreshActionIcon />
                </span>
              </button>
              <button
                aria-label="Reset process log filters"
                className="inline-flex size-10 shrink-0 items-center justify-center rounded-lg border border-gray-300 bg-white text-gray-600 leading-none transition-colors hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300 dark:hover:bg-gray-800"
                onClick={resetFilters}
                title="Reset filters"
                type="button"
              >
                <span className="inline-flex size-[18px] items-center justify-center leading-none">
                  <ResetActionIcon />
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
                  <th className="px-4 py-3 text-center whitespace-nowrap">Progress</th>
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
                    <td className="whitespace-nowrap px-4 py-3 text-center">
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
              {isLoading
                ? "Loading process logs..."
                : error ?? "No process logs found."}
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
        onOpenArrayPoints={(state) => setArrayPointModal(state)}
      />

      {arrayPointModal && (
        <ArrayPointsModal
          data={arrayPointModal}
          onClose={() => setArrayPointModal(null)}
        />
      )}
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
      className={`inline-flex items-center gap-1 whitespace-nowrap rounded-full border px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${
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
  onOpenArrayPoints,
}: {
  log: ProcessLogListItem | null;
  onClose: () => void;
  onOpenArrayPoints: (state: ArrayPointModalState) => void;
}) {
  const isMFan =
    log?.type?.toLowerCase().includes("fan") ||
    log?.serialNumberCode?.toUpperCase().startsWith("MF");

  let parameters: ProcessLogParameter[] = [];
  if (isMFan && Array.isArray(log?.mfan) && log.mfan.length > 0) {
    parameters = log.mfan;
  } else if (!isMFan && Array.isArray(log?.clinching) && log.clinching.length > 0) {
    parameters = log.clinching;
  } else if (Array.isArray(log?.mfan) && log.mfan.length > 0) {
    parameters = log.mfan;
  } else if (Array.isArray(log?.clinching) && log.clinching.length > 0) {
    parameters = log.clinching;
  }

  const isLogFailed = log?.status === false;

  return (
    <Modal
      className="mx-4 max-w-5xl overflow-hidden p-0"
      isOpen={Boolean(log)}
      onClose={onClose}
    >
      {/* Header */}
      <div
        className={`border-b bg-white px-6 py-5 dark:bg-gray-950 ${
          isLogFailed
            ? "border-red-300 dark:border-red-900/60"
            : "border-gray-200 dark:border-gray-800"
        }`}
      >
        <div className="pr-10">
          <div className="flex flex-wrap items-center gap-3">
            <h2 className="text-lg font-semibold text-gray-800 dark:text-white/90">
              Process Log Detail
            </h2>
            <span className="rounded-full border border-gray-200 bg-gray-50 px-2.5 py-1 text-xs font-semibold text-gray-700 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300">
              {log ? formatType(log.type) : "-"}
            </span>
            {log && <ProgressPill finished={log.isFinished} />}
            {log && <StatusPill passed={log.status} />}
          </div>
          <p className="mt-1.5 text-xs text-gray-500 dark:text-gray-400">
            Serial Number:{" "}
            <span className="font-mono font-semibold text-gray-700 dark:text-gray-300">
              {log?.serialNumberCode ?? "-"}
            </span>
            <span className="mx-2">|</span>
            Timestamp:{" "}
            <span className="font-medium text-gray-700 dark:text-gray-300">
              {log ? formatDate(log.createdAt) : "-"}
            </span>
            <span className="mx-2">|</span>
            Parameters:{" "}
            <span className="font-semibold text-brand-600 dark:text-brand-400">
              {parameters.length}
            </span>
          </p>
        </div>
      </div>

      {/* Body: Dynamic Parameters Grid */}
      <div className="max-h-[70vh] overflow-y-auto bg-gray-50 p-6 dark:bg-gray-950">
        <div className="grid grid-cols-[repeat(auto-fit,minmax(180px,1fr))] gap-3">
          {parameters.map((param, index) => {
            const isArray = Array.isArray(param.value);
            const arrayInfo = isArray
              ? getArrayDisplayValue(param.value as unknown[])
              : null;
            const isOkNg = isArray
              ? Boolean(arrayInfo?.isOkNg)
              : isOkNgValue(param.value);

            const isFailed = isOkNg
              ? isArray
                ? Boolean(arrayInfo?.isFailed)
                : isPointFailed(param.value)
              : false;
            const title =
              param.parameterDesc || param.parameter || `Param ${index + 1}`;

            return (
              <div
                className={`min-w-0 overflow-hidden rounded-lg p-3 text-center transition-all ${
                  isFailed
                    ? "border-2 border-red-500 bg-red-50/70 shadow-sm shadow-red-500/10 dark:border-red-500/80 dark:bg-red-950/30"
                    : "border border-gray-200 bg-white hover:border-brand-300 dark:border-gray-800 dark:bg-gray-900"
                }`}
                key={`${param.parameter ?? "param"}-${index}`}
              >
                {/* Parameter Title */}
                <div className="flex min-h-9 items-start justify-center">
                  <span
                    className={`block max-h-9 max-w-full overflow-hidden break-words text-xs font-semibold leading-[18px] uppercase ${
                      isFailed
                        ? "text-red-800 dark:text-red-300"
                        : "text-gray-600 dark:text-gray-400"
                    }`}
                    title={title}
                  >
                    {title}
                  </span>
                </div>

                {/* Parameter Value */}
                <div className="mt-2.5 flex min-w-0 items-center justify-center">
                  {isArray && arrayInfo ? (
                    <button
                      className={`inline-flex h-7 min-w-0 max-w-full items-center justify-center gap-1.5 rounded-md border px-2.5 font-mono text-xs font-bold transition-all hover:scale-[1.02] ${
                        isOkNg
                          ? isFailed
                            ? "border-2 border-red-500 bg-red-100 text-red-700 hover:bg-red-200 dark:border-red-500/80 dark:bg-red-900/40 dark:text-red-300"
                            : "border-emerald-300 bg-emerald-50 text-emerald-800 hover:bg-emerald-100 dark:border-emerald-500/40 dark:bg-emerald-500/15 dark:text-emerald-300"
                          : "border-gray-200 bg-gray-50 text-gray-800 hover:bg-gray-100 dark:border-gray-700 dark:bg-gray-800/80 dark:text-gray-200 dark:hover:bg-gray-800"
                      }`}
                      onClick={() =>
                        onOpenArrayPoints({
                          parameter: param.parameter || "",
                          parameterDesc: param.parameterDesc,
                          status: param.status,
                          values: param.value as unknown[],
                        })
                      }
                      type="button"
                    >
                      <span className="truncate">
                        {arrayInfo.text}
                      </span>
                      <svg
                        aria-hidden="true"
                        className="size-3.5 shrink-0 fill-none stroke-current stroke-2"
                        viewBox="0 0 24 24"
                      >
                        <path d="M2.5 12s3.5-6 9.5-6 9.5 6 9.5 6-3.5 6-9.5 6-9.5-6Z" />
                        <circle cx="12" cy="12" r="2.5" />
                      </svg>
                    </button>
                  ) : (
                    <span
                      className={`truncate font-mono text-sm font-bold ${
                        isOkNg
                          ? isFailed
                            ? "text-red-600 dark:text-red-400"
                            : "text-emerald-600 dark:text-emerald-400"
                          : "text-gray-900 dark:text-white"
                      }`}
                      title={formatSingleValue(param.value)}
                    >
                      {formatSingleValue(param.value)}
                    </span>
                  )}
                </div>
              </div>
            );
          })}

          {parameters.length === 0 && (
            <div className="col-span-full rounded-lg border border-dashed border-gray-200 py-12 text-center text-sm text-gray-500 dark:border-white/[0.12] dark:text-gray-400">
              No parameters recorded for this process log.
            </div>
          )}
        </div>
      </div>

      {/* Footer */}
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

function ArrayPointsModal({
  data,
  onClose,
}: {
  data: ArrayPointModalState;
  onClose: () => void;
}) {
  const points = data.values;
  const isOkNgType = isOkNgArray(points);

  const passedCount = isOkNgType
    ? points.filter((p) => !isPointFailed(p)).length
    : 0;
  const rejectedCount = isOkNgType ? points.length - passedCount : 0;
  const isFailedOverall = isOkNgType && rejectedCount > 0;

  return (
    <Modal
      className="mx-4 max-w-5xl overflow-hidden p-0"
      isOpen={true}
      onClose={onClose}
    >
      <div className="border-b border-gray-200 bg-white px-6 py-4 dark:border-gray-800 dark:bg-gray-950">
        <div className="flex flex-wrap items-center justify-between gap-3 pr-10">
          <div>
            <h2 className="text-base font-bold text-gray-900 dark:text-white">
              {data.parameterDesc || data.parameter}
            </h2>
          </div>
          <span
            className={`rounded-full border px-3 py-0.5 text-xs font-bold uppercase ${
              !isOkNgType
                ? "border-gray-200 bg-gray-100 text-gray-700 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300"
                : !isFailedOverall
                  ? "border-success-200 bg-success-50 text-success-700 dark:border-success-500/30 dark:bg-success-500/15 dark:text-success-300"
                  : "border-2 border-red-500 bg-red-50 text-red-700 dark:border-red-500 dark:bg-red-950/40 dark:text-red-300"
            }`}
          >
            {isOkNgType
              ? `${points.length} Points (${passedCount} OK / ${rejectedCount} NG)`
              : `${points.length} Points`}
          </span>
        </div>
      </div>

      <div className="max-h-[65vh] overflow-y-auto bg-gray-50 p-6 dark:bg-gray-950">
        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8">
          {points.map((value, index) => {
            const isFailed = isOkNgType && isPointFailed(value);
            const isOk = isOkNgType && !isFailed;
            const displayLabel = formatSingleValue(value);

            return (
              <div
                className={`rounded-lg p-2.5 text-center transition-all ${
                  isOkNgType
                    ? isFailed
                      ? "border-2 border-red-500 bg-red-50/80 shadow-sm shadow-red-500/10 dark:border-red-500 dark:bg-red-950/40"
                      : "border border-emerald-300 bg-emerald-50/60 dark:border-emerald-500/40 dark:bg-emerald-950/30"
                    : "border border-gray-200 bg-white hover:border-brand-300 dark:border-gray-800 dark:bg-gray-900"
                }`}
                key={index}
              >
                <span
                  className={`block font-mono text-[10px] font-semibold ${
                    isOkNgType
                      ? isFailed
                        ? "text-red-500 dark:text-red-400"
                        : "text-emerald-600 dark:text-emerald-400"
                      : "text-gray-400 dark:text-gray-500"
                  }`}
                >
                  P-{String(index + 1).padStart(2, "0")}
                </span>
                <p
                  className={`mt-1 font-mono text-xs font-bold ${
                    isOkNgType
                      ? isFailed
                        ? "text-red-600 dark:text-red-400"
                        : "text-emerald-700 dark:text-emerald-300"
                      : "text-gray-900 dark:text-white"
                  }`}
                >
                  {displayLabel}
                </p>
              </div>
            );
          })}
          {points.length === 0 && (
            <div className="col-span-full rounded-lg border border-dashed border-gray-200 px-5 py-8 text-center text-sm text-gray-500 dark:border-white/[0.12] dark:text-gray-400">
              No measurement values recorded.
            </div>
          )}
        </div>
      </div>

      <div className="flex justify-end border-t border-gray-200 bg-white px-6 py-3 dark:border-gray-800 dark:bg-gray-950">
        <button
          className="h-8 rounded-lg bg-brand-500 px-4 text-xs font-semibold text-white hover:bg-brand-600"
          onClick={onClose}
          type="button"
        >
          Close
        </button>
      </div>
    </Modal>
  );
}
