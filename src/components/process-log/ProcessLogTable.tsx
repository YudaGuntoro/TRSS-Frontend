"use client";

import { useEffect, useMemo, useRef } from "react";
import DataTable, { DataTableColumn } from "@/components/common/DataTable";
import { useProcessLogs } from "@/hooks/useProcessLogs";
import { ProcessLog } from "@/services/ProcessLogService";
import { useToast } from "@/context/ToastContext";
import { ArrowUpIcon, EyeIcon } from "@/icons";
import { useRouter } from "next/navigation";

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

const getIssueNumbers = (row: ProcessLog) =>
  row.issues
    .map((issue) => issue.issueNumber)
    .filter(Boolean)
    .join(", ") || row.issueNo;

const getStatusLabel = (row: ProcessLog) => {
  if (typeof row.status === "boolean") {
    return row.status ? "OK" : "NG";
  }

  return row.isActive ? "Active" : "Inactive";
};

const filterInputClassName =
  "h-10 w-[224px] max-w-full rounded-lg border border-gray-300 bg-transparent px-3 py-2 text-sm text-gray-800 outline-none focus:border-brand-300 focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90";

export default function ProcessLogTable() {
  const toast = useToast();
  const router = useRouter();
  const lastErrorRef = useRef<string | null>(null);

  const {
    data,
    error,
    isLoading,
    pagination,
    query,
    setLimit,
    setPage,
    setQuery,
  } = useProcessLogs({
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
      title: "Failed to load process logs",
    });
  }, [error, toast]);

  const handleExport = () => {
    toast.info({
      title: "Coming soon",
      message: "Export process logs will be available soon",
    });
  };

  const columns = useMemo<DataTableColumn<ProcessLog>[]>(
    () => [
      {
        key: "serialNumberCode",
        header: "Serial Number",
        width: "20%",
        render: (_, row) => row.serialNumberCode ?? "-",
      },
      {
        key: "issueNo",
        header: "Issue Number",
        width: "28%",
        render: (_, row) => (
          <span className="block max-w-[280px] truncate" title={getIssueNumbers(row)}>
            {getIssueNumbers(row)}
          </span>
        ),
      },
      {
        key: "type",
        header: "Type",
        width: "14%",
        render: (_, row) => row.type ?? "-",
      },
      {
        key: "status",
        header: "Result",
        align: "center",
        width: "12%",
        render: (_, row) => (
          <span
            className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${
              getStatusLabel(row) === "OK" || getStatusLabel(row) === "Active"
                ? "bg-success-50 text-success-700 dark:bg-success-500/15 dark:text-success-400"
                : "bg-error-50 text-error-700 dark:bg-error-500/15 dark:text-error-400"
            }`}
          >
            {getStatusLabel(row)}
          </span>
        ),
      },
      {
        key: "createdAt",
        header: "Created At",
        width: "16%",
        render: (value) => (typeof value === "string" ? formatDate(value) : "-"),
      },
      {
        key: "action",
        header: "Action",
        align: "center",
        width: "10%",
        render: (_, row) => (
          <button
            className="inline-flex h-9 items-center justify-center gap-2 rounded-lg bg-brand-500 px-4 text-sm font-semibold text-white shadow-theme-xs transition-colors hover:bg-brand-600 focus:outline-none focus:ring-3 focus:ring-brand-500/25"
            onClick={() => router.push(`/process-log/${row.id}`)}
            type="button"
          >
            <EyeIcon className="size-4 fill-current" />
            Details
          </button>
        ),
      },
    ],
    [router]
  );

  return (
    <DataTable
      actions={
        <div className="flex flex-wrap items-center gap-3">
          <input
            type="text"
            placeholder="Serial Number"
            className={filterInputClassName}
            value={query.serialNumberCode}
            onChange={(event) =>
              setQuery({ serialNumberCode: event.target.value })
            }
          />

          <button
            className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-[#6D8AF3] px-4 text-sm font-semibold text-white shadow-theme-xs transition-colors hover:bg-[#5f7eea] focus:outline-none focus:ring-3 focus:ring-[#6D8AF3]/25 disabled:cursor-not-allowed disabled:opacity-60"
            disabled={isLoading}
            onClick={handleExport}
            type="button"
          >
            <span className="inline-flex size-4 shrink-0 items-center justify-center">
              <ArrowUpIcon className="size-4" />
            </span>
            <span className="leading-5">Export</span>
          </button>
        </div>
      }
      columns={columns}
      data={data}
      emptyMessage="No process logs found"
      error={error}
      isLoading={isLoading}
      minWidth="900px"
      onLimitChange={setLimit}
      onPageChange={setPage}
      pagination={pagination}
      rowKey="id"
    />
  );
}
