"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import DataTable, { DataTableColumn } from "@/components/common/DataTable";
import { useToast } from "@/context/ToastContext";
import { useStockInReworks } from "@/hooks/useStockInReworks";
import {
  StockInRework,
  StockInReworkFinalDisposition,
} from "@/services/StockInReworkService";

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
  return Number.isNaN(date.getTime()) ? "-" : dateFormatter.format(date);
};

const filterInputClassName =
  "h-10 w-[280px] max-w-full rounded-lg border border-gray-300 bg-transparent px-3 py-2 text-sm text-gray-800 outline-none focus:border-brand-300 focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90";

const formatDisposition = (value?: string) =>
  value ? value.replaceAll("_", " ") : "-";

const getDispositionClassName = (value?: string) => {
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

export default function StockInReworkHistoryTable() {
  const toast = useToast();
  const lastErrorRef = useRef<string | null>(null);
  const lastAppliedSearchRef = useRef("");
  const [serialNumberSearch, setSerialNumberSearch] = useState("");

  const {
    data,
    error,
    isLoading,
    pagination,
    setLimit,
    setPage,
    setQuery,
  } = useStockInReworks({
    includeAllDispositions: true,
    limit: 10,
    page: 1,
  });

  useEffect(() => {
    const nextSearch = serialNumberSearch.trim();

    if (nextSearch === lastAppliedSearchRef.current) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      lastAppliedSearchRef.current = nextSearch;
      setQuery({ serialNumberCode: nextSearch });
    }, 500);

    return () => window.clearTimeout(timeoutId);
  }, [serialNumberSearch, setQuery]);

  useEffect(() => {
    if (!error || lastErrorRef.current === error) {
      return;
    }

    lastErrorRef.current = error;
    toast.error({
      message: error,
      title: "Failed to load stock in rework history",
    });
  }, [error, toast]);

  const columns = useMemo<DataTableColumn<StockInRework>[]>(
    () => [
      {
        key: "serialNumberCode",
        header: "Serial Number",
        width: "18%",
        render: (value) => (typeof value === "string" && value ? value : "-"),
      },
      {
        key: "issueNumberBefore",
        header: "Issue Before",
        width: "15%",
      },
      {
        key: "issueNumberAfter",
        header: "Issue After",
        width: "15%",
      },
      {
        key: "qty",
        header: "Qty",
        align: "right",
        width: "8%",
      },
      {
        key: "status",
        header: "Status",
        align: "center",
        width: "10%",
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
        key: "disposition",
        header: "Disposition",
        align: "center",
        width: "13%",
        render: (value) => {
          const disposition =
            typeof value === "string" && value ? value : undefined;

          return (
            <span
              className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${getDispositionClassName(
                disposition
              )}`}
            >
              {formatDisposition(disposition)}
            </span>
          );
        },
      },
      {
        key: "note",
        header: "Note",
        width: "16%",
        render: (value) => (typeof value === "string" && value ? value : "-"),
      },
      {
        key: "createdAt",
        header: "Created At",
        width: "15%",
        render: (value) => (typeof value === "string" ? formatDate(value) : "-"),
      },
      {
        key: "updatedAt",
        header: "Updated At",
        width: "15%",
        render: (value) => (typeof value === "string" ? formatDate(value) : "-"),
      },
    ],
    []
  );

  const historyData = useMemo(
    () => data.filter((item) => isFinalDisposition(item.disposition)),
    [data]
  );

  return (
    <DataTable
      actions={
        <input
          className={filterInputClassName}
          onChange={(event) => setSerialNumberSearch(event.target.value)}
          placeholder="Search Serial Number"
          type="text"
          value={serialNumberSearch}
        />
      }
      columns={columns}
      data={historyData}
      emptyMessage="No stock in rework history found"
      error={error}
      isLoading={isLoading}
      minWidth="1180px"
      onLimitChange={setLimit}
      onPageChange={setPage}
      pagination={pagination}
      rowKey="id"
    />
  );
}
