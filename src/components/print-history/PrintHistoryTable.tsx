"use client";

import { formatShortDateTime as formatDate } from "@/utils/formatDateTime";
import { useCallback, useEffect, useRef, useState } from "react";
import { ConfirmModal } from "@/components/ui/modal/ConfirmModal";
import { useToast } from "@/context/ToastContext";
import { usePrintHistories } from "@/hooks/usePrintHistories";
import PrintHistoryService, {
  PrintHistory,
  PrintModule,
  PrintStatus,
} from "@/services/PrintHistoryService";
import { PERMISSIONS } from "@/utils/auth";
import { useAuth } from "@/context/AuthContext";


const formatModule = (module: PrintModule) => {
  if (module === 1 || module === "1" || module === "StockIn") {
    return "Stock In";
  }

  if (module === 2 || module === "2" || module === "Clinching") {
    return "Clinching";
  }

  if (module === 3 || module === "3" || module === "MFanAssy") {
    return "M Fan Assy";
  }

  return String(module).replaceAll("_", " ");
};

const isSuccessStatus = (status: PrintStatus) =>
  status === 1 || status === "1" || status === "Success";

const formatStatus = (status: PrintStatus) =>
  isSuccessStatus(status) ? "Success" : "Failed";

const getModuleClassName = (module: PrintModule) => {
  if (module === 1 || module === "1" || module === "StockIn") {
    return "bg-blue-light-50 text-blue-light-700 dark:bg-blue-light-500/15 dark:text-blue-light-400";
  }

  if (module === 2 || module === "2" || module === "Clinching") {
    return "bg-brand-50 text-brand-700 dark:bg-brand-500/15 dark:text-brand-300";
  }

  return "bg-gray-100 text-gray-700 dark:bg-white/[0.08] dark:text-gray-300";
};

const getStatusClassName = (status: PrintStatus) =>
  isSuccessStatus(status)
    ? "bg-success-50 text-success-700 dark:bg-success-500/15 dark:text-success-400"
    : "bg-error-50 text-error-700 dark:bg-error-500/15 dark:text-error-400";

const getReferenceLabel = (row: PrintHistory) =>
  row.referenceNumber || (row.referenceId ? String(row.referenceId) : "-");

const getErrorMessage = (error: unknown, fallbackMessage: string) =>
  error instanceof Error && error.message ? error.message : fallbackMessage;

const getPageNumbers = (currentPage: number, totalPage: number) => {
  const pageNumbers: number[] = [];
  const start = Math.max(1, currentPage - 1);
  const end = Math.min(totalPage, currentPage + 1);

  for (let page = start; page <= end; page += 1) {
    pageNumbers.push(page);
  }

  return pageNumbers;
};

export default function PrintHistoryTable() {
  const toast = useToast();
  const { can } = useAuth();
  const canReprint = can(PERMISSIONS.PRINT_HISTORY_REPRINT);
  const lastErrorRef = useRef<string | null>(null);
  const [selectedHistory, setSelectedHistory] = useState<PrintHistory | null>(
    null
  );
  const [reprintError, setReprintError] = useState<string | null>(null);
  const [reprintingId, setReprintingId] = useState<number | null>(null);

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
  } = usePrintHistories({
    limit: 10,
    page: 1,
  });
  const currentPage = pagination?.page ?? query.page;
  const currentLimit = pagination?.limit ?? query.limit;
  const totalPage = pagination?.totalPage ?? 1;
  const total = pagination?.total ?? data.length;
  const firstItem = data.length > 0 ? (currentPage - 1) * currentLimit + 1 : 0;
  const lastItem = data.length > 0 ? firstItem + data.length - 1 : 0;
  const pageNumbers = getPageNumbers(currentPage, totalPage);

  useEffect(() => {
    if (!error || lastErrorRef.current === error) {
      return;
    }

    lastErrorRef.current = error;
    toast.error({
      message: error,
      title: "Failed to load print histories",
    });
  }, [error, toast]);

  const closeReprintModal = useCallback(() => {
    if (reprintingId === null) {
      setSelectedHistory(null);
      setReprintError(null);
    }
  }, [reprintingId]);

  const handleConfirmReprint = useCallback(async () => {
    if (!selectedHistory) {
      return;
    }

    setReprintingId(selectedHistory.id);
    setReprintError(null);
    try {
      const response = await PrintHistoryService.reprint(selectedHistory.id);

      if (response.success === false) {
        throw new Error(response.message || "Failed to reprint label");
      }

      toast.success({
        message:
          response.message || "Reprint request completed successfully",
        title: "Success",
      });
      setSelectedHistory(null);
      setReprintError(null);
      void refetch();
    } catch (reprintError: unknown) {
      const message = getErrorMessage(reprintError, "Failed to reprint label");

      setReprintError(message);
      toast.error({
        message,
        title: "Failed to reprint",
      });
    } finally {
      setReprintingId(null);
    }
  }, [refetch, selectedHistory, toast]);

  return (
    <>
      <div className="mx-3 my-4 overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-white/[0.05] dark:bg-white/[0.03] sm:mx-4">
        <div className="border-b border-gray-100 px-4 py-4 dark:border-white/[0.05] sm:px-5">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <label className="flex min-w-0 items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
              <span className="shrink-0">Show</span>
              <select
                className="h-10 w-24 rounded-lg border border-gray-300 bg-transparent px-3 py-2 text-sm text-gray-800 outline-none focus:border-brand-300 focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
                onChange={(event) => setLimit(Number(event.target.value))}
                value={currentLimit}
              >
                {[10, 25, 50, 100].map((limit) => (
                  <option key={limit} value={limit}>
                    {limit}
                  </option>
                ))}
              </select>
              <span className="shrink-0">entries</span>
            </label>

            <label className="flex min-w-0 flex-col gap-1.5 text-sm text-gray-700 dark:text-gray-300 sm:flex-row sm:items-center sm:gap-2">
              <span className="shrink-0">Search</span>
              <input
                className="h-10 w-full rounded-lg border border-gray-300 bg-transparent px-3 py-2 text-sm text-gray-800 outline-none placeholder:text-gray-400 focus:border-brand-300 focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 lg:w-72"
                onChange={(event) => setQuery({ search: event.target.value })}
                placeholder="Reference or printer"
                value={query.search}
              />
            </label>
          </div>
        </div>

        <div className="space-y-3 p-3 md:hidden">
          {isLoading &&
            data.length === 0 &&
            Array.from({ length: 5 }).map((_, index) => (
              <div
                className="h-36 animate-pulse rounded-lg bg-gray-100 dark:bg-white/[0.05]"
                key={index}
              />
            ))}

          {!isLoading &&
            !error &&
            data.map((history) => (
              <PrintHistoryMobileCard
                canReprint={canReprint}
                history={history}
                isReprinting={reprintingId !== null}
                key={history.id}
                onReprint={() => setSelectedHistory(history)}
              />
            ))}

          {!isLoading && error && (
            <div className="rounded-lg border border-error-100 bg-error-50 px-4 py-10 text-center text-sm text-error-600 dark:border-error-500/30 dark:bg-error-500/10 dark:text-error-300">
              {error}
            </div>
          )}

          {!isLoading && !error && data.length === 0 && (
            <div className="rounded-lg border border-gray-100 bg-gray-50 px-4 py-10 text-center text-sm text-gray-500 dark:border-gray-800 dark:bg-gray-900/50 dark:text-gray-400">
              No print history found
            </div>
          )}
        </div>

        <div className="hidden overflow-x-auto md:block">
          <table className="min-w-[1250px] w-full text-left text-xs">
            <thead className="bg-[#6D8AF3] text-[11px] font-semibold uppercase text-white">
              <tr>
                <th className="px-5 py-3">Module</th>
                <th className="px-5 py-3">Reference</th>
                <th className="px-5 py-3">Printer</th>
                <th className="px-5 py-3 text-center">Status</th>
                <th className="px-5 py-3 text-right">Retries</th>
                <th className="px-5 py-3 whitespace-nowrap">Created At</th>
                <th className="px-5 py-3 whitespace-nowrap">Last Retry</th>
                <th className="px-5 py-3">Error</th>
                <th className="px-5 py-3 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-white/[0.05]">
              {isLoading &&
                data.length === 0 &&
                Array.from({ length: currentLimit }).map((_, rowIndex) => (
                  <tr key={`loading-${rowIndex}`}>
                    {Array.from({ length: 9 }).map((_, cellIndex) => (
                      <td className="px-5 py-4" key={cellIndex}>
                        <div className="h-4 w-full animate-pulse rounded bg-gray-100 dark:bg-white/[0.05]" />
                      </td>
                    ))}
                  </tr>
                ))}

              {!isLoading && error && (
                <tr>
                  <td
                    className="px-5 py-8 text-center text-sm text-error-600 dark:text-error-400"
                    colSpan={9}
                  >
                    {error}
                  </td>
                </tr>
              )}

              {!isLoading && !error && data.length === 0 && (
                <tr>
                  <td
                    className="px-5 py-8 text-center text-sm text-gray-500 dark:text-gray-400"
                    colSpan={9}
                  >
                    No print history found
                  </td>
                </tr>
              )}

              {!isLoading &&
                !error &&
                data.map((history) => (
                  <tr
                    className="hover:bg-gray-50/70 dark:hover:bg-white/[0.03]"
                    key={history.id}
                  >
                    <td className="px-5 py-4">
                      <ModuleBadge module={history.module} />
                    </td>
                    <td className="px-5 py-4 font-mono font-semibold text-gray-800 dark:text-white/90">
                      {getReferenceLabel(history)}
                    </td>
                    <td className="px-5 py-4 text-gray-700 dark:text-gray-300">
                      <span className="block max-w-[220px] truncate" title={history.printerName || "-"}>
                        {history.printerName || "-"}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-center">
                      <StatusBadge status={history.status} />
                    </td>
                    <td className="px-5 py-4 text-right font-mono text-gray-700 dark:text-gray-300">
                      {history.retryCount}
                    </td>
                    <td className="whitespace-nowrap px-5 py-4 text-gray-700 dark:text-gray-300">
                      {formatDate(history.createdAt)}
                    </td>
                    <td className="whitespace-nowrap px-5 py-4 text-gray-700 dark:text-gray-300">
                      {history.lastRetryAt ? formatDate(history.lastRetryAt) : "-"}
                    </td>
                    <td className="px-5 py-4">
                      {history.errorMessage ? (
                        <span
                          className="block max-w-[300px] truncate text-error-600 dark:text-error-400"
                          title={history.errorMessage}
                        >
                          {history.errorMessage}
                        </span>
                      ) : (
                        <span className="text-gray-500 dark:text-gray-400">-</span>
                      )}
                    </td>
                    <td className="px-5 py-4 text-center">
                      {canReprint ? (
                        <ReprintButton
                          disabled={reprintingId !== null}
                          onClick={() => setSelectedHistory(history)}
                        />
                      ) : (
                        "-"
                      )}
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
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

      <ConfirmModal
        confirmText="Reprint"
        isLoading={reprintingId !== null}
        isOpen={Boolean(selectedHistory)}
        errorMessage={reprintError}
        message={`Reprint label for ${selectedHistory ? getReferenceLabel(selectedHistory) : "this record"}?`}
        onClose={closeReprintModal}
        onConfirm={handleConfirmReprint}
        title="Confirm Reprint"
      />
    </>
  );
}

function PrintHistoryMobileCard({
  canReprint,
  history,
  isReprinting,
  onReprint,
}: {
  canReprint: boolean;
  history: PrintHistory;
  isReprinting: boolean;
  onReprint: () => void;
}) {
  return (
    <article className="rounded-lg border border-gray-200 bg-white p-3 shadow-xs dark:border-gray-800 dark:bg-gray-950">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <ModuleBadge module={history.module} />
          <p className="mt-2 truncate font-mono text-sm font-bold text-gray-900 dark:text-white">
            {getReferenceLabel(history)}
          </p>
          <p className="mt-0.5 truncate text-xs text-gray-500 dark:text-gray-400">
            {history.printerName || "Printer: -"}
          </p>
        </div>
        <StatusBadge status={history.status} />
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2 rounded-lg border border-gray-100 bg-gray-50/70 p-3 dark:border-gray-800 dark:bg-gray-900/50">
        <Metric label="Retries" value={history.retryCount} />
        <Metric label="Created" value={formatDate(history.createdAt)} />
        <Metric
          label="Last Retry"
          value={history.lastRetryAt ? formatDate(history.lastRetryAt) : "-"}
          wide
        />
        {history.errorMessage && (
          <div className="col-span-2">
            <p className="text-[11px] font-semibold uppercase text-gray-400">
              Error
            </p>
            <p className="mt-0.5 line-clamp-2 text-xs font-semibold text-error-600 dark:text-error-400">
              {history.errorMessage}
            </p>
          </div>
        )}
      </div>

      {canReprint && (
        <ReprintButton
          className="mt-3 w-full"
          disabled={isReprinting}
          onClick={onReprint}
        />
      )}
    </article>
  );
}

function ModuleBadge({ module }: { module: PrintModule }) {
  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${getModuleClassName(
        module
      )}`}
    >
      {formatModule(module)}
    </span>
  );
}

function StatusBadge({ status }: { status: PrintStatus }) {
  return (
    <span
      className={`inline-flex min-w-20 justify-center rounded-full px-2.5 py-1 text-xs font-semibold ${getStatusClassName(
        status
      )}`}
    >
      {formatStatus(status)}
    </span>
  );
}

function Metric({
  label,
  value,
  wide = false,
}: {
  label: string;
  value: string | number;
  wide?: boolean;
}) {
  return (
    <div className={wide ? "col-span-2" : ""}>
      <p className="text-[11px] font-semibold uppercase text-gray-400">
        {label}
      </p>
      <p className="mt-0.5 truncate font-mono text-xs font-semibold text-gray-800 dark:text-gray-200">
        {value}
      </p>
    </div>
  );
}

function ReprintButton({
  className = "",
  disabled,
  onClick,
}: {
  className?: string;
  disabled: boolean;
  onClick: () => void;
}) {
  return (
    <button
      className={`inline-flex h-9 min-w-[86px] items-center justify-center whitespace-nowrap rounded-lg bg-brand-500 px-3 text-sm font-semibold text-white shadow-theme-xs transition-colors hover:bg-brand-600 focus:outline-none focus:ring-3 focus:ring-brand-500/25 disabled:cursor-not-allowed disabled:opacity-60 ${className}`}
      disabled={disabled}
      onClick={onClick}
      title="Reprint label"
      type="button"
    >
      Reprint
    </button>
  );
}
