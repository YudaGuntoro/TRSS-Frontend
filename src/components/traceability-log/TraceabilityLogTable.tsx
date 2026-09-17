"use client";

import { formatShortDateTime as formatDate } from "@/utils/formatDateTime";
import PageLoader from "@/components/common/PageLoader";
import DatePicker from "@/components/form/date-picker";
import {
  RefreshActionIcon,
  ResetActionIcon,
} from "@/components/ui/icons/ActionIcons";
import { Modal } from "@/components/ui/modal";
import { useToast } from "@/context/ToastContext";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { useTraceabilityLogs } from "@/hooks/useTraceabilityLogs";
import { TraceabilityLogItem } from "@/services/TraceabilityLogService";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

type StatusFilter = "" | "ok" | "ng";

type IssueModalData = {
  title: string;
  serialNumber: string;
  issues: string[];
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

export default function TraceabilityLogTable() {
  const toast = useToast();
  const router = useRouter();
  const [issueModal, setIssueModal] = useState<IssueModalData | null>(null);
  const lastErrorRef = useRef<string | null>(null);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [datePickerKey, setDatePickerKey] = useState(0);

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
    if (debouncedSearch !== query.search) {
      setQuery({ search: debouncedSearch });
    }
  }, [debouncedSearch, query.search, setQuery]);

  useEffect(() => {
    const statusVal = statusFilter === "" ? null : statusFilter === "ok";

    if (
      statusVal !== (query.status ?? null) ||
      startDate !== (query.startDate ?? "") ||
      endDate !== (query.endDate ?? "")
    ) {
      setQuery({
        status: statusVal,
        startDate,
        endDate,
      });
    }
  }, [endDate, query.endDate, query.startDate, query.status, setQuery, startDate, statusFilter]);

  useEffect(() => {
    if (!error || lastErrorRef.current === error) {
      return;
    }

    lastErrorRef.current = error;
    toast.error({ title: "Failed to load traceability logs", message: error });
  }, [error, toast]);

  const firstItem = data.length > 0 ? (currentPage - 1) * currentLimit + 1 : 0;
  const lastItem = data.length > 0 ? firstItem + data.length - 1 : 0;
  const pageNumbers = getPageNumbers(currentPage, totalPage);

  const resetFilters = () => {
    setSearch("");
    setStatusFilter("");
    setStartDate("");
    setEndDate("");
    setDatePickerKey((current) => current + 1);
    setQuery({
      search: "",
      status: null,
      startDate: "",
      endDate: "",
    });
  };

  if (isLoading && data.length === 0) {
    return <PageLoader />;
  }

  const openDetail = (log: TraceabilityLogItem) => {
    router.push(
      `/traceability-log/${encodeURIComponent(
        log.serialNumberClinching || String(log.id)
      )}`
    );
  };

  return (
    <div className="mx-3 my-4 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-xs dark:border-white/[0.05] dark:bg-white/[0.03] sm:mx-4">
      {/* Filter / Controls Header */}
      <div className="border-b border-gray-100 px-4 py-4 dark:border-white/[0.05] sm:px-5">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:flex lg:flex-wrap lg:items-center">
            <label className="flex min-w-0 items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
              <span className="shrink-0">Show</span>
              <select
                className="h-10 min-w-0 flex-1 rounded-lg border border-gray-300 bg-transparent px-3 py-2 text-sm text-gray-800 outline-none focus:border-brand-300 focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 sm:flex-none"
                onChange={(event) => setLimit(Number(event.target.value))}
                value={query.limit}
              >
                {[10, 25, 50, 100].map((limit) => (
                  <option key={limit} value={limit}>
                    {limit}
                  </option>
                ))}
              </select>
              <span className="shrink-0">entries</span>
            </label>

            <select
              className="h-10 w-full rounded-lg border border-gray-300 bg-transparent px-3 py-2 text-sm font-medium text-gray-800 outline-none focus:border-brand-300 focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 sm:w-auto"
              onChange={(event) => setStatusFilter(event.target.value as StatusFilter)}
              value={statusFilter}
            >
              <option value="">All Status</option>
              <option value="ok">Status OK</option>
              <option value="ng">Status NG</option>
            </select>

            <div className="min-w-0 sm:col-span-2 lg:w-[230px]">
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

            <div className="flex items-center gap-2">
              <button
                aria-label="Refresh traceability logs"
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
                aria-label="Reset traceability log filters"
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
          </div>

          <label className="flex min-w-0 flex-col gap-1.5 text-sm text-gray-700 dark:text-gray-300 sm:flex-row sm:items-center sm:gap-2">
            <span className="shrink-0">Search</span>
            <input
              className="h-10 w-full rounded-lg border border-gray-300 bg-transparent px-3 py-2 text-sm text-gray-800 outline-none placeholder:text-gray-400 focus:border-brand-300 focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 lg:w-72"
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search serial number"
              value={search}
            />
          </label>
        </div>
      </div>

      <div className="space-y-3 p-3 md:hidden">
        {data.map((log, index) => (
          <TraceabilityLogMobileCard
            index={(currentPage - 1) * currentLimit + index + 1}
            key={log.id}
            log={log}
            onOpenDetail={() => openDetail(log)}
            onOpenIssues={setIssueModal}
          />
        ))}

        {data.length === 0 && (
          <div className="rounded-lg border border-gray-100 bg-gray-50 px-4 py-10 text-center text-sm text-gray-500 dark:border-gray-800 dark:bg-gray-900/50 dark:text-gray-400">
            {error ?? "No traceability logs found."}
          </div>
        )}
      </div>

      {/* Simple Clean Table */}
      <div className="hidden overflow-x-auto md:block">
        <table className="min-w-[1120px] w-full text-left text-xs">
          <thead className="bg-[#6D8AF3] text-[11px] font-semibold uppercase text-white">
            <tr>
              <th className="w-12 px-3 py-3 text-center">No</th>
              <th className="px-4 py-3 whitespace-nowrap">Timestamp</th>
              <th className="px-4 py-3">Serial Clinching</th>
              <th className="px-4 py-3">Serial M-Fan</th>
              <th className="px-4 py-3">Issue Clinching</th>
              <th className="px-4 py-3">Issue M-Fan</th>
              <th className="w-28 px-4 py-3 text-center">Progress</th>
              <th className="w-24 px-4 py-3 text-center">Status</th>
              <th className="w-24 px-4 py-3 text-center">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 text-xs dark:divide-gray-800">
            {data.map((log, index) => (
              <tr
                className={
                  log.status
                    ? "hover:bg-gray-50/70 dark:hover:bg-white/[0.03]"
                    : "bg-error-50/30 hover:bg-error-50/50 dark:bg-error-500/[0.04]"
                }
                key={log.id}
              >
                <td className="px-3 py-3 text-center font-mono text-gray-500 dark:text-gray-400">
                  {(currentPage - 1) * currentLimit + index + 1}
                </td>

                <td className="whitespace-nowrap px-4 py-3 text-gray-600 dark:text-gray-300">
                  {formatDate(log.createdAt)}
                </td>

                <td className="px-4 py-3 font-mono font-semibold text-brand-600 dark:text-brand-400">
                  {log.serialNumberClinching || "-"}
                </td>

                <td className="px-4 py-3 font-mono text-gray-800 dark:text-gray-200">
                  {log.serialNumberMFan || <span className="text-gray-400 italic font-normal">-</span>}
                </td>

                <td className="whitespace-nowrap px-4 py-3">
                  <IssuePreview
                    issues={log.issueNumbersClinching}
                    onOpen={() =>
                      setIssueModal({
                        title: "Clinching Issue Numbers",
                        serialNumber: log.serialNumberClinching || "-",
                        issues: log.issueNumbersClinching,
                      })
                    }
                  />
                </td>

                <td className="whitespace-nowrap px-4 py-3">
                  <IssuePreview
                    issues={log.issueNumbersMfan}
                    onOpen={() =>
                      setIssueModal({
                        title: "M-Fan Issue Numbers",
                        serialNumber: log.serialNumberMFan || "-",
                        issues: log.issueNumbersMfan,
                      })
                    }
                  />
                </td>

                <td className="px-4 py-3 text-center">
                  <ProgressBadge isFinish={log.isFinish} />
                </td>

                <td className="px-4 py-3 text-center">
                  <StatusBadge status={log.status} />
                </td>

                <td className="px-4 py-3 text-center">
                  <button
                    className="inline-flex h-8 items-center justify-center gap-1.5 rounded-lg border border-gray-300 bg-white px-3 text-xs font-semibold text-brand-600 shadow-xs transition-colors hover:bg-brand-50 hover:border-brand-300 dark:border-gray-700 dark:bg-gray-900 dark:text-brand-300 dark:hover:bg-brand-500/10"
                    onClick={() => openDetail(log)}
                    type="button"
                  >
                    <svg
                      className="size-4 shrink-0 fill-none stroke-current stroke-2"
                      viewBox="0 0 24 24"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M2.062 12.348a1 1 0 0 1 0-.696 10.75 10.75 0 0 1 19.876 0 1 1 0 0 1 0 .696 10.75 10.75 0 0 1-19.876 0" />
                      <circle cx="12" cy="12" r="3" />
                    </svg>
                    <span>Detail</span>
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {data.length === 0 && (
          <div className="py-12 text-center text-sm text-gray-500 dark:text-gray-400">
            {error ?? "No traceability logs found."}
          </div>
        )}
      </div>

      {/* Pagination Footer */}
      <footer className="flex flex-col gap-3 border-t border-gray-100 px-4 py-4 text-sm text-gray-500 dark:border-white/[0.05] dark:text-gray-400 sm:px-5 lg:flex-row lg:items-center lg:justify-between">
        <span className="text-center sm:text-left">
          Showing {firstItem} to {lastItem} of {total} entries
        </span>
        <div className="flex flex-wrap items-center justify-center gap-2 sm:justify-start">
          <button
            className="h-10 rounded-lg border border-gray-300 px-3 font-medium text-gray-700 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-700 dark:text-gray-300"
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
            className="h-10 rounded-lg border border-gray-300 px-3 font-medium text-gray-700 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-700 dark:text-gray-300"
            disabled={currentPage >= totalPage || isLoading}
            onClick={() => setPage(currentPage + 1)}
            type="button"
          >
            Next
          </button>
          <button
            className="hidden h-10 rounded-lg border border-gray-300 px-3 font-medium text-gray-700 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-700 dark:text-gray-300 sm:inline-flex sm:items-center"
            disabled={currentPage >= totalPage || isLoading}
            onClick={() => setPage(totalPage)}
            type="button"
          >
            Last Page
          </button>
        </div>
      </footer>

      {issueModal && (
        <IssueListModal
          data={issueModal}
          onClose={() => setIssueModal(null)}
        />
      )}
    </div>
  );
}

function TraceabilityLogMobileCard({
  index,
  log,
  onOpenDetail,
  onOpenIssues,
}: {
  index: number;
  log: TraceabilityLogItem;
  onOpenDetail: () => void;
  onOpenIssues: (data: IssueModalData) => void;
}) {
  return (
    <article
      className={`rounded-lg border p-3.5 shadow-xs ${
        log.status
          ? "border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-950"
          : "border-error-200 bg-error-50/40 dark:border-error-500/30 dark:bg-error-500/[0.06]"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="rounded-md bg-gray-100 px-2 py-0.5 font-mono text-[11px] font-semibold text-gray-500 dark:bg-gray-800 dark:text-gray-400">
              #{index}
            </span>
            <span className="text-xs text-gray-500 dark:text-gray-400">
              {formatDate(log.createdAt)}
            </span>
          </div>
          <p className="mt-2 truncate font-mono text-sm font-bold text-brand-600 dark:text-brand-300">
            {log.serialNumberClinching || "-"}
          </p>
          <p className="mt-0.5 truncate font-mono text-xs text-gray-600 dark:text-gray-300">
            {log.serialNumberMFan || "M-Fan: -"}
          </p>
        </div>

        <div className="flex shrink-0 flex-col items-end gap-1.5">
          <StatusBadge status={log.status} />
          <ProgressBadge isFinish={log.isFinish} />
        </div>
      </div>

      <div className="mt-3 grid grid-cols-1 gap-2 rounded-lg border border-gray-100 bg-gray-50/70 p-3 dark:border-gray-800 dark:bg-gray-900/50">
        <div className="min-w-0">
          <p className="mb-1 text-[11px] font-semibold uppercase text-gray-400">
            Issue Clinching
          </p>
          <IssuePreview
            issues={log.issueNumbersClinching}
            onOpen={() =>
              onOpenIssues({
                title: "Clinching Issue Numbers",
                serialNumber: log.serialNumberClinching || "-",
                issues: log.issueNumbersClinching,
              })
            }
          />
        </div>
        <div className="min-w-0">
          <p className="mb-1 text-[11px] font-semibold uppercase text-gray-400">
            Issue M-Fan
          </p>
          <IssuePreview
            issues={log.issueNumbersMfan}
            onOpen={() =>
              onOpenIssues({
                title: "M-Fan Issue Numbers",
                serialNumber: log.serialNumberMFan || "-",
                issues: log.issueNumbersMfan,
              })
            }
          />
        </div>
      </div>

      <button
        className="mt-3 inline-flex h-9 w-full items-center justify-center rounded-lg border border-gray-300 bg-white px-3 text-xs font-semibold text-brand-600 shadow-xs transition-colors hover:border-brand-300 hover:bg-brand-50 dark:border-gray-700 dark:bg-gray-900 dark:text-brand-300 dark:hover:bg-brand-500/10"
        onClick={onOpenDetail}
        type="button"
      >
        Detail
      </button>
    </article>
  );
}

function IssuePreview({
  issues,
  onOpen,
}: {
  issues: string[];
  onOpen: () => void;
}) {
  if (!issues || issues.length === 0) {
    return <span className="text-gray-400 italic font-normal">-</span>;
  }

  return (
    <div className="flex min-w-0 items-center gap-1 whitespace-nowrap">
      <span className="inline-flex min-w-0 max-w-full items-center rounded-md border border-gray-200 bg-gray-50 px-2 py-0.5 font-mono text-[11px] font-semibold text-gray-700 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300">
        <span className="truncate">{issues[0]}</span>
      </span>
      {issues.length > 1 && (
        <button
          type="button"
          onClick={onOpen}
          className="inline-flex shrink-0 items-center rounded-full border border-brand-200 bg-brand-50 px-1.5 py-0.5 font-mono text-[10px] font-bold text-brand-700 transition-all hover:scale-105 hover:bg-brand-100 active:scale-95 dark:border-brand-500/30 dark:bg-brand-500/15 dark:text-brand-300 dark:hover:bg-brand-500/25"
          title="Click to view all issues"
        >
          +{issues.length - 1}
        </button>
      )}
    </div>
  );
}

function ProgressBadge({ isFinish }: { isFinish: boolean }) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${
        isFinish
          ? "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/15 dark:text-emerald-400"
          : "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-500/30 dark:bg-amber-500/15 dark:text-amber-400"
      }`}
    >
      <span
        className={`size-1.5 rounded-full ${
          isFinish ? "bg-emerald-500" : "bg-amber-500"
        }`}
      />
      {isFinish ? "Finished" : "In Progress"}
    </span>
  );
}

function StatusBadge({ status }: { status: boolean }) {
  return (
    <span
      className={`inline-flex rounded-full border px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
        status
          ? "border-success-200 bg-success-50 text-success-700 dark:border-success-500/30 dark:bg-success-500/15 dark:text-success-400"
          : "border-error-200 bg-error-50 text-error-700 dark:border-error-500/30 dark:bg-error-500/15 dark:text-error-400"
      }`}
    >
      {status ? "OK" : "NG"}
    </span>
  );
}

function IssueListModal({
  data,
  onClose,
}: {
  data: IssueModalData;
  onClose: () => void;
}) {
  return (
    <Modal className="mx-4 max-w-md overflow-hidden p-0" isOpen={true} onClose={onClose}>
      <div className="border-b border-gray-200 bg-white px-6 py-4 pr-16 dark:border-gray-800 dark:bg-gray-950 sm:pr-20">
        <div className="flex items-start">
          <div className="min-w-0">
            <h3 className="text-base font-bold text-gray-900 dark:text-white">
              {data.title}
            </h3>
            <p className="font-mono text-xs text-gray-500 dark:text-gray-400">
              Serial: {data.serialNumber}
            </p>
            <p className="mt-1 text-xs font-semibold text-brand-600 dark:text-brand-300">
              {data.issues.length} Issues
            </p>
          </div>
        </div>
      </div>

      <div className="max-h-[50vh] overflow-y-auto bg-gray-50 p-6 dark:bg-gray-900">
        <div className="grid grid-cols-1 gap-2">
          {data.issues.map((issue, idx) => (
            <div
              key={idx}
              className="flex items-center justify-between rounded-lg border border-gray-200 bg-white px-3.5 py-2 dark:border-gray-800 dark:bg-gray-950"
            >
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs font-medium text-gray-400">
                  #{idx + 1}
                </span>
                <span className="font-mono text-sm font-bold text-gray-900 dark:text-white">
                  {issue}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="flex justify-end border-t border-gray-200 bg-white px-6 py-3 dark:border-gray-800 dark:bg-gray-950">
        <button
          className="h-8 rounded-lg bg-brand-500 px-4 text-xs font-semibold text-white hover:bg-brand-600 transition-colors"
          onClick={onClose}
          type="button"
        >
          Close
        </button>
      </div>
    </Modal>
  );
}
