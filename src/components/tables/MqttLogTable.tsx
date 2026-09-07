"use client";

import { useEffect, useRef, useState } from "react";
import DataTable, { DataTableColumn } from "@/components/common/DataTable";
import Badge from "@/components/ui/badge/Badge";
import Button from "@/components/ui/button/Button";
import { Modal } from "@/components/ui/modal";
import { useToast } from "@/context/ToastContext";
import { CloseIcon, RefreshIcon } from "@/icons";
import MqttLogService, { MQTT_LOG_STATUSES, MqttLog, MqttLogQuery } from "@/services/MqttLogService";
import { ApiListResponse } from "@/services/ParameterService";

const initialQuery: MqttLogQuery = {
  page: 1, limit: 10, status: "", isOk: "", date: "", startDate: "", endDate: "",
};
const inputClass = "mt-1 h-11 w-full rounded-lg border border-gray-300 bg-transparent px-3 text-sm text-gray-800 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90";
const filterFieldClass =
  "shrink-0 text-sm text-gray-700 dark:text-gray-300";
const iconButtonClass =
  "inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-lg transition disabled:cursor-not-allowed disabled:opacity-50";
const dateFormatter = new Intl.DateTimeFormat("en-GB", {
  day: "2-digit", month: "short", year: "numeric",
  hour: "2-digit", minute: "2-digit", second: "2-digit",
});
const formatDate = (value: string | null) => {
  const date = value ? new Date(value) : null;
  return date && !Number.isNaN(date.getTime()) ? dateFormatter.format(date) : "-";
};
const formatPayload = (payload: string | null) => {
  if (!payload) return "-";
  try {
    return JSON.stringify(JSON.parse(payload), null, 2);
  } catch {
    return payload;
  }
};

function MqttLogDetail({ id }: { id: number }) {
  const [retry, setRetry] = useState(0);
  const [result, setResult] = useState<{ retry: number; data?: MqttLog; error?: string }>();
  const [copyMessage, setCopyMessage] = useState("");
  useEffect(() => {
    const controller = new AbortController();
    MqttLogService.getLog(id, { signal: controller.signal }).then(
      (data) => { if (!controller.signal.aborted) setResult({ retry, data }); },
      (error: unknown) => {
        if (!controller.signal.aborted) setResult({ retry, error: error instanceof Error ? error.message : "Failed to load MQTT log detail." });
      }
    );
    return () => controller.abort();
  }, [id, retry]);

  if (!result || result.retry !== retry) return <p role="status" className="py-6">Loading MQTT log detail...</p>;
  if (result.error || !result.data) return (
    <div role="alert" className="space-y-3 py-6">
      <p>Failed to load MQTT log detail.</p>
      <p className="text-sm">{result.error}</p>
      <Button size="sm" onClick={() => setRetry((value) => value + 1)}>Retry</Button>
    </div>
  );
  const log = result.data;
  const fields = [
    ["ID", String(log.id)], ["Message ID", log.messageId],
    ["Date/Time (Received)", formatDate(log.receivedAt)], ["Status", log.status],
    ["isOk", log.isOk == null ? "-" : String(log.isOk)], ["Topic", log.topic],
    ["Process Name", log.processName], ["Operator Username", log.operatorUsername],
    ["Processed At", formatDate(log.processedAt)], ["Created At", formatDate(log.createdAt)],
    ["Updated At", formatDate(log.updatedAt)], ["Error Message", log.errorMessage],
  ];
  const payload = formatPayload(log.payload);
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
          <h3 className="font-medium">Payload / Message</h3>
          <Button size="sm" variant="outline" disabled={!log.payload} onClick={async () => {
            try {
              await navigator.clipboard.writeText(payload);
              setCopyMessage("Payload copied.");
            } catch {
              setCopyMessage("Unable to copy. Select and copy the payload manually.");
            }
          }}>Copy payload</Button>
        </div>
        <p role="status" className="mb-2 text-sm">{copyMessage}</p>
        <pre tabIndex={0} className="max-h-80 overflow-auto whitespace-pre-wrap break-all rounded-lg bg-gray-100 p-4 text-xs dark:bg-gray-800">{payload}</pre>
      </div>
    </div>
  );
}

export default function MqttLogTable() {
  const toast = useToast();
  const lastToastErrorRef = useRef<string | null>(null);
  const [query, setQuery] = useState(initialQuery);
  const [retry, setRetry] = useState(0);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [result, setResult] = useState<{
    query: MqttLogQuery; retry: number; response?: ApiListResponse<MqttLog>; error?: string;
  }>();
  const validationError = query.startDate && query.endDate && query.startDate > query.endDate
    ? "Start Date must be on or before End Date."
    : query.date && ((query.startDate && query.date < query.startDate) || (query.endDate && query.date > query.endDate))
      ? "Date must be within the selected date range." : "";

  useEffect(() => {
    if (validationError) return;
    const controller = new AbortController();
    MqttLogService.getLogs(query, { signal: controller.signal }).then(
      (response) => { if (!controller.signal.aborted) setResult({ query, retry, response }); },
      (error: unknown) => {
        if (!controller.signal.aborted) setResult({ query, retry, error: error instanceof Error ? error.message : "Failed to load MQTT logs." });
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
      title: "Failed to load MQTT logs",
      message: currentResult.error,
    });
  }, [currentResult, toast, validationError]);

  const updateFilters = (next: Partial<MqttLogQuery>) => setQuery((current) => ({ ...current, ...next, page: 1 }));
  const columns: DataTableColumn<MqttLog>[] = [
    { key: "receivedAt", header: "Date/Time", render: (_, row) => formatDate(row.receivedAt) },
    { key: "status", header: "Status", render: (_, row) => (
      <Badge color={row.status === "SUCCESS" ? "success" : row.status === "FAILED" ? "error" : row.status === "PROCESSING" ? "warning" : "info"}>{row.status || "-"}</Badge>
    ) },
    { key: "isOk", header: "isOk", render: (_, row) => row.isOk == null ? "-" : String(row.isOk) },
    { key: "topic", header: "Topic", className: "max-w-xs break-words" },
    { key: "processName", header: "Process" },
    { key: "operatorUsername", header: "Operator" },
    { key: "action", header: "Action", render: (_, row) => (
      <Button size="sm" variant="outline" onClick={() => setSelectedId(row.id)}>Detail</Button>
    ) },
  ];

  return (
    <>
      <div className="mx-4 overflow-x-auto rounded-xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03]">
        <div className="flex min-w-max items-end gap-4">
          <label className={`${filterFieldClass} w-[180px]`}>Status
            <select className={inputClass} value={query.status} onChange={(event) => updateFilters({ status: event.target.value as MqttLogQuery["status"] })}>
              <option value="">All</option>
              {MQTT_LOG_STATUSES.map((status) => <option key={status} value={status}>{status}</option>)}
            </select>
          </label>
          <label className={`${filterFieldClass} w-[160px]`}>isOk
            <select className={inputClass} value={query.isOk} onChange={(event) => updateFilters({ isOk: event.target.value as MqttLogQuery["isOk"] })}>
              <option value="">All</option><option value="true">True</option><option value="false">False</option>
            </select>
          </label>
          {([ ["date", "Date"], ["startDate", "Start Date"], ["endDate", "End Date"] ] as const).map(([key, label]) => (
            <label key={key} className={`${filterFieldClass} w-[170px]`}>{label}
              <input type="date" className={inputClass} value={query[key]} onChange={(event) => updateFilters({ [key]: event.target.value })} />
            </label>
          ))}
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
        columns={columns} data={validationError ? [] : currentResult?.response?.data ?? []}
        emptyMessage="No MQTT logs found." error={tableError} isLoading={isLoading}
        rowKey="id" minWidth="1000px"
        pagination={currentResult?.response?.pagination ?? { page: query.page, limit: query.limit, total: 0, totalPage: 0 }}
        onPageChange={(page) => setQuery((current) => ({ ...current, page }))}
        onLimitChange={(limit) => updateFilters({ limit })}
      />
      <Modal isOpen={selectedId !== null} onClose={() => setSelectedId(null)} className="mx-4 max-w-3xl p-6 sm:p-8">
        <div role="dialog" aria-modal="true" aria-labelledby="mqtt-detail-title" className="max-h-[80vh] overflow-y-auto text-gray-800 dark:text-white/90">
          <h2 id="mqtt-detail-title" className="pr-12 text-xl font-semibold">MQTT Log Detail</h2>
          {selectedId !== null && <MqttLogDetail key={selectedId} id={selectedId} />}
          <div className="mt-6 flex justify-end"><Button size="sm" variant="outline" onClick={() => setSelectedId(null)}>Close</Button></div>
        </div>
      </Modal>
    </>
  );
}
