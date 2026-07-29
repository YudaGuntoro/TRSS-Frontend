"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import DataTable, { DataTableColumn } from "@/components/common/DataTable";
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

const dateFormatter = new Intl.DateTimeFormat("en-GB", {
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  month: "short",
  year: "numeric",
});

const formatDate = (value?: string | null) => {
  if (!value) {
    return "-";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "-";
  }

  return dateFormatter.format(date);
};

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

const isReprintableModule = (module: PrintModule) =>
  module === 1 ||
  module === "1" ||
  module === "StockIn" ||
  module === 2 ||
  module === "2" ||
  module === "Clinching";

export default function PrintHistoryTable() {
  const toast = useToast();
  const { can } = useAuth();
  const canReprint = can(PERMISSIONS.PRINT_HISTORY_REPRINT);
  const lastErrorRef = useRef<string | null>(null);
  const [selectedHistory, setSelectedHistory] = useState<PrintHistory | null>(
    null
  );
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
    }
  }, [reprintingId]);

  const handleConfirmReprint = useCallback(async () => {
    if (!selectedHistory) {
      return;
    }

    setReprintingId(selectedHistory.id);
    try {
      await PrintHistoryService.reprint(selectedHistory.id);

      toast.success({
        message: "Reprint request completed successfully",
        title: "Success",
      });
      setSelectedHistory(null);
      refetch();
    } catch (reprintError: unknown) {
      toast.error({
        message:
          reprintError instanceof Error
            ? reprintError.message
            : "Failed to reprint label",
        title: "Failed to reprint",
      });
    } finally {
      setReprintingId(null);
    }
  }, [refetch, selectedHistory, toast]);

  const columns = useMemo<DataTableColumn<PrintHistory>[]>(
    () => [
      {
        key: "module",
        header: "Module",
        width: "150px",
        render: (value) => {
          const printModule = value as PrintModule;

          return (
            <span
              className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${getModuleClassName(
                printModule
              )}`}
            >
              {formatModule(printModule)}
            </span>
          );
        },
      },
      {
        key: "referenceNumber",
        header: "Reference",
        width: "180px",
        render: (_, row) => (
          <span className="font-medium text-gray-800 dark:text-white/90">
            {getReferenceLabel(row)}
          </span>
        ),
      },
      {
        key: "printerName",
        header: "Printer",
        width: "180px",
        render: (value) =>
          typeof value === "string" && value ? (
            <span className="block max-w-[220px] truncate" title={value}>
              {value}
            </span>
          ) : (
            "-"
          ),
      },
      {
        key: "status",
        header: "Status",
        align: "center",
        width: "120px",
        render: (value) => {
          const status = value as PrintStatus;

          return (
            <span
              className={`inline-flex min-w-20 justify-center rounded-full px-2.5 py-1 text-xs font-semibold ${getStatusClassName(
                status
              )}`}
            >
              {formatStatus(status)}
            </span>
          );
        },
      },
      {
        key: "retryCount",
        header: "Retries",
        align: "right",
        width: "90px",
      },
      {
        key: "createdAt",
        header: "Created At",
        width: "170px",
        render: (value) => (typeof value === "string" ? formatDate(value) : "-"),
      },
      {
        key: "lastRetryAt",
        header: "Last Retry",
        width: "170px",
        render: (value) => (typeof value === "string" ? formatDate(value) : "-"),
      },
      {
        key: "errorMessage",
        header: "Error",
        width: "260px",
        render: (value) =>
          typeof value === "string" && value ? (
            <span
              className="block max-w-[300px] truncate text-error-600 dark:text-error-400"
              title={value}
            >
              {value}
            </span>
          ) : (
            "-"
          ),
      },
      {
        key: "action",
        header: "Action",
        align: "center",
        className: "px-3",
        headerClassName: "px-3",
        width: "150px",
        render: (_, row) => {
          const isReprintable =
            canReprint &&
            isReprintableModule(row.module) &&
            Boolean(row.referenceNumber);

          return canReprint ? (
            <button
              className="inline-flex h-9 min-w-[86px] items-center justify-center whitespace-nowrap rounded-lg bg-brand-500 px-3 text-sm font-semibold text-white shadow-theme-xs transition-colors hover:bg-brand-600 focus:outline-none focus:ring-3 focus:ring-brand-500/25 disabled:cursor-not-allowed disabled:opacity-60"
              disabled={reprintingId !== null || !isReprintable}
              onClick={() => setSelectedHistory(row)}
              title={
                isReprintable
                  ? "Reprint label"
                  : "Reprint is unavailable for this record"
              }
              type="button"
            >
              Reprint
            </button>
          ) : (
            "-"
          );
        },
      },
    ],
    [canReprint, reprintingId]
  );

  return (
    <>
      <DataTable
        columns={columns}
        data={data}
        emptyMessage="No print history found"
        error={error}
        isLoading={isLoading}
        minWidth="1250px"
        onLimitChange={setLimit}
        onPageChange={setPage}
        onSearchChange={(value) => setQuery({ search: value })}
        pagination={pagination}
        rowKey="id"
        searchPlaceholder="Reference or printer"
        searchValue={query.search}
      />

      <ConfirmModal
        confirmText="Reprint"
        isLoading={reprintingId !== null}
        isOpen={Boolean(selectedHistory)}
        message={`Reprint label for ${selectedHistory ? getReferenceLabel(selectedHistory) : "this record"}?`}
        onClose={closeReprintModal}
        onConfirm={handleConfirmReprint}
        title="Confirm Reprint"
      />
    </>
  );
}
