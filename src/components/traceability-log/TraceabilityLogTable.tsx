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
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

type StatusFilter = "" | "ok" | "ng";


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
  const [issueModal, setIssueModal] = useState<{
    title: string;
    serialNumber: string;
    issues: string[];
  } | null>(null);
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

  return (
    <div className="mx-4 my-4 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-xs dark:border-white/[0.05] dark:bg-white/[0.03]">
      {/* Filter / Controls Header */}
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
                {[10, 25, 50, 100].map((limit) => (
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
              <option value="ok">Status OK</option>
              <option value="ng">Status NG</option>
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

      {/* Simple Clean Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
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
                  {(() => {
                    const issues = log.issueNumbersClinching;
                    if (!issues || issues.length === 0) {
                      return <span className="text-gray-400 italic font-normal">-</span>;
                    }
                    return (
                      <div className="flex items-center gap-1 whitespace-nowrap">
                        <span className="inline-flex items-center rounded-md border border-gray-200 bg-gray-50 px-2 py-0.5 font-mono text-[11px] font-semibold text-gray-700 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300">
                          {issues[0]}
                        </span>
                        {issues.length > 1 && (
                          <button
                            type="button"
                            onClick={() =>
                              setIssueModal({
                                title: "Clinching Issue Numbers",
                                serialNumber: log.serialNumberClinching || "-",
                                issues,
                              })
                            }
                            className="inline-flex items-center rounded-full border border-brand-200 bg-brand-50 px-1.5 py-0.5 font-mono text-[10px] font-bold text-brand-700 hover:bg-brand-100 hover:scale-105 active:scale-95 transition-all cursor-pointer dark:border-brand-500/30 dark:bg-brand-500/15 dark:text-brand-300 dark:hover:bg-brand-500/25"
                            title="Click to view all issues"
                          >
                            +{issues.length - 1}
                          </button>
                        )}
                      </div>
                    );
                  })()}
                </td>

                <td className="whitespace-nowrap px-4 py-3">
                  {(() => {
                    const issues = log.issueNumbersMfan;
                    if (!issues || issues.length === 0) {
                      return <span className="text-gray-400 italic font-normal">-</span>;
                    }
                    return (
                      <div className="flex items-center gap-1 whitespace-nowrap">
                        <span className="inline-flex items-center rounded-md border border-gray-200 bg-gray-50 px-2 py-0.5 font-mono text-[11px] font-semibold text-gray-700 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300">
                          {issues[0]}
                        </span>
                        {issues.length > 1 && (
                          <button
                            type="button"
                            onClick={() =>
                              setIssueModal({
                                title: "M-Fan Issue Numbers",
                                serialNumber: log.serialNumberMFan || "-",
                                issues,
                              })
                            }
                            className="inline-flex items-center rounded-full border border-brand-200 bg-brand-50 px-1.5 py-0.5 font-mono text-[10px] font-bold text-brand-700 hover:bg-brand-100 hover:scale-105 active:scale-95 transition-all cursor-pointer dark:border-brand-500/30 dark:bg-brand-500/15 dark:text-brand-300 dark:hover:bg-brand-500/25"
                            title="Click to view all issues"
                          >
                            +{issues.length - 1}
                          </button>
                        )}
                      </div>
                    );
                  })()}
                </td>

                <td className="px-4 py-3 text-center">
                  <span
                    className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${
                      log.isFinish
                        ? "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/15 dark:text-emerald-400"
                        : "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-500/30 dark:bg-amber-500/15 dark:text-amber-400"
                    }`}
                  >
                    <span
                      className={`size-1.5 rounded-full ${
                        log.isFinish ? "bg-emerald-500" : "bg-amber-500"
                      }`}
                    />
                    {log.isFinish ? "Finished" : "In Progress"}
                  </span>
                </td>

                <td className="px-4 py-3 text-center">
                  <span
                    className={`inline-flex rounded-full border px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                      log.status
                        ? "border-success-200 bg-success-50 text-success-700 dark:border-success-500/30 dark:bg-success-500/15 dark:text-success-400"
                        : "border-error-200 bg-error-50 text-error-700 dark:border-error-500/30 dark:bg-error-500/15 dark:text-error-400"
                    }`}
                  >
                    {log.status ? "OK" : "NG"}
                  </span>
                </td>

                <td className="px-4 py-3 text-center">
                  <button
                    className="inline-flex h-8 items-center justify-center gap-1.5 rounded-lg border border-gray-300 bg-white px-3 text-xs font-semibold text-brand-600 shadow-xs transition-colors hover:bg-brand-50 hover:border-brand-300 dark:border-gray-700 dark:bg-gray-900 dark:text-brand-300 dark:hover:bg-brand-500/10"
                    onClick={() =>
                      router.push(
                        `/traceability-log/${encodeURIComponent(
                          log.serialNumberClinching || String(log.id)
                        )}`
                      )
                    }
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

      {issueModal && (
        <IssueListModal
          data={issueModal}
          onClose={() => setIssueModal(null)}
        />
      )}
    </div>
  );
}

function IssueListModal({
  data,
  onClose,
}: {
  data: { title: string; serialNumber: string; issues: string[] };
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
