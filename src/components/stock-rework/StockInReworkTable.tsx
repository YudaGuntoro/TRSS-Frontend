"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import DataTable, { DataTableColumn } from "@/components/common/DataTable";
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

const filterSelectClassName =
  "h-10 rounded-lg border border-gray-300 bg-transparent px-3 py-2 text-sm text-gray-800 outline-none focus:border-brand-300 focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90";

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
        header: isHistoryMode ? "Disposition" : "Final Disposition",
        align: "center",
        render: (value, row) => {
          const disposition = typeof value === "string" ? value : undefined;

          if (isHistoryMode || isFinalDisposition(disposition) || !canUpdate) {
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
                onClick={() => handleSubmitClick(row)}
                type="button"
              >
                {isUpdating ? "Saving..." : "Submit"}
              </button>
            </div>
          );
        },
      },
      ...(isHistoryMode
        ? [
            {
              key: "updatedAt",
              header: "Updated At",
              render: (value) =>
                typeof value === "string" ? formatDate(value) : "-",
            } satisfies DataTableColumn<StockInRework>,
          ]
        : []),
    ],
    [
      canUpdate,
      handleDispositionChange,
      handleSubmitClick,
      isHistoryMode,
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
              <CreateButton onClick={() => setIsModalOpen(true)} />
            )}
          </div>
        }
        columns={columns}
        data={data}
        emptyMessage={
          isAllMode
            ? "No stock in rework records found"
            : isHistoryMode
              ? "No stock in rework history found"
              : "No stock in rework records found"
        }
        error={error}
        isLoading={isLoading}
        minWidth={isHistoryMode ? "1320px" : "1240px"}
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

      <ConfirmModal
        confirmText="Submit"
        isLoading={updatingId !== null}
        isOpen={Boolean(pendingSubmitRow)}
        message="Apakah anda yakin akan submit? Data yang sudah di submit tidak dapat dirubah kembali kecuali atas izin Lord Agoeng Kasuari."
        onClose={closeSubmitModal}
        onConfirm={confirmSubmitDisposition}
        title="Konfirmasi Submit"
      />
    </>
  );
}
