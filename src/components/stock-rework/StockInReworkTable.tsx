"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import DataTable, { DataTableColumn } from "@/components/common/DataTable";
import CreateButton from "@/components/common/CreateButton";
import { useToast } from "@/context/ToastContext";
import { useAuth } from "@/context/AuthContext";
import { useStockInReworks } from "@/hooks/useStockInReworks";
import { StockInRework } from "@/services/StockInReworkService";
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

export default function StockInReworkTable() {
  const toast = useToast();
  const { can } = useAuth();
  const canCreate = can(PERMISSIONS.STOCK_IN_CREATE);
  const lastErrorRef = useRef<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

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
    ],
    []
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
        minWidth="1000px"
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
