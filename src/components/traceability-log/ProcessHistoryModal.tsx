"use client";

import { useEffect, useState } from "react";
import { Modal } from "@/components/ui/modal";
import TraceabilityLogService, {
  TraceabilityLogItem,
  TraceabilityProcessKey,
} from "@/services/TraceabilityLogService";
import ProcessLogService from "@/services/ProcessLogService";
import { groupScanSessions, matchesScanHistory, ProcessHistorySource, ScanHistoryFilters } from "@/utils/scanHistory";
import { getMqttPublisherState, MqttPublisherInfo } from "@/utils/mqttPublisher";

const INITIAL_VISIBLE_PARAMETERS = 15;
const EMPTY_FILTERS: ScanHistoryFilters = { query: "", status: "all" };
const filterInputClass = "h-9 w-full min-w-0 rounded-lg border border-gray-200 bg-white px-3 text-xs text-gray-700 outline-none focus:border-brand-400 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200";

const scanTimeFormatter = new Intl.DateTimeFormat("en-GB", {
  timeZone: "Asia/Bangkok",
  day: "2-digit", month: "short", year: "numeric",
  hour: "2-digit", minute: "2-digit", second: "2-digit",
});

const scanTime = (value?: string) => {
  const date = value ? new Date(value) : null;
  return date && Number.isFinite(date.getTime()) ? scanTimeFormatter.format(date) : "Time unavailable";
};

const historyValue = (value: unknown): string => {
  if (value == null || (typeof value === "string" && !value.trim())) return "-";
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
};

type ProcessHistoryModalProps = {
  identifier: string;
  title: string;
  serialNumber: string;
  onClose: () => void;
} & ({
  source?: "traceability-log";
  processKey: TraceabilityProcessKey;
  onLoaded: (log: TraceabilityLogItem) => void;
} | {
  source: "process-log";
  processKey: string;
  onLoaded?: never;
});

export default function ProcessHistoryModal({
  identifier, processKey, title, serialNumber, onClose, onLoaded, source,
}: ProcessHistoryModalProps) {
  const [data, setData] = useState<{
    history: ProcessHistorySource[];
    processes: (MqttPublisherInfo & { processCode?: string })[];
  } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [reloadKey, setReloadKey] = useState(0);
  const [visibleCounts, setVisibleCounts] = useState<Record<number, number>>({});
  const [viewMode, setViewMode] = useState<"session" | "list">("session");
  const [filters, setFilters] = useState<ScanHistoryFilters>(EMPTY_FILTERS);

  useEffect(() => {
    const controller = new AbortController();
    const load = async () => {
      if (source === "process-log") {
        const detail = await ProcessLogService.getProcessLogDetail(identifier, { signal: controller.signal });
        if (controller.signal.aborted) return;
        const processes = detail.processes.filter((process) => process.processCode === processKey);
        setData({
          processes,
          history: processes.map((process) => ({
            processCode: process.processCode ?? "",
            processName: process.processName || process.processCode || title,
            entries: process.history,
          })),
        });
      } else {
        const response = await TraceabilityLogService.getTraceabilityLogV2BySerialNumber(identifier, { signal: controller.signal });
        if (controller.signal.aborted) return;
        const key = processKey as TraceabilityProcessKey;
        setData({ history: response.data.history?.[key] ?? [], processes: response.data.sections?.[key] ?? [] });
        onLoaded?.(response.data);
      }
    };
    load()
      .catch((error: unknown) => {
        if (controller.signal.aborted) return;
        setError(error instanceof Error ? error.message : "Failed to load scan history.");
      })
      .finally(() => {
        if (!controller.signal.aborted) setIsLoading(false);
      });
    return () => controller.abort();
  }, [identifier, processKey, reloadKey, onLoaded, source, title]);

  const allSessions = groupScanSessions(data?.history ?? []);
  // Group first so filtering does not merge scans or change their session numbers.
  const sessions = allSessions.map((session) => {
    const entries = session.entries.filter((entry) => matchesScanHistory(entry, filters));
    return { ...session, entries, okCount: entries.filter((entry) => entry.status === true).length,
      ngCount: entries.filter((entry) => entry.status === false).length };
  }).filter((session) => session.entries.length > 0);
  const historyRows = (data?.history ?? []).flatMap((source) =>
    source.entries.map((entry) => ({ ...entry, processCode: source.processCode, processName: source.processName }))
  ).filter((entry) => matchesScanHistory(entry, filters)).sort((a, b) =>
    (Date.parse(b.createdAt ?? "") || 0) - (Date.parse(a.createdAt ?? "") || 0) || (b.id ?? 0) - (a.id ?? 0)
  );
  const filtersActive = filters.query.trim() !== "" || filters.status !== "all";
  const updateFilters = (next: Partial<ScanHistoryFilters>) => {
    setFilters((current) => ({ ...current, ...next }));
    setVisibleCounts({});
  };
  const reload = () => {
    setError(null);
    setIsLoading(true);
    setVisibleCounts({});
    setReloadKey((key) => key + 1);
  };

  return (
    <Modal isOpen onClose={onClose} className="mx-4 max-w-5xl overflow-hidden p-0">
      <div role="dialog" aria-modal="true" aria-labelledby="process-history-title">
      <div className="border-b border-gray-200 bg-white px-5 py-5 pr-16 dark:border-gray-800 dark:bg-gray-950">
        <h2 id="process-history-title" className="text-lg font-semibold text-gray-900 dark:text-white">History — {title}</h2>
        <p className="mt-1 break-all text-sm text-gray-600 dark:text-gray-300">
          Serial Number: <span className="font-mono font-semibold">{serialNumber || "-"}</span>
        </p>
        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
          {isLoading ? "Loading history..." : error ? "Scan history unavailable" : `${viewMode === "session" ? `${sessions.length} scan sessions` : `${historyRows.length} history records`} · Latest first`}
        </p>
        <div className="mt-3 inline-flex gap-1 rounded-lg bg-gray-100 p-1 dark:bg-gray-800" role="group" aria-label="History display">
          {(["session", "list"] as const).map((mode) => (
            <button
              key={mode}
              type="button"
              aria-pressed={viewMode === mode}
              onClick={() => setViewMode(mode)}
              className={`rounded-md px-4 py-1.5 text-xs font-semibold transition-colors ${viewMode === mode ? "bg-white text-brand-600 shadow-sm dark:bg-gray-900 dark:text-brand-400" : "text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200"}`}
            >
              {mode === "session" ? "Session" : "List"}
            </button>
          ))}
        </div>
      </div>
      <div className="max-h-[65vh] space-y-4 overflow-y-auto bg-gray-50 p-4 dark:bg-gray-950 sm:p-5">
        <div className="rounded-xl border border-gray-200 bg-white p-3 dark:border-gray-800 dark:bg-gray-900">
          <div className="grid grid-cols-1 items-end gap-3 sm:grid-cols-[minmax(0,1fr)_180px]">
            <label className="space-y-1 text-xs text-gray-500 dark:text-gray-400">
              <span>Search</span>
              <input type="search" value={filters.query} onChange={(event) => updateFilters({ query: event.target.value })} placeholder="Parameter or value" className={filterInputClass} />
            </label>
            <label className="space-y-1 text-xs text-gray-500 dark:text-gray-400">
              <span>Status</span>
              <select value={filters.status} onChange={(event) => updateFilters({ status: event.target.value as ScanHistoryFilters["status"] })} className={filterInputClass}>
                <option value="all">All statuses</option>
                <option value="ok">OK</option>
                <option value="ng">NG</option>
                <option value="unknown">Without status</option>
              </select>
            </label>
          </div>
          {filtersActive && (
            <div className="mt-2 flex items-center justify-between gap-2">
              <p className="text-[11px] text-gray-500 dark:text-gray-400" role="status">{historyRows.length} matching records in {sessions.length} sessions</p>
              <button type="button" onClick={() => { setFilters(EMPTY_FILTERS); setVisibleCounts({}); }} className="text-xs font-semibold text-brand-600 hover:underline dark:text-brand-400">Reset filters</button>
            </div>
          )}
        </div>
        {isLoading ? (
          <p role="status" className="py-10 text-center text-sm text-gray-500">Loading scan history...</p>
        ) : error ? (
          <div role="alert" className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300">
            <p>{error}</p>
            <button type="button" onClick={reload} className="mt-3 font-semibold underline">Retry</button>
          </div>
        ) : sessions.length === 0 ? (
          <p className="py-10 text-center text-sm text-gray-500">{filtersActive && allSessions.length > 0 ? "No history matches the selected filters." : "No scan history available for this process."}</p>
        ) : viewMode === "list" ? (
          <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-gray-200 bg-gray-50 text-gray-500 dark:border-gray-800 dark:bg-gray-800/50 dark:text-gray-400">
                <tr>
                  <th scope="col" className="px-4 py-3 font-semibold">Process</th>
                  <th scope="col" className="px-4 py-3 font-semibold">Parameter</th>
                  <th scope="col" className="px-4 py-3 font-semibold">Value</th>
                  <th scope="col" className="px-4 py-3 font-semibold">Scan time</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {historyRows.map((entry, index) => (
                  <tr key={`${entry.processCode}-${entry.id ?? index}`} className={entry.status === false ? "bg-red-50/50 dark:bg-red-950/20" : entry.status === true ? "bg-emerald-50/40 dark:bg-emerald-950/20" : ""}>
                    <td className="px-4 py-3 text-gray-600 dark:text-gray-300">{entry.processName}</td>
                    <td className="px-4 py-3 font-medium text-gray-800 dark:text-gray-200">{entry.parameterName || entry.parameterCode || "-"}</td>
                    <td className={`max-w-xs whitespace-pre-wrap break-words px-4 py-3 font-mono font-bold ${entry.status === true ? "text-emerald-700 dark:text-emerald-300" : entry.status === false ? "text-red-600 dark:text-red-400" : "text-gray-900 dark:text-white"}`}>
                      {typeof entry.status === "boolean" ? (entry.status ? "OK" : "NG") : historyValue(entry.value)}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-gray-500 dark:text-gray-400">{scanTime(entry.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : sessions.map((session) => (
          <section key={session.number} className="overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
            <div className="flex flex-wrap items-start justify-between gap-3 border-b border-gray-100 bg-gray-50 px-4 py-3 dark:border-gray-800 dark:bg-gray-800/50">
              <div>
                <h3 className="text-sm font-bold text-gray-900 dark:text-white">Scan Session #{session.number}</h3>
                <p className="mt-1 text-xs text-gray-600 dark:text-gray-300">{session.processName} · {session.processCode}</p>
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">{scanTime(session.createdAt)} (UTC+7)</p>
              </div>
              <div className="flex flex-wrap gap-2 text-xs font-semibold">
                <span className="rounded-md bg-gray-100 px-2 py-1 text-gray-700 dark:bg-gray-800 dark:text-gray-200">{session.entries.length} Parameters</span>
                <span className="rounded-md bg-emerald-50 px-2 py-1 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">{session.okCount} OK</span>
                <span className="rounded-md bg-red-50 px-2 py-1 text-red-700 dark:bg-red-950 dark:text-red-300">{session.ngCount} NG</span>
              </div>
            </div>
            {source === "process-log" && (
              <HistoryPublisherInfo
                process={data?.processes.find((process) => process.processCode === session.processCode)}
              />
            )}
            <div className="grid grid-cols-1 items-stretch gap-2 bg-gray-50/50 p-3 dark:bg-gray-950/30 sm:grid-cols-2 lg:grid-cols-5">
              {session.entries.slice(0, visibleCounts[session.number] ?? INITIAL_VISIBLE_PARAMETERS).map((entry, index) => (
                <article
                  key={`${entry.id ?? index}-${entry.parameterCode}`}
                  className={`flex min-w-0 flex-col overflow-hidden rounded-lg border ${entry.status === false ? "border-red-200 bg-red-50/60 dark:border-red-800 dark:bg-red-950/20" : entry.status === true ? "border-emerald-200 bg-emerald-50/70 dark:border-emerald-800 dark:bg-emerald-950/30" : "border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900"}`}
                >
                  <div className="flex flex-1 flex-col px-2.5 pb-1.5 pt-2">
                    <div className="flex min-h-7 items-start justify-center gap-1">
                      <h4 className="min-w-0 flex-1 break-words text-center text-[10px] font-semibold leading-3.5 text-gray-600 dark:text-gray-300">
                        {entry.parameterName || entry.parameterCode || "-"}
                      </h4>
                    </div>
                    <div className="flex min-h-7 flex-1 items-center justify-center py-0.5">
                      <p className={`min-w-0 whitespace-pre-wrap break-all text-center font-mono text-lg font-bold leading-5 tabular-nums ${entry.status === false ? "text-red-600 dark:text-red-400" : entry.status === true ? "text-emerald-700 dark:text-emerald-300" : "text-gray-900 dark:text-white"}`}>
                        {typeof entry.status === "boolean" ? (entry.status ? "OK" : "NG") : historyValue(entry.value)}
                      </p>
                    </div>
                  </div>
                </article>
              ))}
            </div>
            {session.entries.length > INITIAL_VISIBLE_PARAMETERS && (
              <div className="flex flex-wrap items-center justify-between gap-3 border-t border-gray-100 px-4 py-3 dark:border-gray-800">
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Showing {Math.min(visibleCounts[session.number] ?? INITIAL_VISIBLE_PARAMETERS, session.entries.length)} of {session.entries.length} parameters
                </p>
                {(visibleCounts[session.number] ?? INITIAL_VISIBLE_PARAMETERS) < session.entries.length ? (
                  <button
                    type="button"
                    onClick={() => setVisibleCounts((counts) => ({ ...counts, [session.number]: session.entries.length }))}
                    className="rounded-lg border border-gray-200 bg-white px-4 py-2 text-xs font-semibold text-brand-600 transition-colors hover:bg-brand-50 dark:border-gray-700 dark:bg-gray-900 dark:text-brand-400 dark:hover:bg-gray-800"
                  >
                    Show more
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => setVisibleCounts((counts) => ({ ...counts, [session.number]: INITIAL_VISIBLE_PARAMETERS }))}
                    className="rounded-lg border border-gray-200 bg-white px-4 py-2 text-xs font-semibold text-gray-600 transition-colors hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300 dark:hover:bg-gray-800"
                  >
                    Show less
                  </button>
                )}
              </div>
            )}
          </section>
        ))}
      </div>
      <div className="flex justify-between border-t border-gray-200 bg-white px-5 py-4 dark:border-gray-800 dark:bg-gray-950">
        <button type="button" onClick={reload} disabled={isLoading} className="rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-700 disabled:opacity-50 dark:border-gray-700 dark:text-gray-200">Refresh</button>
        <button type="button" onClick={onClose} className="rounded-lg bg-brand-500 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-600">Close</button>
      </div>
      </div>
    </Modal>
  );
}

function HistoryPublisherInfo({ process }: { process?: MqttPublisherInfo }) {
  if (!process) return null;
  const state = getMqttPublisherState(process);
  if (state !== "Disabled") return null;
  return (
    <div className="space-y-1.5 border-b border-gray-100 px-4 py-2.5 dark:border-gray-800">
      <span className="inline-flex rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-[11px] font-semibold text-amber-800 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-200">
        Current MQTT Publisher: Disabled
      </span>
      {process.mqttPublisherStatus && (
        <p className="break-words text-xs text-gray-600 dark:text-gray-300">MQTT status: {process.mqttPublisherStatus}</p>
      )}
      {process.reason && (
        <p className="break-words text-xs text-gray-600 dark:text-gray-300">Reason: {process.reason}</p>
      )}
    </div>
  );
}
