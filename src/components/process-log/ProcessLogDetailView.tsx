"use client";

import Link from "next/link";
import { ReactNode, useEffect, useRef, useState } from "react";
import { formatShortDateTime as formatDate } from "@/utils/formatDateTime";
import ProcessHistoryModal from "@/components/traceability-log/ProcessHistoryModal";
import { Modal } from "@/components/ui/modal";
import ProcessLogService, { ProcessLogListItem, ProcessLogDetail } from "@/services/ProcessLogService";
import { getMqttPublisherState, isEmptyProcessValue } from "@/utils/mqttPublisher";

type ArrayPointModalState = {
  parameter: string;
  parameterDesc?: string | null;
  values: unknown[];
  status?: boolean | null;
};

const formatType = (value: string) =>
  value
    .replace(/[_-]/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());

const isOkNgValue = (value: unknown): boolean => {
  if (typeof value === "boolean") return true;
  if (typeof value === "string") {
    const s = value.trim().toLowerCase();
    return [
      "ok",
      "ng",
      "true",
      "false",
      "passed",
      "rejected",
      "error",
      "err",
      "fail",
      "failed",
    ].includes(s);
  }
  return false;
};

const isPointFailed = (value: unknown): boolean => {
  if (value === false) return true;
  if (typeof value === "string") {
    const s = value.trim().toLowerCase();
    return ["ng", "false", "rejected", "error", "err", "fail", "failed"].includes(s);
  }
  return false;
};

const isOkNgArray = (values: unknown[]): boolean => {
  if (!values || values.length === 0) return false;
  return values.every((p) => isOkNgValue(p));
};

const getArrayDisplayValue = (
  values: unknown[]
): { text: string; isOkNg: boolean; isFailed: boolean } => {
  if (!values || isEmptyProcessValue(values)) {
    return { text: "-", isOkNg: false, isFailed: false };
  }

  const isOkNg = isOkNgArray(values);

  if (isOkNg) {
    const hasNg = values.some((p) => isPointFailed(p));
    return {
      text: hasNg ? "NG" : "OK",
      isOkNg: true,
      isFailed: hasNg,
    };
  }

  const numericValues = values
    .filter((value) => !isEmptyProcessValue(value))
    .map((v) => {
      if (typeof v === "number") return v;
      if (typeof v === "string") {
        const num = Number(v.replace(",", "."));
        return Number.isNaN(num) ? null : num;
      }
      return null;
    })
    .filter((v): v is number => v !== null);

  if (numericValues.length > 0) {
    const sum = numericValues.reduce((acc, curr) => acc + curr, 0);
    const avg = sum / numericValues.length;
    const formattedAvg = Number.isInteger(avg)
      ? avg.toString()
      : parseFloat(avg.toFixed(2)).toString();

    return {
      text: formattedAvg,
      isOkNg: false,
      isFailed: false,
    };
  }

  return {
    text: `${values.length} Points`,
    isOkNg: false,
    isFailed: false,
  };
};

const formatSingleValue = (value: unknown): string => {
  if (isEmptyProcessValue(value)) return "-";
  if (typeof value === "boolean") return value ? "true" : "false";
  return String(value);
};

function StatusPill({ passed }: { passed: boolean }) {
  return (
    <span
      className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${
        passed
          ? "border-success-200 bg-success-50 text-success-700 dark:border-success-500/30 dark:bg-success-500/15 dark:text-success-400"
          : "border-error-200 bg-error-50 text-error-700 dark:border-error-500/30 dark:bg-error-500/15 dark:text-error-400"
      }`}
    >
      {passed ? "OK" : "NG"}
    </span>
  );
}

function ProgressPill({ finished }: { finished: boolean }) {
  return (
    <span
      className={`inline-flex items-center gap-1 whitespace-nowrap rounded-full border px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${
        finished
          ? "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/15 dark:text-emerald-400"
          : "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-500/30 dark:bg-amber-500/15 dark:text-amber-400"
      }`}
    >
      <span
        className={`size-1.5 rounded-full ${
          finished ? "bg-emerald-500" : "bg-amber-500"
        }`}
      />
      {finished ? "Finished" : "In Progress"}
    </span>
  );
}

export default function ProcessLogDetailView({ serialNumber }: { serialNumber: string }) {
  const [arrayPointModal, setArrayPointModal] = useState<ArrayPointModalState | null>(null);
  const onOpenArrayPoints = setArrayPointModal;
  const [loaded, setLoaded] = useState<{
    serialNumber: string;
    detail?: ProcessLogDetail;
    log?: ProcessLogListItem;
    error?: string;
  } | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [historyProcess, setHistoryProcess] = useState<{ code: string; title: string } | null>(null);

  useEffect(() => {
    if (!serialNumber) return;
    const controller = new AbortController();
    Promise.all([
      ProcessLogService.getProcessLogDetail(serialNumber, { signal: controller.signal }),
      ProcessLogService.getProcessLogs({ serialNumberCode: serialNumber, limit: 100 }, { signal: controller.signal }),
    ])
      .then(([detail, response]) => {
        const log = response.data.find((item) => item.serialNumberCode === serialNumber);
        if (!controller.signal.aborted) setLoaded({ serialNumber, detail, log });
      })
      .catch((error: unknown) => {
        if (!controller.signal.aborted) {
          setLoaded({ serialNumber, error: error instanceof Error ? error.message : "Failed to load process log detail." });
        }
      });
    return () => controller.abort();
  }, [serialNumber, reloadKey]);

  const current = loaded?.serialNumber === serialNumber ? loaded : null;
  const detail = current?.detail;
  const log = current?.log;
  const processes = detail?.processes ?? [];
  const parameterCount = processes.reduce((count, process) => count + process.parameters.length, 0);
  const status = detail?.status ?? log?.status;
  const isLogFailed = status === false;


  return (
    <>
    <div className="mx-3 my-4 overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-950 sm:mx-4">
      {/* Header */}
      <div
        className={`border-b bg-white px-6 py-5 dark:bg-gray-950 ${
          isLogFailed
            ? "border-red-300 dark:border-red-900/60"
            : "border-gray-200 dark:border-gray-800"
        }`}
      >
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-3">
            <h2 className="text-lg font-semibold text-gray-800 dark:text-white/90">
              Process Log Detail
            </h2>
            <span className="rounded-full border border-gray-200 bg-gray-50 px-2.5 py-1 text-xs font-semibold text-gray-700 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300">
              {log ? formatType(log.type) : "-"}
            </span>
            {log && <ProgressPill finished={log.isFinished} />}
            {typeof status === "boolean" && <StatusPill passed={status} />}
          </div>
          <p className="mt-1.5 text-xs text-gray-500 dark:text-gray-400">
            Serial Number:{" "}
            <span className="font-mono font-semibold text-gray-700 dark:text-gray-300">
              {serialNumber}
            </span>
            <span className="mx-2">|</span>
            Timestamp:{" "}
            <span className="font-medium text-gray-700 dark:text-gray-300">
              {log ? formatDate(log.createdAt) : "-"}
            </span>
            <span className="mx-2">|</span>
            Parameters:{" "}
            <span className="font-semibold text-brand-600 dark:text-brand-400">
              {detail ? parameterCount : "-"}
            </span>
          </p>
        </div>
      </div>

      {/* Body: Dynamic Parameters Grid */}
      <div className="bg-gray-50 p-4 sm:p-6 dark:bg-gray-950">
        {!current && <p role="status" className="text-sm text-gray-500">Loading process log detail...</p>}
        {current?.error && (
          <div role="alert" className="text-sm text-red-600 dark:text-red-400">
            <p>{current.error}</p>
            <button type="button" className="mt-2 underline" onClick={() => { setLoaded(null); setReloadKey((key) => key + 1); }}>Retry</button>
          </div>
        )}
        {detail && processes.length === 0 && <p className="text-sm text-gray-500">No processes available for this process log.</p>}
        <div className="space-y-5">
        {processes.map((process, processIndex) => {
          const mqttState = getMqttPublisherState(process);
          const parameters = process.parameters;
          const allEmpty = parameters.every((parameter) => isEmptyProcessValue(parameter.value));
          return (
          <section key={`${process.processCode ?? "process"}-${processIndex}`} className="rounded-xl border border-gray-200 p-4 dark:border-gray-800">
            <div className="mb-3 space-y-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex min-w-0 flex-wrap items-center gap-3">
                <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-100">{process.processName || process.processCode || `Process ${processIndex + 1}`}</h3>
                <button
                  type="button"
                  disabled={!process.processCode}
                  onClick={() => process.processCode && setHistoryProcess({ code: process.processCode, title: process.processName || process.processCode })}
                  className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-semibold text-brand-600 hover:bg-brand-50 disabled:opacity-50 dark:border-gray-700 dark:bg-gray-900 dark:text-brand-400 dark:hover:bg-gray-800"
                >
                  History
                </button>
                </div>
                {mqttState === "Disabled" && (
                  <span className="rounded-full border border-amber-300 bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-800 dark:border-amber-700 dark:bg-amber-950 dark:text-amber-200">
                    MQTT Publisher: Disabled
                  </span>
                )}
              </div>
              {process.mqttPublisherStatus && <p className="break-words text-xs text-gray-600 dark:text-gray-300">MQTT status: {process.mqttPublisherStatus}</p>}
              {process.reason && <p className="break-words text-xs text-gray-600 dark:text-gray-300">Reason: {process.reason}</p>}
              {allEmpty && <p className="text-xs text-gray-500 dark:text-gray-400">Parameter values are not available yet.</p>}
            </div>
        <ProcessParameterGrid>
          {parameters.map((param, index) => {
            const isArray = Array.isArray(param.value);
            const arrayInfo = isArray
              ? getArrayDisplayValue(param.value as unknown[])
              : null;
            const isOkNg = isArray
              ? Boolean(arrayInfo?.isOkNg)
              : isOkNgValue(param.value);

            const isFailed = isOkNg
              ? isArray
                ? Boolean(arrayInfo?.isFailed)
                : isPointFailed(param.value)
              : false;
            const title =
              param.parameterDesc || param.parameter || `Param ${index + 1}`;

            return (
              <div
                className={`min-w-0 overflow-hidden rounded-lg p-3 text-center transition-all ${
                  isFailed
                    ? "border-2 border-red-500 bg-red-50/70 shadow-sm shadow-red-500/10 dark:border-red-500/80 dark:bg-red-950/30"
                    : isOkNg
                      ? "border border-emerald-300 bg-emerald-50/70 dark:border-emerald-800 dark:bg-emerald-950/30"
                      : "border border-gray-200 bg-white hover:border-brand-300 dark:border-gray-800 dark:bg-gray-900"
                }`}
                key={`${param.parameter ?? "param"}-${index}`}
              >
                {/* Parameter Title */}
                <div className="flex min-h-9 items-start justify-center">
                  <span
                    className={`block max-h-9 max-w-full overflow-hidden break-words text-xs font-semibold leading-[18px] uppercase ${
                      isFailed
                        ? "text-red-800 dark:text-red-300"
                        : "text-gray-600 dark:text-gray-400"
                    }`}
                    title={title}
                  >
                    {title}
                  </span>
                </div>

                {/* Parameter Value */}
                <div className="mt-2.5 flex min-w-0 items-center justify-center">
                  {isArray && arrayInfo ? (
                    <button
                      className={`inline-flex h-7 min-w-0 max-w-full items-center justify-center gap-1.5 rounded-md border px-2.5 font-mono text-xs font-bold transition-all hover:scale-[1.02] ${
                        isOkNg
                          ? isFailed
                            ? "border-2 border-red-500 bg-red-100 text-red-700 hover:bg-red-200 dark:border-red-500/80 dark:bg-red-900/40 dark:text-red-300"
                            : "border-emerald-300 bg-emerald-50 text-emerald-800 hover:bg-emerald-100 dark:border-emerald-500/40 dark:bg-emerald-500/15 dark:text-emerald-300"
                          : "border-gray-200 bg-gray-50 text-gray-800 hover:bg-gray-100 dark:border-gray-700 dark:bg-gray-800/80 dark:text-gray-200 dark:hover:bg-gray-800"
                      }`}
                      onClick={() =>
                        onOpenArrayPoints({
                          parameter: param.parameter || "",
                          parameterDesc: param.parameterDesc,
                          status: param.status,
                          values: param.value as unknown[],
                        })
                      }
                      type="button"
                    >
                      <span className="truncate">
                        {arrayInfo.text}
                      </span>
                      <svg
                        aria-hidden="true"
                        className="size-3.5 shrink-0 fill-none stroke-current stroke-2"
                        viewBox="0 0 24 24"
                      >
                        <path d="M2.5 12s3.5-6 9.5-6 9.5 6 9.5 6-3.5 6-9.5 6-9.5-6Z" />
                        <circle cx="12" cy="12" r="2.5" />
                      </svg>
                    </button>
                  ) : (
                    <span
                      className={`truncate font-mono text-sm font-bold ${
                        isOkNg
                          ? isFailed
                            ? "text-red-600 dark:text-red-400"
                            : "text-emerald-600 dark:text-emerald-400"
                          : "text-gray-900 dark:text-white"
                      }`}
                      title={formatSingleValue(param.value)}
                    >
                      {formatSingleValue(param.value)}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </ProcessParameterGrid>

          {parameters.length === 0 && (
            <div className="col-span-full rounded-lg border border-dashed border-gray-200 py-12 text-center text-sm text-gray-500 dark:border-white/[0.12] dark:text-gray-400">
              No parameters available for this process.
            </div>
          )}
          </section>
          );
        })}
        </div>
      </div>

      {/* Footer */}
      <div className="flex justify-end border-t border-gray-200 bg-white px-6 py-4 dark:border-gray-800 dark:bg-gray-950">
        <Link
          className="rounded-lg bg-brand-500 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-brand-600"
          href="/process-log"
        >
          Kembali ke Process Log
        </Link>
      </div>
    </div>
    {historyProcess && (
      <ProcessHistoryModal
        key={`${serialNumber}-${historyProcess.code}`}
        source="process-log"
        identifier={serialNumber}
        processKey={historyProcess.code}
        title={historyProcess.title}
        serialNumber={serialNumber}
        onClose={() => setHistoryProcess(null)}
      />
    )}
    {arrayPointModal && (
      <ArrayPointsModal data={arrayPointModal} onClose={() => setArrayPointModal(null)} />
    )}
    </>
  );
}

function ProcessParameterGrid({ children }: { children: ReactNode[] }) {
  const gridRef = useRef<HTMLDivElement>(null);
  const [columns, setColumns] = useState(1);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    const grid = gridRef.current;
    if (!grid) return;

    const observer = new ResizeObserver(([entry]) => {
      const gap = parseFloat(getComputedStyle(grid).columnGap) || 0;
      setColumns(Math.max(1, Math.floor((entry.contentRect.width + gap) / (180 + gap))));
    });
    observer.observe(grid);
    return () => observer.disconnect();
  }, []);

  const limit = columns * 2;
  const visibleCount = expanded ? children.length : Math.min(limit, children.length);

  return (
    <>
      <div ref={gridRef} className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,180px),1fr))] gap-3">
        {children.slice(0, visibleCount)}
      </div>
      {children.length > limit && (
        <div className="mt-3 flex flex-wrap items-center justify-between gap-3 border-t border-gray-200 pt-3 dark:border-gray-800">
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Showing {visibleCount} of {children.length} parameters
          </p>
          <button
            type="button"
            aria-expanded={expanded}
            onClick={() => setExpanded((current) => !current)}
            className="rounded-lg border border-gray-200 bg-white px-4 py-2 text-xs font-semibold text-brand-600 hover:bg-brand-50 dark:border-gray-700 dark:bg-gray-900 dark:text-brand-400 dark:hover:bg-gray-800"
          >
            {expanded ? "Show less" : "Show more"}
          </button>
        </div>
      )}
    </>
  );
}

function ArrayPointsModal({
  data,
  onClose,
}: {
  data: ArrayPointModalState;
  onClose: () => void;
}) {
  const points = data.values;
  const isOkNgType = isOkNgArray(points);

  const passedCount = isOkNgType
    ? points.filter((p) => !isPointFailed(p)).length
    : 0;
  const rejectedCount = isOkNgType ? points.length - passedCount : 0;
  const isFailedOverall = isOkNgType && rejectedCount > 0;

  return (
    <Modal
      className="mx-4 max-w-5xl overflow-hidden p-0"
      isOpen={true}
      onClose={onClose}
    >
      <div className="border-b border-gray-200 bg-white px-6 py-4 dark:border-gray-800 dark:bg-gray-950">
        <div className="flex flex-wrap items-center justify-between gap-3 pr-10">
          <div>
            <h2 className="text-base font-bold text-gray-900 dark:text-white">
              {data.parameterDesc || data.parameter}
            </h2>
          </div>
          <span
            className={`rounded-full border px-3 py-0.5 text-xs font-bold uppercase ${
              !isOkNgType
                ? "border-gray-200 bg-gray-100 text-gray-700 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300"
                : !isFailedOverall
                  ? "border-success-200 bg-success-50 text-success-700 dark:border-success-500/30 dark:bg-success-500/15 dark:text-success-300"
                  : "border-2 border-red-500 bg-red-50 text-red-700 dark:border-red-500 dark:bg-red-950/40 dark:text-red-300"
            }`}
          >
            {isOkNgType
              ? `${points.length} Points (${passedCount} OK / ${rejectedCount} NG)`
              : `${points.length} Points`}
          </span>
        </div>
      </div>

      <div className="max-h-[65vh] overflow-y-auto bg-gray-50 p-6 dark:bg-gray-950">
        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8">
          {points.map((value, index) => {
            const isFailed = isOkNgType && isPointFailed(value);
            const displayLabel = formatSingleValue(value);

            return (
              <div
                className={`rounded-lg p-2.5 text-center transition-all ${
                  isOkNgType
                    ? isFailed
                      ? "border-2 border-red-500 bg-red-50/80 shadow-sm shadow-red-500/10 dark:border-red-500 dark:bg-red-950/40"
                      : "border border-emerald-300 bg-emerald-50/60 dark:border-emerald-500/40 dark:bg-emerald-950/30"
                    : "border border-gray-200 bg-white hover:border-brand-300 dark:border-gray-800 dark:bg-gray-900"
                }`}
                key={index}
              >
                <span
                  className={`block font-mono text-[10px] font-semibold ${
                    isOkNgType
                      ? isFailed
                        ? "text-red-500 dark:text-red-400"
                        : "text-emerald-600 dark:text-emerald-400"
                      : "text-gray-400 dark:text-gray-500"
                  }`}
                >
                  P-{String(index + 1).padStart(2, "0")}
                </span>
                <p
                  className={`mt-1 font-mono text-xs font-bold ${
                    isOkNgType
                      ? isFailed
                        ? "text-red-600 dark:text-red-400"
                        : "text-emerald-700 dark:text-emerald-300"
                      : "text-gray-900 dark:text-white"
                  }`}
                >
                  {displayLabel}
                </p>
              </div>
            );
          })}
          {points.length === 0 && (
            <div className="col-span-full rounded-lg border border-dashed border-gray-200 px-5 py-8 text-center text-sm text-gray-500 dark:border-white/[0.12] dark:text-gray-400">
              No measurement values recorded.
            </div>
          )}
        </div>
      </div>

      <div className="flex justify-end border-t border-gray-200 bg-white px-6 py-3 dark:border-gray-800 dark:bg-gray-950">
        <button
          className="h-8 rounded-lg bg-brand-500 px-4 text-xs font-semibold text-white hover:bg-brand-600"
          onClick={onClose}
          type="button"
        >
          Close
        </button>
      </div>
    </Modal>
  );
}
