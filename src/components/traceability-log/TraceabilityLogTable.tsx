"use client";

import PageLoader from "@/components/common/PageLoader";
import DatePicker from "@/components/form/date-picker";
import { useToast } from "@/context/ToastContext";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { useTraceabilityLogs } from "@/hooks/useTraceabilityLogs";
import { CloseIcon, EyeIcon, RefreshIcon } from "@/icons";
import { ProcessLog } from "@/services/TraceabilityLogService";
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";

type ResultFilter = "" | "ok" | "ng";

const dateFormatter = new Intl.DateTimeFormat("en-GB", {
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  month: "short",
  year: "numeric",
});

const isPassed = (log: ProcessLog) =>
  typeof log.status === "boolean" ? log.status : log.isActive;

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

const getIssueNumbers = (log: ProcessLog, issueType: string) => {
  return log.issues
    .filter((issue) => issue.issueType === issueType)
    .map((issue) => issue.issueNumber)
    .filter((issueNumber): issueNumber is string => Boolean(issueNumber));
};

export default function TraceabilityLogTable() {
  const toast = useToast();
  const router = useRouter();
  const lastErrorRef = useRef<string | null>(null);
  const [search, setSearch] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [datePickerKey, setDatePickerKey] = useState(0);
  const [resultFilter, setResultFilter] = useState<ResultFilter>("");
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
  } = useTraceabilityLogs({ limit: 10, page: 1 });
  const currentPage = pagination?.page ?? query.page;
  const currentLimit = pagination?.limit ?? query.limit;
  const totalPage = pagination?.totalPage ?? 1;
  const total = pagination?.total ?? data.length;
  useEffect(() => {
    if (debouncedSearch !== query.serialNumberCode) {
      setQuery({ serialNumberCode: debouncedSearch });
    }
  }, [debouncedSearch, query.serialNumberCode, setQuery]);

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
    toast.error({ title: "Failed to load traceability logs", message: error });
  }, [error, toast]);

  const visibleLogs = useMemo(
    () =>
      data.filter(
        (log) => resultFilter === "" || (resultFilter === "ok") === isPassed(log)
      ),
    [data, resultFilter]
  );
  const firstItem = visibleLogs.length > 0
    ? (currentPage - 1) * currentLimit + 1
    : 0;
  const lastItem = visibleLogs.length > 0
    ? firstItem + visibleLogs.length - 1
    : 0;
  const pageNumbers = getPageNumbers(currentPage, totalPage);
  const resetFilters = () => {
    setSearch("");
    setResultFilter("");
    setStartDate("");
    setEndDate("");
    setDatePickerKey((current) => current + 1);
    setQuery({
      endDate: "",
      isActive: null,
      serialNumberCode: "",
      startDate: "",
    });
  };
  if (isLoading && data.length === 0) {
    return <PageLoader />;
  }

  return (
    <>
      <div className="process-log-sheet mx-4 my-4 overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-white/[0.05] dark:bg-white/[0.03]">
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
                onChange={(event) => setResultFilter(event.target.value as ResultFilter)}
                value={resultFilter}
              >
                <option value="">All Results</option>
                <option value="ok">Passed (OK)</option>
                <option value="ng">Rejected (NG)</option>
              </select>
              <div className="w-[230px]">
                <DatePicker
                  className="h-10 px-3 py-2"
                  defaultDate={startDate && endDate ? [startDate, endDate] : startDate}
                  id="traceability-log-date-filter"
                  key={`traceability-log-date-filter-${datePickerKey}`}
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
                aria-label="Refresh traceability logs"
                className="process-log-refresh-button grid size-10 shrink-0 place-items-center rounded-lg border border-gray-300 bg-white text-gray-600 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300 dark:hover:bg-gray-800"
                onClick={refetch}
                title="Refresh"
                type="button"
              >
                <span className="grid size-5 place-items-center overflow-visible leading-none">
                  <RefreshIcon className="block size-[18px] overflow-visible fill-current" />
                </span>
              </button>
              <button
                aria-label="Reset traceability log filters"
                className="grid size-10 shrink-0 place-items-center rounded-lg border border-gray-300 bg-white text-gray-600 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300 dark:hover:bg-gray-800"
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
          <div className="overflow-hidden">
        <table className="w-full table-fixed text-left text-[11px]">
          <colgroup>
            <col className="w-[6%]" />
            <col className="w-[13%]" />
            <col className="w-[14%]" />
            <col className="w-[14%]" />
            <col className="w-[17%]" />
            <col className="w-[17%]" />
            <col className="w-[7%]" />
            <col className="w-[6%]" />
            <col className="w-[6%]" />
          </colgroup>
          <thead className="text-[10px] font-semibold uppercase text-white">
            <tr>
              <th className="bg-[#6D8AF3] px-1.5 py-2.5 text-center">
                No
              </th>
              <th className="bg-[#6D8AF3] px-1.5 py-2.5">Timestamp</th>
              <th className="bg-[#6D8AF3] px-1.5 py-2.5">Serial Clinching</th>
              <th className="bg-[#6D8AF3] px-1.5 py-2.5">Serial M-Fan</th>
              <th className="bg-[#6D8AF3] px-1.5 py-2.5">Issue Clinching</th>
              <th className="bg-[#6D8AF3] px-1.5 py-2.5">Issue M-Fan</th>
              <th className="bg-[#6D8AF3] px-1.5 py-2.5 text-center">Status</th>
              <th className="bg-[#6D8AF3] px-1.5 py-2.5 text-center">Finish</th>
              <th className="bg-[#6D8AF3] px-1.5 py-2.5 text-center">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 text-xs dark:divide-gray-800">
            {visibleLogs.map((log, index) => (
              <ProcessLogRow
                index={(query.page - 1) * query.limit + index + 1}
                key={log.id}
                log={log}
                onOpen={() =>
                  router.push(
                    `/traceability-log/${encodeURIComponent(
                      log.serialNumberCode ?? String(log.id)
                    )}`
                  )
                }
              />
            ))}
          </tbody>
        </table>
          </div>
        {visibleLogs.length === 0 && (
          <div className="py-12 text-center text-sm text-gray-500 dark:text-gray-400">
            {error ?? "No traceability logs found."}
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

    </>
  );
}

function ProcessLogRow({
  index,
  log,
  onOpen,
}: {
  index: number;
  log: ProcessLog;
  onOpen: () => void;
}) {
  const passed = isPassed(log);
  const serialNumberClinching =
    log.serialNumberClinching ?? log.serialNumberCode ?? "-";
  const serialNumberMFan = log.serialNumberMFan ?? "-";
  const issueNumbersClinching = getIssueNumbers(log, "Clinching");
  const issueNumbersMFan = getIssueNumbers(log, "M-Fan");

  return (
    <tr
      className={
        passed
          ? "hover:bg-gray-50/70 dark:hover:bg-white/[0.03]"
          : "bg-error-50/40 hover:bg-error-50 dark:bg-error-500/[0.04]"
      }
    >
      <td className="px-1.5 py-2 text-center font-mono text-[11px] text-gray-600 dark:text-gray-300">
        {index}
      </td>
      <td className="truncate whitespace-nowrap px-1.5 py-2 text-[11px] text-gray-600 dark:text-gray-300">
        {formatDate(log.createdAt)}
      </td>
      <td className="truncate px-1.5 py-2 font-mono font-semibold text-brand-600 dark:text-brand-300">
        {serialNumberClinching}
      </td>
      <td className="truncate px-1.5 py-2 font-mono text-[11px] text-gray-700 dark:text-gray-300">
        {serialNumberMFan}
      </td>
      <td className="px-1.5 py-2">
        <IssueBadges issues={issueNumbersClinching} tone="clinching" />
      </td>
      <td className="px-1.5 py-2">
        <IssueBadges issues={issueNumbersMFan} tone="mFan" />
      </td>
      <td className="px-1.5 py-2 text-center">
        <StatusPill passed={passed} />
      </td>
      <td className="px-1.5 py-2 text-center">
        <OptionalStatusPill passed={log.isFinished ?? null} />
      </td>
      <td className="px-1.5 py-2 text-center">
        <button
          className="process-log-details-button inline-flex h-7 items-center gap-1 rounded-lg border border-gray-300 bg-white px-2 text-[11px] font-semibold text-brand-600 hover:bg-brand-50 dark:border-gray-700 dark:bg-gray-900 dark:text-brand-300 dark:hover:bg-brand-500/10"
          onClick={onOpen}
          type="button"
        >
          <EyeIcon className="size-4 fill-current" />
          Detail
        </button>
      </td>
    </tr>
  );
}

function IssueBadges({
  issues,
  tone,
}: {
  issues: string[];
  tone: "clinching" | "mFan";
}) {
  if (issues.length === 0) {
    return (
      <span className="font-mono text-[11px] text-gray-500 dark:text-gray-400">
        -
      </span>
    );
  }

  const toneClass =
    tone === "clinching"
      ? "border-[#1488ff]/25 bg-[#1488ff]/10 text-[#0868c7] dark:border-[#1488ff]/30 dark:text-[#8bc9ff]"
      : "border-[#4ceac6]/25 bg-[#4ceac6]/10 text-[#087866] dark:border-[#4ceac6]/30 dark:text-[#8ff5df]";

  return (
    <div className="flex flex-wrap gap-1">
      {issues.map((issue) => (
        <span
          className={`inline-flex max-w-full items-center truncate rounded-full border px-2 py-0.5 font-mono text-[10px] font-semibold ${toneClass}`}
          key={issue}
          title={issue}
        >
          {issue}
        </span>
      ))}
    </div>
  );
}

function StatusPill({ passed }: { passed: boolean }) {
  return (
    <span
      className={`inline-flex rounded-full border px-2 py-0.5 text-[11px] font-semibold ${
        passed
          ? "border-success-200 bg-success-50 text-success-700 dark:border-success-500/30 dark:bg-success-500/15 dark:text-success-400"
          : "border-error-200 bg-error-50 text-error-700 dark:border-error-500/30 dark:bg-error-500/15 dark:text-error-400"
      }`}
    >
      {passed ? "OK" : "NG"}
    </span>
  );
}

function OptionalStatusPill({ passed }: { passed: boolean | null }) {
  if (typeof passed !== "boolean") {
    return (
      <span className="inline-flex rounded-full border border-gray-200 bg-gray-50 px-2 py-0.5 text-[11px] font-semibold text-gray-500 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-400">
        -
      </span>
    );
  }

  return <StatusPill passed={passed} />;
}
