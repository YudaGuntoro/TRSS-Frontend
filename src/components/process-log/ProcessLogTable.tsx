"use client";

import { formatShortDateTime as formatDate } from "@/utils/formatDateTime";
import DatePicker from "@/components/form/date-picker";
import {
  RefreshActionIcon,
  ResetActionIcon,
} from "@/components/ui/icons/ActionIcons";
import { useToast } from "@/context/ToastContext";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { useProcessLogs } from "@/hooks/useProcessLogs";
import { EyeIcon } from "@/icons";
import { ProcessLogListItem } from "@/services/ProcessLogService";
import Link from "next/link";
import { useEffect, useRef, useState, type FormEvent } from "react";

type StatusFilter = "" | "ok" | "ng";
type FinishFilter = "" | "processing" | "finish";

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

export default function ProcessLogTable() {
  const toast = useToast();
  const lastErrorRef = useRef<string | null>(null);
  const [search, setSearch] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [datePickerKey, setDatePickerKey] = useState(0);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("");
  const [finishFilter, setFinishFilter] = useState<FinishFilter>("");
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

  const applyFilters = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setQuery({
      endDate,
      isFinished: finishFilter === "" ? null : finishFilter === "finish",
      startDate,
      status: statusFilter === "" ? null : statusFilter === "ok",
    });
  };

  const resetFilters = () => {
    setStatusFilter("");
    setFinishFilter("");
    setStartDate("");
    setEndDate("");
    setDatePickerKey((current) => current + 1);
    setQuery({
      endDate: "",
      isFinished: null,
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
    if (!error || lastErrorRef.current === error) {
      return;
    }

    lastErrorRef.current = error;
    toast.error({ title: "Failed to load process logs", message: error });
  }, [error, toast]);

  return (
    <>
      <section className="mx-3 mb-4 mt-4 rounded-xl border border-gray-200 bg-white p-5 dark:border-white/[0.05] dark:bg-white/[0.03] sm:mx-4">
        <h3 className="text-base font-semibold text-gray-800 dark:text-white/90">Filter Process Log</h3>
        <form onSubmit={applyFilters} className="mt-5" aria-label="Process log filters">
          <div className="grid min-w-0 grid-cols-1 items-end gap-4 sm:grid-cols-2 xl:grid-cols-[220px_220px_280px_auto]">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Status
              <select
                className="mt-1 h-10 w-full rounded-lg border border-gray-300 bg-transparent px-3 py-2 text-sm font-medium text-gray-800 outline-none focus:border-brand-300 focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
                onChange={(event) => setStatusFilter(event.target.value as StatusFilter)}
                value={statusFilter}
              >
                <option value="">All Status</option>
                <option value="ok">OK</option>
                <option value="ng">NG</option>
              </select>
            </label>

            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Progress
              <select
                className="mt-1 h-10 w-full rounded-lg border border-gray-300 bg-transparent px-3 py-2 text-sm font-medium text-gray-800 outline-none focus:border-brand-300 focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
                onChange={(event) => setFinishFilter(event.target.value as FinishFilter)}
                value={finishFilter}
              >
                <option value="">All Progress</option>
                <option value="processing">In Progress</option>
                <option value="finish">Finished</option>
              </select>
            </label>

            <DatePicker
              className="h-10 px-3 py-2"
              defaultDate={startDate && endDate ? [startDate, endDate] : startDate}
              id="process-log-date-filter"
              key={`process-log-date-filter-${datePickerKey}`}
              label="Date / Range"
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
                setEndDate(dates.length > 1 ? toDateFilterValue(dates[1]) : "");
              }}
              placeholder="Select date or range"
            />

            <div className="flex flex-wrap items-center gap-3 sm:col-span-2 xl:col-span-1">
              <button type="submit" className="h-10 rounded-lg bg-brand-500 px-5 text-sm font-medium text-white hover:bg-brand-600">Filter</button>
              <button type="button" onClick={resetFilters} className="inline-flex h-10 items-center gap-2 rounded-lg border border-gray-300 px-4 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-white/5">
                <ResetActionIcon className="size-[18px] shrink-0" />Reset Filter
              </button>
              <button
                aria-label="Refresh process logs"
                className="inline-flex size-10 shrink-0 items-center justify-center rounded-lg border border-gray-300 bg-white text-gray-600 leading-none transition-colors hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300 dark:hover:bg-gray-800"
                onClick={refetch}
                title="Refresh"
                type="button"
              >
                <span className="inline-flex size-[18px] items-center justify-center leading-none"><RefreshActionIcon /></span>
              </button>
            </div>
          </div>
        </form>
      </section>

      <div className="mx-3 my-4 overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-white/[0.05] dark:bg-white/[0.03] sm:mx-4">
        <div className="border-b border-gray-100 px-4 py-4 dark:border-white/[0.05] sm:px-5">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex flex-wrap items-center gap-3">
              <label className="flex min-w-0 items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                <span className="shrink-0">Show</span>
                <select
                  className="h-10 min-w-0 flex-1 rounded-lg border border-gray-300 bg-transparent px-3 py-2 text-sm text-gray-800 outline-none focus:border-brand-300 focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 sm:flex-none"
                  onChange={(event) => setLimit(Number(event.target.value))}
                  value={currentLimit}
                >
                  {[10, 25, 50].map((limit) => (
                    <option key={limit} value={limit}>
                      {limit}
                    </option>
                  ))}
                </select>
                <span className="shrink-0">entries</span>
              </label>
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
          {isLoading &&
            data.length === 0 &&
            Array.from({ length: 4 }).map((_, index) => (
              <div
                className="h-32 animate-pulse rounded-lg bg-gray-100 dark:bg-white/[0.05]"
                key={index}
              />
            ))}

          {!isLoading &&
            data.map((log, index) => (
              <ProcessLogMobileCard
                index={(currentPage - 1) * currentLimit + index + 1}
                key={log.id}
                log={log}
              />
            ))}

          {!isLoading && data.length === 0 && (
            <div
              className={`rounded-lg border px-4 py-10 text-center text-sm ${
                error
                  ? "border-error-100 bg-error-50 text-error-600 dark:border-error-500/30 dark:bg-error-500/10 dark:text-error-300"
                  : "border-gray-100 bg-gray-50 text-gray-500 dark:border-gray-800 dark:bg-gray-900/50 dark:text-gray-400"
              }`}
            >
              {error ?? "No process logs found."}
            </div>
          )}
        </div>

        <div className="mx-4 mb-4 mt-2 hidden overflow-hidden rounded-lg border border-gray-100 dark:border-white/[0.05] md:block">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[820px] text-left text-xs">
              <thead className="bg-[#6D8AF3] text-[11px] font-semibold uppercase text-white">
                <tr>
                  <th className="w-16 px-4 py-3 text-center">No</th>
                  <th className="px-4 py-3">Serial Number</th>
                  <th className="px-4 py-3">Type</th>
                  <th className="px-4 py-3 text-center whitespace-nowrap">Progress</th>
                  <th className="px-4 py-3 text-center">Status</th>
                  <th className="px-4 py-3">Timestamp</th>
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
                    <td className="whitespace-nowrap px-4 py-3 text-gray-600 dark:text-gray-300">
                      {formatDate(log.createdAt)}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <Link
                        className="process-log-details-button inline-flex h-8 items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-3 text-xs font-semibold text-brand-600 transition-colors hover:bg-brand-50 dark:border-gray-700 dark:bg-gray-900 dark:text-brand-300 dark:hover:bg-brand-500/10"
                        href={`/process-log/${encodeURIComponent(log.serialNumberCode)}`}
                      >
                        <span className="inline-flex size-4 shrink-0 items-center justify-center overflow-visible">
                          <EyeIcon className="size-4 fill-current" />
                        </span>
                        Detail
                      </Link>
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
      </div>
    </>
  );
}

function ProcessLogMobileCard({
  index,
  log,
}: {
  index: number;
  log: ProcessLogListItem;
}) {
  return (
    <article className="rounded-lg border border-gray-200 bg-white p-3.5 shadow-xs dark:border-gray-800 dark:bg-gray-950">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="rounded-md bg-gray-100 px-2 py-0.5 font-mono text-[11px] font-semibold text-gray-500 dark:bg-gray-800 dark:text-gray-400">
              #{index}
            </span>
            <span className="inline-flex rounded-md border border-gray-200 bg-gray-50 px-2 py-0.5 text-[11px] font-semibold text-gray-700 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300">
              {formatType(log.type)}
            </span>
          </div>
          <p className="mt-2 truncate font-mono text-sm font-bold text-brand-600 dark:text-brand-300">
            {log.serialNumberCode}
          </p>
          <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
            {formatDate(log.createdAt)}
          </p>
        </div>

        <div className="flex shrink-0 flex-col items-end gap-1.5">
          <StatusPill passed={log.status} />
          <ProgressPill finished={log.isFinished} />
        </div>
      </div>

      <Link
        className="mt-3 inline-flex h-9 w-full items-center justify-center gap-1.5 rounded-lg border border-gray-300 bg-white px-3 text-xs font-semibold text-brand-600 shadow-xs transition-colors hover:border-brand-300 hover:bg-brand-50 dark:border-gray-700 dark:bg-gray-900 dark:text-brand-300 dark:hover:bg-brand-500/10"
        href={`/process-log/${encodeURIComponent(log.serialNumberCode)}`}
      >
        <span className="inline-flex size-4 shrink-0 items-center justify-center overflow-visible">
          <EyeIcon className="size-4 fill-current" />
        </span>
        Detail
      </Link>
    </article>
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
