"use client";

import { formatShortDateTime as formatDate } from "@/utils/formatDateTime";
import { useEffect, useRef, useState } from "react";
import CreateButton from "@/components/common/CreateButton";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { useStockIns } from "@/hooks/useStockIns";
import StockInService, { StockIn } from "@/services/StockInService";
import { useToast } from "@/context/ToastContext";
import { PencilIcon, TrashBinIcon } from "@/icons";
import { ConfirmModal } from "@/components/ui/modal";
import StockInModal from "./StockInModal";
import DatePicker from "@/components/form/date-picker";
import { useAuth } from "@/context/AuthContext";
import { PERMISSIONS } from "@/utils/auth";


const getErrorMessage = (error: unknown, fallback: string) =>
  error instanceof Error ? error.message : fallback;

const getIssueNumbers = (stockIn?: StockIn | null) =>
  stockIn?.issues.map((issue) => issue.number).join(", ") || "-";

const filterInputClassName =
  "h-10 w-full rounded-lg border border-gray-300 bg-transparent px-3 py-2 text-sm text-gray-800 outline-none focus:border-brand-300 focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90";

const getPageNumbers = (currentPage: number, totalPage: number) => {
  const pageNumbers: number[] = [];
  const start = Math.max(1, currentPage - 1);
  const end = Math.min(totalPage, currentPage + 1);

  for (let page = start; page <= end; page += 1) {
    pageNumbers.push(page);
  }

  return pageNumbers;
};

export default function StockInTable() {
  const toast = useToast();
  const { can } = useAuth();
  const lastErrorRef = useRef<string | null>(null);
  const canCreate = can(PERMISSIONS.STOCK_IN_CREATE);
  const canEdit = can(PERMISSIONS.STOCK_IN_EDIT);
  const canDelete = can(PERMISSIONS.STOCK_IN_DELETE);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedStockIn, setSelectedStockIn] = useState<StockIn | null>(null);

  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [stockInToDelete, setStockInToDelete] = useState<StockIn | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [issueNumberSearch, setIssueNumberSearch] = useState("");
  const [partNumberSearch, setPartNumberSearch] = useState("");
  const debouncedIssueNumberSearch = useDebouncedValue(issueNumberSearch, 500);
  const debouncedPartNumberSearch = useDebouncedValue(partNumberSearch, 500);

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
  } = useStockIns({
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
    if (!error || lastErrorRef.current === error) return;
    lastErrorRef.current = error;
    toast.error({
      message: error,
      title: "Failed to load stock ins",
    });
  }, [error, toast]);

  useEffect(() => {
    if (
      (query.issueNumber ?? "") === debouncedIssueNumberSearch &&
      (query.partNumber ?? "") === debouncedPartNumberSearch
    ) {
      return;
    }

    setQuery({
      issueNumber: debouncedIssueNumberSearch || undefined,
      partNumber: debouncedPartNumberSearch || undefined,
    });
  }, [
    debouncedIssueNumberSearch,
    debouncedPartNumberSearch,
    query.issueNumber,
    query.partNumber,
    setQuery,
  ]);

  const handleCreate = () => {
    setSelectedStockIn(null);
    setIsModalOpen(true);
  };

  const handleUpdate = (stockIn: StockIn) => {
    setSelectedStockIn(stockIn);
    setIsModalOpen(true);
  };

  const handleDeleteClick = (stockIn: StockIn) => {
    setStockInToDelete(stockIn);
    setIsDeleteModalOpen(true);
  };

  const confirmDelete = async () => {
    if (!stockInToDelete) return;
    setIsDeleting(true);
    try {
      await StockInService.deleteStockIn(stockInToDelete.id);
      toast.success({
        title: "Success",
        message: "Stock in record deleted successfully",
      });
      refetch();
      setIsDeleteModalOpen(false);
      setStockInToDelete(null);
    } catch (err: unknown) {
      toast.error({
        title: "Error",
        message: getErrorMessage(err, "Failed to delete stock in record"),
      });
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <>
      <div className="mx-3 my-4 overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-white/[0.05] dark:bg-white/[0.03] sm:mx-4">
        <div className="border-b border-gray-100 px-4 py-4 dark:border-white/[0.05] sm:px-5">
          <div className="flex flex-col gap-3">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
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

              {canCreate && (
                <div className="w-full shrink-0 sm:w-auto">
                  <CreateButton className="w-full sm:w-auto" onClick={handleCreate} />
                </div>
              )}
            </div>

            <div className="grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-[300px_300px_320px]">
              <input
                type="text"
                placeholder="Part Number"
                className={filterInputClassName}
                value={partNumberSearch}
                onChange={(e) => setPartNumberSearch(e.target.value)}
              />

              <input
                type="text"
                placeholder="Issue Number"
                className={filterInputClassName}
                value={issueNumberSearch}
                onChange={(e) => setIssueNumberSearch(e.target.value)}
              />

              <label className="grid min-w-0 grid-cols-[auto_minmax(0,1fr)] items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                <span className="shrink-0">Date</span>
                <DatePicker
                  id="stock-in-date-filter"
                  className={`${filterInputClassName} pr-10`}
                  defaultDate={query.date}
                  onChange={([date]) => {
                    if (date) {
                      const formattedDate = date.toISOString().split("T")[0];
                      setQuery({ date: formattedDate });
                    } else {
                      setQuery({ date: undefined });
                    }
                  }}
                  placeholder="Select date"
                />
              </label>
            </div>
          </div>
        </div>

        <div className="space-y-3 p-3 md:hidden">
          {isLoading &&
            data.length === 0 &&
            Array.from({ length: 4 }).map((_, index) => (
              <div
                className="h-36 animate-pulse rounded-lg bg-gray-100 dark:bg-white/[0.05]"
                key={index}
              />
            ))}

          {!isLoading &&
            !error &&
            data.map((stockIn) => (
              <StockInMobileCard
                canDelete={canDelete}
                canEdit={canEdit}
                key={stockIn.id}
                onDelete={() => handleDeleteClick(stockIn)}
                onEdit={() => handleUpdate(stockIn)}
                stockIn={stockIn}
              />
            ))}

          {!isLoading && error && (
            <div className="rounded-lg border border-error-100 bg-error-50 px-4 py-10 text-center text-sm text-error-600 dark:border-error-500/30 dark:bg-error-500/10 dark:text-error-300">
              {error}
            </div>
          )}

          {!isLoading && !error && data.length === 0 && (
            <div className="rounded-lg border border-gray-100 bg-gray-50 px-4 py-10 text-center text-sm text-gray-500 dark:border-gray-800 dark:bg-gray-900/50 dark:text-gray-400">
              No stock in records found
            </div>
          )}
        </div>

        <div className="hidden overflow-x-auto md:block">
          <table className="min-w-[1000px] w-full text-left text-xs">
            <thead className="bg-[#6D8AF3] text-[11px] font-semibold uppercase text-white">
              <tr>
                <th className="px-5 py-3">Issue Number</th>
                <th className="px-5 py-3">Part Number</th>
                <th className="px-5 py-3">Part Name</th>
                <th className="px-5 py-3 text-right">Supply Qty</th>
                <th className="px-5 py-3 text-right">Receipt Qty</th>
                <th className="px-5 py-3 whitespace-nowrap">Supply Date</th>
                <th className="px-5 py-3 whitespace-nowrap">Receipt Date</th>
                {(canEdit || canDelete) && (
                  <th className="px-5 py-3 text-center">Action</th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-white/[0.05]">
              {isLoading &&
                data.length === 0 &&
                Array.from({ length: currentLimit }).map((_, rowIndex) => (
                  <tr key={`loading-${rowIndex}`}>
                    {Array.from({ length: canEdit || canDelete ? 8 : 7 }).map(
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
                    colSpan={canEdit || canDelete ? 8 : 7}
                  >
                    {error}
                  </td>
                </tr>
              )}

              {!isLoading && !error && data.length === 0 && (
                <tr>
                  <td
                    className="px-5 py-8 text-center text-sm text-gray-500 dark:text-gray-400"
                    colSpan={canEdit || canDelete ? 8 : 7}
                  >
                    No stock in records found
                  </td>
                </tr>
              )}

              {!isLoading &&
                !error &&
                data.map((stockIn) => (
                  <tr
                    className="hover:bg-gray-50/70 dark:hover:bg-white/[0.03]"
                    key={stockIn.id}
                  >
                    <td className="px-5 py-4">
                      <IssueBadges stockIn={stockIn} />
                    </td>
                    <td className="px-5 py-4 font-mono text-gray-700 dark:text-gray-300">
                      {stockIn.part?.number || "-"}
                    </td>
                    <td className="px-5 py-4 text-gray-700 dark:text-gray-300">
                      <span className="line-clamp-2">{stockIn.part?.name || "-"}</span>
                    </td>
                    <td className="px-5 py-4 text-right font-mono text-gray-700 dark:text-gray-300">
                      {stockIn.supplyQty}
                    </td>
                    <td className="px-5 py-4 text-right font-mono text-gray-700 dark:text-gray-300">
                      {stockIn.receiptQty}
                    </td>
                    <td className="whitespace-nowrap px-5 py-4 text-gray-700 dark:text-gray-300">
                      {formatDate(stockIn.supplyDate)}
                    </td>
                    <td className="whitespace-nowrap px-5 py-4 text-gray-700 dark:text-gray-300">
                      {formatDate(stockIn.receiptDate)}
                    </td>
                    {(canEdit || canDelete) && (
                      <td className="px-5 py-4">
                        <RowActions
                          canDelete={canDelete}
                          canEdit={canEdit}
                          onDelete={() => handleDeleteClick(stockIn)}
                          onEdit={() => handleUpdate(stockIn)}
                        />
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

      {(canCreate || canEdit) && (
        <StockInModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          onSuccess={refetch}
          stockIn={selectedStockIn}
        />
      )}

      {canDelete && (
        <ConfirmModal
          isOpen={isDeleteModalOpen}
          onClose={() => !isDeleting && setIsDeleteModalOpen(false)}
          onConfirm={confirmDelete}
          title="Delete Stock In"
          message={`Are you sure you want to delete stock in record "${getIssueNumbers(stockInToDelete)}"?`}
          confirmText="Delete"
          isDestructive={true}
          isLoading={isDeleting}
        />
      )}
    </>
  );
}

function StockInMobileCard({
  canDelete,
  canEdit,
  onDelete,
  onEdit,
  stockIn,
}: {
  canDelete: boolean;
  canEdit: boolean;
  onDelete: () => void;
  onEdit: () => void;
  stockIn: StockIn;
}) {
  return (
    <article className="rounded-lg border border-gray-200 bg-white p-3.5 shadow-xs dark:border-gray-800 dark:bg-gray-950">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <IssueBadges stockIn={stockIn} />
          <p className="mt-2 font-mono text-sm font-bold text-gray-900 dark:text-white">
            {stockIn.part?.number || "-"}
          </p>
          <p className="mt-0.5 line-clamp-2 text-xs text-gray-500 dark:text-gray-400">
            {stockIn.part?.name || "-"}
          </p>
        </div>

        {(canEdit || canDelete) && (
          <RowActions
            canDelete={canDelete}
            canEdit={canEdit}
            onDelete={onDelete}
            onEdit={onEdit}
          />
        )}
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2 rounded-lg border border-gray-100 bg-gray-50/70 p-3 dark:border-gray-800 dark:bg-gray-900/50">
        <Metric label="Supply Qty" value={stockIn.supplyQty} />
        <Metric label="Receipt Qty" value={stockIn.receiptQty} />
        <Metric label="Supply Date" value={formatDate(stockIn.supplyDate)} wide />
        <Metric label="Receipt Date" value={formatDate(stockIn.receiptDate)} wide />
      </div>
    </article>
  );
}

function IssueBadges({ stockIn }: { stockIn: StockIn }) {
  if (stockIn.issues.length === 0) {
    return <span className="text-gray-400">-</span>;
  }

  return (
    <div className="flex min-w-0 flex-wrap gap-1">
      {stockIn.issues.map((issue) => (
        <span
          key={issue.id}
          className="inline-flex max-w-full items-center rounded bg-gray-100 px-2 py-0.5 font-mono text-xs font-medium text-gray-800 dark:bg-gray-700 dark:text-gray-300"
        >
          <span className="truncate">{issue.number}</span>
        </span>
      ))}
    </div>
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

function RowActions({
  canDelete,
  canEdit,
  onDelete,
  onEdit,
}: {
  canDelete: boolean;
  canEdit: boolean;
  onDelete: () => void;
  onEdit: () => void;
}) {
  return (
    <div className="flex items-center justify-center gap-3">
      {canEdit && (
        <button
          onClick={onEdit}
          className="text-warning-500 transition-colors hover:text-warning-600 dark:text-warning-400 dark:hover:text-warning-500"
          title="Edit"
          type="button"
        >
          <PencilIcon className="h-5 w-5 fill-current" />
        </button>
      )}
      {canDelete && (
        <button
          onClick={onDelete}
          className="text-error-500 transition-colors hover:text-error-600 dark:text-error-400 dark:hover:text-error-500"
          title="Delete"
          type="button"
        >
          <TrashBinIcon className="h-5 w-5 fill-current" />
        </button>
      )}
    </div>
  );
}
