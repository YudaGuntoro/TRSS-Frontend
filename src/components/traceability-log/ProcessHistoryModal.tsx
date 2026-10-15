"use client";

import { useEffect, useState } from "react";
import { Modal } from "@/components/ui/modal";
import TraceabilityLogService, {
  TraceabilityLogItem,
  TraceabilityProcessKey,
} from "@/services/TraceabilityLogService";
import { groupScanSessions } from "@/utils/scanHistory";

const INITIAL_VISIBLE_PARAMETERS = 15;

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

export default function ProcessHistoryModal({
  identifier, processKey, title, serialNumber, onClose, onLoaded,
}: {
  identifier: string;
  processKey: TraceabilityProcessKey;
  title: string;
  serialNumber: string;
  onClose: () => void;
  onLoaded: (log: TraceabilityLogItem) => void;
}) {
  const [data, setData] = useState<TraceabilityLogItem | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [reloadKey, setReloadKey] = useState(0);
  const [visibleCounts, setVisibleCounts] = useState<Record<number, number>>({});

  useEffect(() => {
    const controller = new AbortController();
    TraceabilityLogService.getTraceabilityLogV2BySerialNumber(identifier, { signal: controller.signal })
      .then((response) => {
        if (controller.signal.aborted) return;
        setData(response.data);
        onLoaded(response.data);
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted) return;
        setError(error instanceof Error ? error.message : "Failed to load scan history.");
      })
      .finally(() => {
        if (!controller.signal.aborted) setIsLoading(false);
      });
    return () => controller.abort();
  }, [identifier, processKey, reloadKey, onLoaded]);

  const sessions = groupScanSessions(data?.history?.[processKey] ?? []);
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
          {isLoading ? "Loading scan sessions..." : error ? "Scan history unavailable" : `${sessions.length} scan sessions · Latest first`}
        </p>
      </div>
      <div className="max-h-[65vh] space-y-4 overflow-y-auto bg-gray-50 p-4 dark:bg-gray-950 sm:p-5">
        {isLoading ? (
          <p role="status" className="py-10 text-center text-sm text-gray-500">Loading scan history...</p>
        ) : error ? (
          <div role="alert" className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300">
            <p>{error}</p>
            <button type="button" onClick={reload} className="mt-3 font-semibold underline">Retry</button>
          </div>
        ) : sessions.length === 0 ? (
          <p className="py-10 text-center text-sm text-gray-500">No scan history available for this process.</p>
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
                      {typeof entry.status === "boolean" && (
                        <span className={`shrink-0 rounded-md px-1.5 py-0.5 text-[10px] font-bold ${entry.status ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300" : "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300"}`}>
                          {entry.status ? "OK" : "NG"}
                        </span>
                      )}
                    </div>
                    <div className="flex min-h-7 flex-1 items-center justify-center py-0.5">
                      <p className={`min-w-0 whitespace-pre-wrap break-all text-center font-mono text-lg font-bold leading-5 tabular-nums ${entry.status === false ? "text-red-600 dark:text-red-400" : entry.status === true ? "text-emerald-700 dark:text-emerald-300" : "text-gray-900 dark:text-white"}`}>
                        {historyValue(entry.value)}
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
