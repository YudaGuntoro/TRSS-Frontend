"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import DataTable, { DataTableColumn } from "@/components/common/DataTable";
import CreateButton from "@/components/common/CreateButton";
import { useToast } from "@/context/ToastContext";
import { useAuth } from "@/context/AuthContext";
import { useStockInReworks } from "@/hooks/useStockInReworks";
import StockInReworkService, {
  StockInRework,
  StockInReworkFinalDisposition,
} from "@/services/StockInReworkService";
import { PERMISSIONS } from "@/utils/auth";
import StockInReworkModal from "./StockInReworkModal";

const dateFormatter = new Intl.DateTimeFormat("en-GB", {
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  month: "short",
  year: "numeric",
});

const formatDate = (value: string) => {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "-";
  }

  return dateFormatter.format(date);
};

const filterInputClassName =
  "h-10 w-[260px] max-w-full rounded-lg border border-gray-300 bg-transparent px-3 py-2 text-sm text-gray-800 outline-none focus:border-brand-300 focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90";

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

export default function StockInReworkTable() {
  const toast = useToast();
  const { can } = useAuth();
  const canCreate = can(PERMISSIONS.STOCK_IN_CREATE);
  const canUpdate = can(PERMISSIONS.STOCK_IN_EDIT);
  const lastErrorRef = useRef<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedDispositions, setSelectedDispositions] = useState<
    Record<number, StockInReworkFinalDisposition | "">
  >({});
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

  const columns = useMemo<DataTableColumn<StockInRework>[]>(
    () => [
      {
        key: "serialNumberCode",
        header: "Serial Number",
        render: (value) => (typeof value === "string" && value ? value : "-"),
      },
      {
        key: "issueNumberBefore",
        header: "Issue Before",
      },
      {
        key: "issueNumberAfter",
        header: "Issue After",
      },
      {
        key: "qty",
        header: "Qty",
        align: "right",
      },
      {
        key: "status",
        header: "Status",
        align: "center",
        render: (value) => {
          const isOk = Boolean(value);

          return (
            <span
              className={`inline-flex min-w-14 justify-center rounded-full px-2.5 py-1 text-xs font-semibold ${
                isOk
                  ? "bg-success-50 text-success-700 dark:bg-success-500/15 dark:text-success-400"
                  : "bg-error-50 text-error-700 dark:bg-error-500/15 dark:text-error-400"
              }`}
            >
              {isOk ? "OK" : "NG"}
            </span>
          );
        },
      },
      {
        key: "note",
        header: "Note",
        render: (value) => (typeof value === "string" && value ? value : "-"),
      },
      {
        key: "createdAt",
        header: "Created At",
        render: (value) => (typeof value === "string" ? formatDate(value) : "-"),
      },
      {
        key: "disposition",
        header: "Final Disposition",
        align: "center",
        render: (value, row) => {
          const disposition = typeof value === "string" ? value : undefined;

          if (isFinalDisposition(disposition) || !canUpdate) {
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

          const selectedDisposition = selectedDispositions[row.id] ?? "";
          const isUpdating = updatingId === row.id;

          return (
            <div className="flex min-w-[230px] items-center justify-center gap-2">
              <select
                className={dispositionSelectClassName}
                disabled={isUpdating}
                onChange={(event) =>
                  handleDispositionChange(
                    row.id,
                    event.target.value as StockInReworkFinalDisposition | ""
                  )
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
                onClick={() => handleUpdateDisposition(row)}
                type="button"
              >
                {isUpdating ? "Saving..." : "Submit"}
              </button>
            </div>
          );
        },
      },
    ],
    [
      canUpdate,
      handleDispositionChange,
      handleUpdateDisposition,
      selectedDispositions,
      updatingId,
    ]
  );

  return (
    <>
      <DataTable
        actions={
          <div className="flex flex-wrap items-center gap-3">
            <input
              className={filterInputClassName}
              onChange={(event) =>
                setQuery({ serialNumberCode: event.target.value })
              }
              placeholder="Filter by Serial Number"
              type="text"
              value={query.serialNumberCode}
            />

            {canCreate && (
              <CreateButton onClick={() => setIsModalOpen(true)} />
            )}
          </div>
        }
        columns={columns}
        data={data}
        emptyMessage="No stock in rework records found"
        error={error}
        isLoading={isLoading}
        minWidth="1240px"
        onLimitChange={setLimit}
        onPageChange={setPage}
        pagination={pagination}
        rowKey="id"
      />

      {canCreate && (
        <StockInReworkModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          onSuccess={refetch}
        />
      )}
    </>
  );
}
