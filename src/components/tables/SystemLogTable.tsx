"use client";

import { useEffect, useRef, useState } from "react";
import DataTable, { DataTableColumn } from "@/components/common/DataTable";
import DatePicker from "@/components/form/date-picker";
import Badge from "@/components/ui/badge/Badge";
import Button from "@/components/ui/button/Button";
import { Modal } from "@/components/ui/modal";
import { useToast } from "@/context/ToastContext";
import { CloseIcon, RefreshIcon } from "@/icons";
import { ApiListResponse } from "@/services/ParameterService";
import SystemLogService, {
  SYSTEM_LOG_LEVELS,
  SYSTEM_LOG_SORT_ORDERS,
  SystemLog,
  SystemLogQuery,
} from "@/services/SystemLogService";

const initialQuery: SystemLogQuery = {
  page: 1,
  limit: 10,
  date: "",
  startDate: "",
  endDate: "",
  level: "",
  service: "",
  category: "",
  search: "",
  sortOrder: "desc",
};

const inputClass =
  "mt-1 h-11 w-full rounded-lg border border-gray-300 bg-transparent px-3 text-sm text-gray-800 outline-none focus:border-cyan-400 focus:ring-3 focus:ring-cyan-400/20 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90";
const datePickerClass =
  "mt-1 h-11 w-full rounded-lg border border-gray-300 bg-transparent px-3 pr-10 text-sm text-gray-800 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90";
const filterFieldClass = "shrink-0 text-sm text-gray-700 dark:text-gray-300";
const iconButtonClass =
  "inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-lg transition disabled:cursor-not-allowed disabled:opacity-50";

const dateFormatter = new Intl.DateTimeFormat("en-GB", {
  day: "2-digit",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
});

const formatDate = (value: string | null) => {
  const date = value ? new Date(value) : null;
  return date && !Number.isNaN(date.getTime()) ? dateFormatter.format(date) : "-";
};

const getLevelColor = (level: string) => {
  switch (level.toUpperCase()) {
    case "ERR":
    case "FTL":
      return "error";
    case "WRN":
      return "warning";
    case "DBG":
    case "VRB":
      return "info";
    default:
      return "success";
  }
};

function SystemLogDetail({ id }: { id: string }) {
  const [retry, setRetry] = useState(0);
  const [result, setResult] = useState<{ retry: number; data?: SystemLog; error?: string }>();
  const [copyMessage, setCopyMessage] = useState("");

  useEffect(() => {
    const controller = new AbortController();
    SystemLogService.getLog(id, { signal: controller.signal }).then(
      (data) => {
        if (!controller.signal.aborted) setResult({ retry, data });
      },
      (error: unknown) => {
        if (!controller.signal.aborted) {
          setResult({
            retry,
            error: error instanceof Error ? error.message : "Failed to load system log detail.",
          });
        }
      }
    );
    return () => controller.abort();
  }, [id, retry]);

  if (!result || result.retry !== retry) {
    return <p role="status" className="py-6">Loading system log detail...</p>;
  }

  if (result.error || !result.data) {
    return (
      <div role="alert" className="space-y-3 py-6">
        <p>Failed to load system log detail.</p>
        <p className="text-sm">{result.error}</p>
        <Button size="sm" onClick={() => setRetry((value) => value + 1)}>
          Retry
        </Button>
      </div>
    );
  }

  const log = result.data;
  const fields = [
    ["ID", log.id],
    ["Timestamp", formatDate(log.timestamp)],
    ["Level", log.level],
    ["Service", log.service],
    ["Environment", log.environment],
    ["Category", log.category],
    ["Correlation ID", log.correlationId],
    ["Request ID", log.requestId],
    ["User ID", log.userId],
    ["Source File", log.sourceFile],
  ];

  return (
    <div className="space-y-5 pt-5">
      <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {fields.map(([label, value]) => (
          <div key={label}>
            <dt className="text-sm text-gray-500 dark:text-gray-400">{label}</dt>
            <dd className="mt-1 whitespace-pre-wrap break-words text-sm">{value || "-"}</dd>
          </div>
        ))}
      </dl>
      <div>
        <div className="mb-2 flex items-center justify-between gap-3">
          <h3 className="font-medium">Message</h3>
          <Button
            size="sm"
            variant="outline"
            disabled={!log.message}
            onClick={async () => {
              try {
                await navigator.clipboard.writeText(log.message);
                setCopyMessage("Message copied.");
              } catch {
                setCopyMessage("Unable to copy. Select and copy the message manually.");
              }
            }}
          >
            Copy message
          </Button>
        </div>
        <p role="status" className="mb-2 text-sm">{copyMessage}</p>
        <pre tabIndex={0} className="max-h-80 overflow-auto whitespace-pre-wrap break-all rounded-lg bg-gray-100 p-4 text-xs dark:bg-gray-800">
          {log.message || "-"}
        </pre>
      </div>
    </div>
  );
}

export default function SystemLogTable() {
  const toast = useToast();
  const lastToastErrorRef = useRef<string | null>(null);
  const [query, setQuery] = useState(initialQuery);
  const [retry, setRetry] = useState(0);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [result, setResult] = useState<{
    query: SystemLogQuery;
    retry: number;
    response?: ApiListResponse<SystemLog>;
    error?: string;
  }>();

  const validationError =
    query.startDate && query.endDate && query.startDate > query.endDate
      ? "Start Date must be on or before End Date."
      : "";

  useEffect(() => {
    if (validationError) return;
    const controller = new AbortController();
    SystemLogService.getLogs(query, { signal: controller.signal }).then(
      (response) => {
        if (!controller.signal.aborted) setResult({ query, retry, response });
      },
      (error: unknown) => {
        if (!controller.signal.aborted) {
          setResult({
            query,
            retry,
            error: error instanceof Error ? error.message : "Failed to load system logs.",
          });
        }
      }
    );
    return () => controller.abort();
  }, [query, retry, validationError]);

  const currentResult = result?.query === query && result.retry === retry ? result : undefined;
  const isLoading = !validationError && !currentResult;
  const tableError = validationError || null;

  useEffect(() => {
    if (!currentResult?.error || validationError) return;
    const toastKey = `${JSON.stringify(currentResult.query)}:${currentResult.retry}:${currentResult.error}`;
    if (lastToastErrorRef.current === toastKey) return;
    lastToastErrorRef.current = toastKey;
    toast.error({
      title: "Failed to load system logs",
      message: currentResult.error,
    });
  }, [currentResult, toast, validationError]);

  const updateFilters = (next: Partial<SystemLogQuery>) =>
    setQuery((current) => ({ ...current, ...next, page: 1 }));

  const columns: DataTableColumn<SystemLog>[] = [
    { key: "timestamp", header: "Timestamp", render: (_, row) => formatDate(row.timestamp), width: "170px" },
    {
      key: "level",
      header: "Level",
      render: (_, row) => <Badge color={getLevelColor(row.level)}>{row.level || "-"}</Badge>,
      width: "100px",
    },
    { key: "service", header: "Service", className: "max-w-[220px] break-words" },
    { key: "environment", header: "Environment", width: "130px" },
    { key: "category", header: "Category", className: "max-w-[180px] break-words" },
    { key: "message", header: "Message", className: "max-w-md truncate" },
    { key: "sourceFile", header: "Source File", className: "max-w-[180px] break-words" },
    {
      key: "action",
      header: "Action",
      render: (_, row) => (
        <Button size="sm" variant="outline" onClick={() => setSelectedId(row.id)}>
          Detail
        </Button>
      ),
      width: "100px",
    },
  ];

  return (
    <>
      <div className="mx-4 overflow-x-auto rounded-xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03]">
        <div className="flex min-w-max items-end gap-4">
          <label className={`${filterFieldClass} w-[130px]`}>
            Level
            <select
              className={inputClass}
              value={query.level}
              onChange={(event) => updateFilters({ level: event.target.value as SystemLogQuery["level"] })}
            >
              <option value="">All</option>
              {SYSTEM_LOG_LEVELS.map((level) => (
                <option key={level} value={level}>
                  {level}
                </option>
              ))}
            </select>
          </label>
          <div className={`${filterFieldClass} w-[250px]`}>
            <span>Date</span>
            <DatePicker
              id="system-date-filter"
              className={datePickerClass}
              defaultDate={query.startDate && query.endDate ? [query.startDate, query.endDate] : query.date}
              mode="range"
              onChange={(dates) => {
                const formattedDates = dates.map((date) => date.toISOString().split("T")[0]);
                if (formattedDates.length > 1) {
                  updateFilters({ date: "", startDate: formattedDates[0], endDate: formattedDates[1] });
                }
              }}
              onClose={(dates) => {
                if (dates.length === 1) {
                  updateFilters({ date: dates[0].toISOString().split("T")[0], startDate: "", endDate: "" });
                }
              }}
              placeholder="Select date or range"
            />
          </div>
          <label className={`${filterFieldClass} w-[210px]`}>
            Service
            <input
              className={inputClass}
              placeholder="API, Worker, Backup"
              value={query.service}
              onChange={(event) => updateFilters({ service: event.target.value })}
            />
          </label>
          <label className={`${filterFieldClass} w-[180px]`}>
            Category
            <input
              className={inputClass}
              placeholder="Category"
              value={query.category}
              onChange={(event) => updateFilters({ category: event.target.value })}
            />
          </label>
          <label className={`${filterFieldClass} w-[220px]`}>
            Search
            <input
              className={inputClass}
              placeholder="Message, request, user"
              value={query.search}
              onChange={(event) => updateFilters({ search: event.target.value })}
            />
          </label>
          <label className={`${filterFieldClass} w-[130px]`}>
            Sort
            <select
              className={inputClass}
              value={query.sortOrder}
              onChange={(event) => updateFilters({ sortOrder: event.target.value as SystemLogQuery["sortOrder"] })}
            >
              {SYSTEM_LOG_SORT_ORDERS.map((sortOrder) => (
                <option key={sortOrder} value={sortOrder}>
                  {sortOrder.toUpperCase()}
                </option>
              ))}
            </select>
          </label>
          <button
            aria-label="Reset filters"
            className={`${iconButtonClass} bg-white text-gray-700 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 dark:bg-gray-800 dark:text-gray-400 dark:ring-gray-700 dark:hover:bg-white/[0.03] dark:hover:text-gray-300`}
            onClick={() => updateFilters(initialQuery)}
            title="Reset filters"
            type="button"
          >
            <CloseIcon className="size-5" />
          </button>
          <button
            aria-label={currentResult?.error && !validationError ? "Retry" : "Refresh logs"}
            className={`${iconButtonClass} bg-brand-500 text-white shadow-theme-xs hover:bg-brand-600`}
            disabled={Boolean(validationError)}
            onClick={() => setRetry((value) => value + 1)}
            title={currentResult?.error && !validationError ? "Retry" : "Refresh logs"}
            type="button"
          >
            <RefreshIcon className="size-5" />
          </button>
        </div>
      </div>
      <DataTable
        columns={columns}
        data={validationError ? [] : currentResult?.response?.data ?? []}
        emptyMessage="No system logs found."
        error={tableError}
        isLoading={isLoading}
        minWidth="1200px"
        onLimitChange={(limit) => updateFilters({ limit })}
        onPageChange={(page) => setQuery((current) => ({ ...current, page }))}
        pagination={
          currentResult?.response?.pagination ?? {
            page: query.page,
            limit: query.limit,
            total: 0,
            totalPage: 0,
          }
        }
        rowKey="id"
      />
      <Modal isOpen={selectedId !== null} onClose={() => setSelectedId(null)} className="mx-4 max-w-3xl p-6 sm:p-8">
        <div role="dialog" aria-modal="true" aria-labelledby="system-log-detail-title" className="max-h-[80vh] overflow-y-auto text-gray-800 dark:text-white/90">
          <h2 id="system-log-detail-title" className="pr-12 text-xl font-semibold">System Log Detail</h2>
          {selectedId !== null && <SystemLogDetail key={selectedId} id={selectedId} />}
          <div className="mt-6 flex justify-end">
            <Button size="sm" variant="outline" onClick={() => setSelectedId(null)}>
              Close
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
}
