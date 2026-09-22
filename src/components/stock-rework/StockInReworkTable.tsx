"use client";

import { formatShortDateTime as formatDate } from "@/utils/formatDateTime";
import { useCallback, useEffect, useRef, useState } from "react";
import CreateButton from "@/components/common/CreateButton";
import { ConfirmModal } from "@/components/ui/modal";
import { useToast } from "@/context/ToastContext";
import { useAuth } from "@/context/AuthContext";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { useStockInReworks } from "@/hooks/useStockInReworks";
import StockInReworkService, {
  StockInRework,
  StockInReworkDispositionFilter,
  StockInReworkFinalDisposition,
} from "@/services/StockInReworkService";
import { PERMISSIONS } from "@/utils/auth";
import StockInReworkModal from "./StockInReworkModal";


const filterInputClassName =
  "h-10 w-full rounded-lg border border-gray-300 bg-transparent px-3 py-2 text-sm text-gray-800 outline-none focus:border-brand-300 focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 lg:w-[260px]";

const filterSelectClassName =
  "h-10 w-full rounded-lg border border-gray-300 bg-transparent px-3 py-2 text-sm text-gray-800 outline-none focus:border-brand-300 focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 sm:w-auto";

const dispositionSelectClassName =
  "h-9 rounded-lg border border-gray-300 bg-transparent px-3 py-1.5 text-sm text-gray-800 outline-none focus:border-brand-300 focus:ring-3 focus:ring-brand-500/10 disabled:cursor-not-allowed disabled:opacity-60 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90";

const formatDisposition = (value?: string | null) =>
  value ? value.replaceAll("_", " ") : "-";

const getDispositionClassName = (value?: string | null) => {
  if (value === "STOCK_IN") {
    return "bg-success-50 text-success-700 dark:bg-success-500/15 dark:text-success-400";
  }

  if (value === "SCRAP") {
    return "bg-error-50 text-error-700 dark:bg-error-500/15 dark:text-error-400";
  }

  return "bg-warning-50 text-warning-600 dark:bg-warning-500/15 dark:text-warning-400";
};

const isFinalDisposition = (
  value?: string | null
): value is StockInReworkFinalDisposition =>
  value === "STOCK_IN" || value === "SCRAP";

const getPageNumbers = (currentPage: number, totalPage: number) => {
  const pageNumbers: number[] = [];
  const start = Math.max(1, currentPage - 1);
  const end = Math.min(totalPage, currentPage + 1);

  for (let page = start; page <= end; page += 1) {
    pageNumbers.push(page);
  }

  return pageNumbers;
};

export default function StockInReworkTable() {
  const toast = useToast();
  const { can } = useAuth();
  const canCreate = can(PERMISSIONS.STOCK_IN_REWORK_CREATE);
  const canUpdate = can(PERMISSIONS.STOCK_IN_REWORK_DISPOSITION);
  const lastErrorRef = useRef<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedDispositions, setSelectedDispositions] = useState<
    Record<number, StockInReworkFinalDisposition | "">
  >({});
  const [pendingSubmitRow, setPendingSubmitRow] =
    useState<StockInRework | null>(null);
  const [serialNumberSearch, setSerialNumberSearch] = useState("");
  const debouncedSerialNumberSearch = useDebouncedValue(
    serialNumberSearch.trim(),
    500
  );
  const [updatingId, setUpdatingId] = useState<number | null>(null);

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
  } = useStockInReworks({
    limit: 10,
    page: 1,
  });
  const isAllMode = query.disposition === "ALL";
  const isHistoryMode = isAllMode || isFinalDisposition(query.disposition);
  const currentPage = pagination?.page ?? query.page;
  const currentLimit = pagination?.limit ?? query.limit;
  const totalPage = pagination?.totalPage ?? 1;
  const total = pagination?.total ?? data.length;
  const firstItem = data.length > 0 ? (currentPage - 1) * currentLimit + 1 : 0;
  const lastItem = data.length > 0 ? firstItem + data.length - 1 : 0;
  const pageNumbers = getPageNumbers(currentPage, totalPage);
  const emptyMessage = isAllMode
    ? "No stock in rework records found"
    : isHistoryMode
      ? "No stock in rework history found"
      : "No stock in rework records found";

  useEffect(() => {
    if (debouncedSerialNumberSearch === query.serialNumberCode) {
      return;
    }

    setQuery({ serialNumberCode: debouncedSerialNumberSearch });
  }, [debouncedSerialNumberSearch, query.serialNumberCode, setQuery]);

  useEffect(() => {
    if (!error || lastErrorRef.current === error) {
      return;
    }

    lastErrorRef.current = error;
    toast.error({
      message: error,
      title: "Failed to load stock in reworks",
    });
  }, [error, toast]);

  const handleDispositionChange = useCallback(
    (id: number, disposition: StockInReworkFinalDisposition | "") => {
      setSelectedDispositions((current) => ({
        ...current,
        [id]: disposition,
      }));
    },
    []
  );

  const handleSubmitClick = useCallback(
    (row: StockInRework) => {
      const disposition = selectedDispositions[row.id];

      if (!disposition) {
        toast.error({
          message: "Please select Stock In or Scrap",
          title: "Disposition is required",
        });
        return;
      }

      setPendingSubmitRow(row);
    },
    [selectedDispositions, toast]
  );

  const handleUpdateDisposition = useCallback(
    async (row: StockInRework) => {
      const disposition = selectedDispositions[row.id];

      if (!disposition) {
        toast.error({
          message: "Please select Stock In or Scrap",
          title: "Disposition is required",
        });
        return;
      }

      setUpdatingId(row.id);
      try {
        await StockInReworkService.updateStockInReworkDisposition(row.id, {
          disposition,
        });

        setSelectedDispositions((current) => {
          const next = { ...current };
          delete next[row.id];
          return next;
        });
        toast.success({
          message: "Stock in rework disposition updated successfully",
          title: "Success",
        });
        setPendingSubmitRow(null);
        refetch();
      } catch (updateError: unknown) {
        toast.error({
          message:
            updateError instanceof Error
              ? updateError.message
              : "Failed to update stock in rework disposition",
          title: "Failed to update disposition",
        });
      } finally {
        setUpdatingId(null);
      }
    },
    [refetch, selectedDispositions, toast]
  );

  const closeSubmitModal = useCallback(() => {
    if (updatingId === null) {
      setPendingSubmitRow(null);
    }
  }, [updatingId]);

  const confirmSubmitDisposition = useCallback(() => {
    if (pendingSubmitRow) {
      void handleUpdateDisposition(pendingSubmitRow);
    }
  }, [handleUpdateDisposition, pendingSubmitRow]);

  return (
    <>
      <div className="mx-3 my-4 overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-white/[0.05] dark:bg-white/[0.03] sm:mx-4">
        <div className="border-b border-gray-100 px-4 py-4 dark:border-white/[0.05] sm:px-5">
          <div className="grid grid-cols-1 gap-3 lg:flex lg:flex-wrap lg:items-center">
            <label className="flex min-w-0 items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
              <span className="shrink-0">Show</span>
              <select
                className="h-10 min-w-0 flex-1 rounded-lg border border-gray-300 bg-transparent px-3 py-2 text-sm text-gray-800 outline-none focus:border-brand-300 focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 sm:flex-none"
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

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:flex lg:flex-wrap lg:items-center">
            <input
              className={filterInputClassName}
              onChange={(event) => setSerialNumberSearch(event.target.value)}
              placeholder="Filter by Serial Number"
              type="text"
              value={serialNumberSearch}
            />

            <select
              className={filterSelectClassName}
              onChange={(event) =>
                setQuery({
                  disposition: event.target
                    .value as StockInReworkDispositionFilter,
                })
              }
              value={query.disposition}
            >
              <option value="ALL">All</option>
              <option value="">Pending</option>
              <option value="STOCK_IN">Stock In</option>
              <option value="SCRAP">Scrap</option>
            </select>

            {canCreate && !isHistoryMode && (
              <div className="sm:col-span-2 lg:col-span-1">
                <CreateButton onClick={() => setIsModalOpen(true)} />
              </div>
            )}
          </div>
          </div>
        </div>

        <div className="space-y-3 p-3 md:hidden">
          {isLoading &&
            data.length === 0 &&
            Array.from({ length: 4 }).map((_, index) => (
              <div
                className="h-40 animate-pulse rounded-lg bg-gray-100 dark:bg-white/[0.05]"
                key={index}
              />
            ))}

          {!isLoading &&
            !error &&
            data.map((row) => (
              <StockInReworkMobileCard
                canUpdate={canUpdate}
                isHistoryMode={isHistoryMode}
                isUpdating={updatingId === row.id}
                key={row.id}
                onDispositionChange={(disposition) =>
                  handleDispositionChange(row.id, disposition)
                }
                onSubmit={() => handleSubmitClick(row)}
                row={row}
                selectedDisposition={selectedDispositions[row.id] ?? ""}
              />
            ))}

          {!isLoading && error && (
            <div className="rounded-lg border border-error-100 bg-error-50 px-4 py-10 text-center text-sm text-error-600 dark:border-error-500/30 dark:bg-error-500/10 dark:text-error-300">
              {error}
            </div>
          )}

          {!isLoading && !error && data.length === 0 && (
            <div className="rounded-lg border border-gray-100 bg-gray-50 px-4 py-10 text-center text-sm text-gray-500 dark:border-gray-800 dark:bg-gray-900/50 dark:text-gray-400">
              {emptyMessage}
            </div>
          )}
        </div>

        <div className="hidden overflow-x-auto md:block">
          <table
            className={`w-full text-left text-xs ${
              isHistoryMode ? "min-w-[1160px]" : "min-w-[1080px]"
            }`}
          >
            <thead className="bg-[#6D8AF3] text-[11px] font-semibold uppercase text-white">
              <tr>
                <th className="px-5 py-3">Serial Number</th>
                <th className="px-5 py-3">Issue Before</th>
                <th className="px-5 py-3 text-right">Qty</th>
                <th className="px-5 py-3 text-center">Status</th>
                <th className="px-5 py-3">Note</th>
                <th className="px-5 py-3 whitespace-nowrap">Created At</th>
                <th className="px-5 py-3 text-center">
                  {isHistoryMode ? "Disposition" : "Final Disposition"}
                </th>
                {isHistoryMode && (
                  <th className="px-5 py-3 whitespace-nowrap">Updated At</th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-white/[0.05]">
              {isLoading &&
                data.length === 0 &&
                Array.from({ length: currentLimit }).map((_, rowIndex) => (
                  <tr key={`loading-${rowIndex}`}>
                    {Array.from({ length: isHistoryMode ? 8 : 7 }).map(
                      (_, cellIndex) => (
                        <td className="px-5 py-4" key={cellIndex}>
                          <div className="h-4 w-full animate-pulse rounded bg-gray-100 dark:bg-white/[0.05]" />
                        </td>
                      )
                    )}
                  </tr>
                ))}

              {!isLoading && error && (
                <tr>
                  <td
                    className="px-5 py-8 text-center text-sm text-error-600 dark:text-error-400"
                    colSpan={isHistoryMode ? 8 : 7}
                  >
                    {error}
                  </td>
                </tr>
              )}

              {!isLoading && !error && data.length === 0 && (
                <tr>
                  <td
                    className="px-5 py-8 text-center text-sm text-gray-500 dark:text-gray-400"
                    colSpan={isHistoryMode ? 8 : 7}
                  >
                    {emptyMessage}
                  </td>
                </tr>
              )}

              {!isLoading &&
                !error &&
                data.map((row) => (
                  <tr
                    className="hover:bg-gray-50/70 dark:hover:bg-white/[0.03]"
                    key={row.id}
                  >
                    <td className="px-5 py-4 font-mono font-semibold text-brand-600 dark:text-brand-300">
                      {row.serialNumberCode || "-"}
                    </td>
                    <td className="px-5 py-4 font-mono text-gray-700 dark:text-gray-300">
                      {row.issueNumberBefore || "-"}
                    </td>
                    <td className="px-5 py-4 text-right font-mono text-gray-700 dark:text-gray-300">
                      {row.qty}
                    </td>
                    <td className="px-5 py-4 text-center">
                      <StatusBadge status={row.status} />
                    </td>
                    <td className="px-5 py-4 text-gray-700 dark:text-gray-300">
                      <span className="line-clamp-2">{row.note || "-"}</span>
                    </td>
                    <td className="whitespace-nowrap px-5 py-4 text-gray-700 dark:text-gray-300">
                      {formatDate(row.createdAt)}
                    </td>
                    <td className="px-5 py-4 text-center">
                      <DispositionControl
                        canUpdate={canUpdate}
                        isHistoryMode={isHistoryMode}
                        isUpdating={updatingId === row.id}
                        onChange={(disposition) =>
                          handleDispositionChange(row.id, disposition)
                        }
                        onSubmit={() => handleSubmitClick(row)}
                        row={row}
                        selectedDisposition={selectedDispositions[row.id] ?? ""}
                      />
                    </td>
                    {isHistoryMode && (
                      <td className="whitespace-nowrap px-5 py-4 text-gray-700 dark:text-gray-300">
                        {row.updatedAt ? formatDate(row.updatedAt) : "-"}
                      </td>
                    )}
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

      {canCreate && (
        <StockInReworkModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          onSuccess={refetch}
        />
      )}

      <ConfirmModal
        confirmText="Submit"
        isLoading={updatingId !== null}
        isOpen={Boolean(pendingSubmitRow)}
        message="Apakah anda yakin akan submit? Data yang sudah di submit tidak dapat dirubah kembali."
        onClose={closeSubmitModal}
        onConfirm={confirmSubmitDisposition}
        title="Konfirmasi Submit"
      />
    </>
  );
}

function StockInReworkMobileCard({
  canUpdate,
  isHistoryMode,
  isUpdating,
  onDispositionChange,
  onSubmit,
  row,
  selectedDisposition,
}: {
  canUpdate: boolean;
  isHistoryMode: boolean;
  isUpdating: boolean;
  onDispositionChange: (value: StockInReworkFinalDisposition | "") => void;
  onSubmit: () => void;
  row: StockInRework;
  selectedDisposition: StockInReworkFinalDisposition | "";
}) {
  return (
    <article className="rounded-lg border border-gray-200 bg-white p-3.5 shadow-xs dark:border-gray-800 dark:bg-gray-950">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate font-mono text-sm font-bold text-brand-600 dark:text-brand-300">
            {row.serialNumberCode || "-"}
          </p>
          <p className="mt-0.5 truncate font-mono text-xs text-gray-500 dark:text-gray-400">
            Issue: {row.issueNumberBefore || "-"}
          </p>
        </div>
        <StatusBadge status={row.status} />
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2 rounded-lg border border-gray-100 bg-gray-50/70 p-3 dark:border-gray-800 dark:bg-gray-900/50">
        <Metric label="Qty" value={row.qty} />
        <Metric label="Created" value={formatDate(row.createdAt)} />
        <Metric label="Note" value={row.note || "-"} wide />
        {isHistoryMode && (
          <Metric
            label="Updated"
            value={row.updatedAt ? formatDate(row.updatedAt) : "-"}
            wide
          />
        )}
      </div>

      <div className="mt-3">
        <p className="mb-1 text-[11px] font-semibold uppercase text-gray-400">
          {isHistoryMode ? "Disposition" : "Final Disposition"}
        </p>
        <DispositionControl
          canUpdate={canUpdate}
          isHistoryMode={isHistoryMode}
          isUpdating={isUpdating}
          onChange={onDispositionChange}
          onSubmit={onSubmit}
          row={row}
          selectedDisposition={selectedDisposition}
          stacked
        />
      </div>
    </article>
  );
}

function StatusBadge({ status }: { status: boolean }) {
  return (
    <span
      className={`inline-flex min-w-14 justify-center rounded-full px-2.5 py-1 text-xs font-semibold ${
        status
          ? "bg-success-50 text-success-700 dark:bg-success-500/15 dark:text-success-400"
          : "bg-error-50 text-error-700 dark:bg-error-500/15 dark:text-error-400"
      }`}
    >
      {status ? "OK" : "NG"}
    </span>
  );
}

function DispositionControl({
  canUpdate,
  isHistoryMode,
  isUpdating,
  onChange,
  onSubmit,
  row,
  selectedDisposition,
  stacked = false,
}: {
  canUpdate: boolean;
  isHistoryMode: boolean;
  isUpdating: boolean;
  onChange: (value: StockInReworkFinalDisposition | "") => void;
  onSubmit: () => void;
  row: StockInRework;
  selectedDisposition: StockInReworkFinalDisposition | "";
  stacked?: boolean;
}) {
  const disposition =
    typeof row.disposition === "string" ? row.disposition : undefined;

  if (isHistoryMode || isFinalDisposition(disposition) || !canUpdate) {
    return <DispositionBadge disposition={disposition} />;
  }

  return (
    <div
      className={
        stacked
          ? "grid grid-cols-1 gap-2"
          : "flex min-w-[230px] items-center justify-center gap-2"
      }
    >
      <select
        className={`${dispositionSelectClassName} ${stacked ? "w-full" : ""}`}
        disabled={isUpdating}
        onChange={(event) =>
          onChange(event.target.value as StockInReworkFinalDisposition | "")
        }
        value={selectedDisposition}
      >
        <option value="">Select</option>
        <option value="STOCK_IN">Stock In</option>
        <option value="SCRAP">Scrap</option>
      </select>
      <button
        className="h-9 rounded-lg bg-brand-500 px-3 text-sm font-medium text-white transition-colors hover:bg-brand-600 disabled:cursor-not-allowed disabled:opacity-50"
        disabled={!selectedDisposition || isUpdating}
        onClick={onSubmit}
        type="button"
      >
        {isUpdating ? "Saving..." : "Submit"}
      </button>
    </div>
  );
}

function DispositionBadge({
  disposition,
}: {
  disposition?: string | null;
}) {
  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${getDispositionClassName(
        disposition
      )}`}
    >
      {formatDisposition(disposition)}
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
