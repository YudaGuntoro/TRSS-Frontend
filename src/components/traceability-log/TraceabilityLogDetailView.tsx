"use client";

import PageLoader from "@/components/common/PageLoader";
import { Modal } from "@/components/ui/modal";
import { useToast } from "@/context/ToastContext";
import { ChevronLeftIcon } from "@/icons";
import TraceabilityLogService, {
  TraceabilityLogItem,
  TraceabilityLogV2Parameter,
} from "@/services/TraceabilityLogService";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

type TraceabilityLogDetailViewProps = {
  identifier: string;
};

type ArrayPointModalState = {
  parameter: string;
  parameterDesc?: string | null;
  values: Array<string | number | boolean>;
  status?: boolean | null;
};

const dateFormatter = new Intl.DateTimeFormat("en-GB", {
  day: "2-digit",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
});

const formatDate = (value?: string | null) => {
  if (!value) return "-";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "-" : dateFormatter.format(date);
};

const getBooleanValue = (value: unknown): boolean | null => {
  if (typeof value === "boolean") return value;
  if (typeof value === "number") {
    if (value === 0) return false;
    if (value > 0) return true;
    return null;
  }
  if (typeof value !== "string") return null;

  const normalized = value.trim().toLowerCase();
  if (["false", "ng", "rejected", "0", "0.0", "0.00", "off"].includes(normalized)) return false;
  if (["true", "ok", "passed", "1", "2", "1.0", "1.00", "on"].includes(normalized)) return true;

  const num = Number(normalized);
  if (!Number.isNaN(num)) {
    return num !== 0;
  }

  return null;
};

const formatSingleValue = (value: unknown): string => {
  if (value === null || value === undefined || value === "") return "-";

  const boolVal = getBooleanValue(value);
  if (typeof boolVal === "boolean") {
    if (typeof value === "string" && ["on", "off"].includes(value.trim().toLowerCase())) {
      return value.toUpperCase();
    }
    return boolVal ? "OK" : "NG";
  }

  if (typeof value === "number") {
    return new Intl.NumberFormat("en-US", {
      maximumFractionDigits: 4,
    }).format(value);
  }

  return String(value);
};

export default function TraceabilityLogDetailView({
  identifier,
}: TraceabilityLogDetailViewProps) {
  const toast = useToast();
  const router = useRouter();

  const [log, setLog] = useState<TraceabilityLogItem | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modalData, setModalData] = useState<ArrayPointModalState | null>(null);
  const [issueModal, setIssueModal] = useState<{
    title: string;
    serialNumber: string;
    issues: string[];
  } | null>(null);

  useEffect(() => {
    const controller = new AbortController();

    const fetchDetail = async () => {
      try {
        setIsLoading(true);
        setError(null);

        const response =
          await TraceabilityLogService.getTraceabilityLogV2BySerialNumber(
            identifier,
            { signal: controller.signal }
          );

        setLog(response.data);
      } catch (err: unknown) {
        if (err instanceof DOMException && err.name === "AbortError") return;

        const msg =
          err instanceof Error
            ? err.message
            : "Failed to load traceability log detail";
        setError(msg);
        toast.error({ title: "Failed to load details", message: msg });
      } finally {
        if (!controller.signal.aborted) {
          setIsLoading(false);
        }
      }
    };

    fetchDetail();

    return () => controller.abort();
  }, [identifier, toast]);

  if (isLoading) {
    return <PageLoader />;
  }

  if (error || !log) {
    return (
      <div className="mx-4 my-6 rounded-2xl border border-error-200 bg-error-50 p-6 text-error-700 dark:border-error-500/30 dark:bg-error-500/10 dark:text-error-300">
        <h2 className="text-lg font-semibold">Traceability Detail Unavailable</h2>
        <p className="mt-2 text-sm">{error ?? "Traceability log was not found."}</p>
        <button
          className="mt-5 rounded-lg bg-brand-500 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-600"
          onClick={() => router.push("/traceability-log")}
          type="button"
        >
          Back to Traceability Logs
        </button>
      </div>
    );
  }

  const clinchingParams = log.detail?.clinching ?? [];
  const mfanParams = log.detail?.mfan ?? [];
  const ecmParams = log.detail?.ecm ?? [];
  const finalParams = log.detail?.final ?? [];

  return (
    <div className="mx-4 my-4 max-w-[1600px] space-y-4 xl:mx-auto">
      {/* Top Header Navigation */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            aria-label="Back to traceability log"
            className="inline-flex size-10 items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-600 transition-colors hover:bg-gray-50 hover:text-gray-900 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-300 dark:hover:bg-gray-800"
            onClick={() => router.push("/traceability-log")}
            type="button"
          >
            <ChevronLeftIcon className="size-5 fill-current" />
          </button>
          <div>
            <h1 className="text-xl font-bold text-gray-900 dark:text-white">
              Traceability Log Record Sheet
            </h1>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Unit Detail View
            </p>
          </div>
        </div>
      </div>

      {/* SINGLE UNIFIED RECORD SHEET CARD */}
      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-xs dark:border-gray-800 dark:bg-white/[0.02]">
        {/* Simple Clean Blue Header */}
        <div className="border-b border-gray-200 bg-[#6D8AF3] px-6 py-3 text-white dark:border-gray-800">
          <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-wrap items-center gap-3 sm:gap-4 text-xs">
              <div className="flex items-center gap-2">
                <span className="font-mono text-sm font-bold text-white">
                  {log.serialNumberClinching || "-"}
                </span>
                {log.issueNumbersClinching && log.issueNumbersClinching.length > 0 && (
                  <div className="flex items-center gap-1">
                    <span className="inline-flex items-center rounded-md border border-white/30 bg-white/20 px-2 py-0.5 font-mono text-[11px] font-semibold text-white">
                      {log.issueNumbersClinching[0]}
                    </span>
                    {log.issueNumbersClinching.length > 1 && (
                      <button
                        type="button"
                        onClick={() =>
                          setIssueModal({
                            title: "Clinching Issue Numbers",
                            serialNumber: log.serialNumberClinching || "-",
                            issues: log.issueNumbersClinching || [],
                          })
                        }
                        className="inline-flex items-center rounded-full border border-white/40 bg-white/30 px-1.5 py-0.5 font-mono text-[10px] font-bold text-white hover:bg-white/45 hover:scale-105 active:scale-95 transition-all cursor-pointer"
                        title="Click to view all issues"
                      >
                        +{log.issueNumbersClinching.length - 1}
                      </button>
                    )}
                  </div>
                )}
              </div>

              {log.serialNumberMFan && (
                <>
                  <span className="hidden sm:inline text-white/40">|</span>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-sm font-bold text-white">
                      {log.serialNumberMFan}
                    </span>
                    {log.issueNumbersMfan && log.issueNumbersMfan.length > 0 && (
                      <div className="flex items-center gap-1">
                        <span className="inline-flex items-center rounded-md border border-white/30 bg-white/20 px-2 py-0.5 font-mono text-[11px] font-semibold text-white">
                          {log.issueNumbersMfan[0]}
                        </span>
                        {log.issueNumbersMfan.length > 1 && (
                          <button
                            type="button"
                            onClick={() =>
                              setIssueModal({
                                title: "M-Fan Issue Numbers",
                                serialNumber: log.serialNumberMFan || "-",
                                issues: log.issueNumbersMfan || [],
                              })
                            }
                            className="inline-flex items-center rounded-full border border-white/40 bg-white/30 px-1.5 py-0.5 font-mono text-[10px] font-bold text-white hover:bg-white/45 hover:scale-105 active:scale-95 transition-all cursor-pointer"
                            title="Click to view all issues"
                          >
                            +{log.issueNumbersMfan.length - 1}
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>

            {/* Right: Status & Timestamp */}
            <div className="flex items-center gap-2.5">
              <span className="font-mono text-xs text-white/90">
                {formatDate(log.createdAt)}
              </span>
              <span
                className={`inline-flex items-center justify-center rounded-full px-3.5 py-0.5 text-xs font-bold uppercase tracking-wider text-white shadow-xs ${
                  log.status ? "bg-emerald-500" : "bg-rose-500"
                }`}
              >
                {log.status ? "OK" : "NG"}
              </span>
            </div>
          </div>
        </div>

        {/* 4 PROCESS ROWS INSIDE THE SAME CARD */}
        <div className="divide-y divide-gray-200 dark:divide-gray-800">
          {/* BARIS 1: CLINCHING */}
          <ProcessSectionRow
            title="CLINCHING PROCESS"
            parameters={clinchingParams}
            onOpenArrayPoints={(item) =>
              setModalData({
                parameter: item.parameter,
                parameterDesc: item.parameterDesc,
                values: Array.isArray(item.value) ? item.value : [],
                status: item.status,
              })
            }
          />

          {/* BARIS 2: M-FAN */}
          <ProcessSectionRow
            title="M-FAN ASSEMBLY & INSPECTION PROCESS"
            parameters={mfanParams}
            onOpenArrayPoints={(item) =>
              setModalData({
                parameter: item.parameter,
                parameterDesc: item.parameterDesc,
                values: Array.isArray(item.value) ? item.value : [],
                status: item.status,
              })
            }
          />

          {/* BARIS 3: ECM */}
          <ProcessSectionRow
            title="ECM ASSEMBLY PROCESS"
            parameters={ecmParams}
            onOpenArrayPoints={(item) =>
              setModalData({
                parameter: item.parameter,
                parameterDesc: item.parameterDesc,
                values: Array.isArray(item.value) ? item.value : [],
                status: item.status,
              })
            }
          />

          {/* BARIS 4: FINAL INSPECTION */}
          <ProcessSectionRow
            title="FINAL INSPECTION PROCESS"
            parameters={finalParams}
            onOpenArrayPoints={(item) =>
              setModalData({
                parameter: item.parameter,
                parameterDesc: item.parameterDesc,
                values: Array.isArray(item.value) ? item.value : [],
                status: item.status,
              })
            }
          />
        </div>
      </div>

      {/* Multi-Point Array Dialog Modal */}
      {modalData && (
        <ArrayPointsModal
          data={modalData}
          onClose={() => setModalData(null)}
        />
      )}

      {issueModal && (
        <IssueListModal
          data={issueModal}
          onClose={() => setIssueModal(null)}
        />
      )}
    </div>
  );
}

function ProcessSectionRow({
  title,
  parameters,
  onOpenArrayPoints,
}: {
  title: string;
  parameters: TraceabilityLogV2Parameter[];
  onOpenArrayPoints: (param: TraceabilityLogV2Parameter) => void;
}) {
  const isProcessFailed = parameters.some((p) => p.status === false);

  return (
    <div className="flex flex-col md:flex-row items-stretch border-b border-gray-200 dark:border-gray-800 last:border-b-0">
      {/* Left Column: Process Label (Stretches full height, soft red if false/failed) */}
      <div
        className={`flex flex-row md:flex-col items-center justify-center gap-1.5 md:gap-2 px-4 py-3 md:py-4 shrink-0 md:w-44 lg:w-48 text-center transition-colors border-b md:border-b-0 md:border-r ${
          isProcessFailed
            ? "border-rose-200 bg-rose-50/70 text-rose-800 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-300"
            : "border-gray-200 bg-gray-50/75 text-gray-800 dark:border-gray-800 dark:bg-gray-900/50 dark:text-gray-200"
        }`}
      >
        <h3 className="text-xs font-bold uppercase tracking-wider leading-tight">
          {title}
        </h3>
        <span
          className={`text-[10px] font-medium ${
            isProcessFailed
              ? "text-rose-600 dark:text-rose-400"
              : "text-gray-500 dark:text-gray-400"
          }`}
        >
          {parameters.length} Parameter{parameters.length === 1 ? "" : "s"}
        </span>
      </div>

      {/* Right Area: Auto-wrapping parameters grid */}
      <div className="min-w-0 flex-1 p-3.5">
        <div className="grid grid-cols-[repeat(auto-fit,minmax(170px,1fr))] gap-2.5">
          {parameters.map((param, i) => {
            const isArray = Array.isArray(param.value);
            const isFailed = param.status === false;

            return (
              <div
                key={`${param.parameter}-${i}`}
                className={`min-w-0 overflow-hidden rounded-lg border p-2.5 text-center transition-all ${
                  isFailed
                    ? "border-rose-200 bg-rose-50/60 dark:border-rose-500/30 dark:bg-rose-500/10"
                    : "border-gray-200 bg-white hover:border-brand-300 dark:border-gray-800 dark:bg-gray-900"
                }`}
              >
                <div className="flex min-h-9 items-start justify-center">
                  <span
                    className={`block max-h-9 max-w-full overflow-hidden break-words text-[10px] font-medium leading-[18px] ${
                      isFailed
                        ? "text-rose-800 dark:text-rose-300"
                        : "text-gray-600 dark:text-gray-400"
                    }`}
                    title={param.parameterDesc || param.parameter}
                  >
                    {param.parameterDesc || param.parameter}
                  </span>
                </div>

                <div className="mt-2 flex min-w-0 items-center justify-center">
                  {isArray ? (
                    <button
                      onClick={() => onOpenArrayPoints(param)}
                      className={`inline-flex h-7 min-w-0 max-w-full items-center justify-center gap-1.5 rounded-md border px-2 font-mono text-xs font-bold transition-all hover:scale-[1.02] ${
                        !isFailed
                          ? "border-sky-300 bg-sky-50 text-sky-800 hover:bg-sky-100 dark:border-sky-500/40 dark:bg-sky-500/15 dark:text-sky-300"
                          : "border-rose-300 bg-rose-50 text-rose-700 hover:bg-rose-100 dark:border-rose-500/40 dark:bg-rose-500/20 dark:text-rose-300"
                      }`}
                      type="button"
                    >
                      <span className="truncate">
                        {(param.value as unknown[]).length} Points
                      </span>
                      <svg className="size-3.5 fill-none stroke-current stroke-2" viewBox="0 0 24 24">
                        <path d="M2.5 12s3.5-6 9.5-6 9.5 6 9.5 6-3.5 6-9.5 6-9.5-6Z" />
                        <circle cx="12" cy="12" r="2.5" />
                      </svg>
                    </button>
                  ) : (
                    <span
                      className={`font-mono text-xs font-bold truncate ${
                        isFailed
                          ? "text-rose-600 dark:text-rose-400"
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
          {parameters.length === 0 && (
            <div className="col-span-full py-4 text-center text-xs text-gray-400">
              No parameters recorded for this process.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

const getCheckPointInfo = (
  value: unknown
): { label: string; isPassed: boolean; statusText: string } => {
  const s = String(value ?? "").trim().toLowerCase();
  if (s === "1" || s === "ok" || s === "true" || s === "1.0" || s === "1.00") {
    return { label: "1", isPassed: true, statusText: "OK" };
  }
  if (s === "2" || s === "ng") {
    return { label: "2", isPassed: false, statusText: "NG" };
  }
  if (
    s === "0" ||
    s === "error" ||
    s === "err" ||
    s === "fail" ||
    s === "0.0" ||
    s === "0.00"
  ) {
    return { label: "0", isPassed: false, statusText: "ERROR" };
  }
  return { label: String(value ?? "-"), isPassed: false, statusText: "NG" };
};

function ArrayPointsModal({
  data,
  onClose,
}: {
  data: ArrayPointModalState;
  onClose: () => void;
}) {
  const isCheckPoint =
    data.parameter.toUpperCase().includes("CHECK_POINT") ||
    (data.parameterDesc || "").toLowerCase().includes("check point");

  const points = data.values;
  const passedCount = isCheckPoint
    ? points.filter((p) => getCheckPointInfo(p).isPassed).length
    : points.filter((p) => getBooleanValue(p) !== false).length;
  const rejectedCount = points.length - passedCount;

  return (
    <Modal className="mx-4 max-w-5xl overflow-hidden p-0" isOpen={true} onClose={onClose}>
      <div className="border-b border-gray-200 bg-white px-6 py-4 dark:border-gray-800 dark:bg-gray-950">
        <div className="flex flex-wrap items-center justify-between gap-3 pr-10">
          <div>
            <h2 className="text-base font-bold text-gray-900 dark:text-white">
              {data.parameterDesc || data.parameter}
            </h2>
          </div>
          <span
            className={`rounded-full border px-3 py-0.5 text-xs font-bold uppercase ${
              rejectedCount === 0
                ? "border-success-200 bg-success-50 text-success-700 dark:border-success-500/30 dark:bg-success-500/15 dark:text-success-300"
                : "border-error-200 bg-error-50 text-error-700 dark:border-error-500/30 dark:bg-error-500/15 dark:text-error-300"
            }`}
          >
            {points.length} Points ({passedCount} OK / {rejectedCount} NG)
          </span>
        </div>
      </div>

      <div className="max-h-[65vh] overflow-y-auto bg-gray-50 p-6 dark:bg-gray-950">
        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8">
          {points.map((value, index) => {
            const cpInfo = isCheckPoint ? getCheckPointInfo(value) : null;
            const isPassed = cpInfo ? cpInfo.isPassed : getBooleanValue(value) !== false;
            const displayLabel = cpInfo
              ? `${cpInfo.label} (${cpInfo.statusText})`
              : formatSingleValue(value);

            return (
              <div
                key={index}
                className={`rounded-lg border bg-white p-2.5 text-center transition-all dark:bg-gray-900 ${
                  isPassed
                    ? "border-gray-200 hover:border-brand-300 dark:border-gray-800"
                    : "border-error-300 bg-error-50/50 dark:border-error-500/40 dark:bg-error-500/10"
                }`}
              >
                <span className="font-mono text-[10px] font-semibold text-gray-400 block">
                  P-{String(index + 1).padStart(2, "0")}
                </span>
                <p
                  className={`mt-1 font-mono text-xs font-bold ${
                    isPassed ? "text-gray-900 dark:text-white" : "text-error-600 dark:text-error-400"
                  }`}
                >
                  {displayLabel}
                </p>
              </div>
            );
          })}
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

function IssueListModal({
  data,
  onClose,
}: {
  data: { title: string; serialNumber: string; issues: string[] };
  onClose: () => void;
}) {
  return (
    <Modal className="mx-4 max-w-md overflow-hidden p-0" isOpen={true} onClose={onClose}>
      <div className="border-b border-gray-200 bg-white px-6 py-4 dark:border-gray-800 dark:bg-gray-950">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-gray-900 dark:text-white">
              {data.title}
            </h3>
            <p className="font-mono text-xs text-gray-500 dark:text-gray-400">
              Serial: {data.serialNumber}
            </p>
          </div>
          <span className="rounded-full bg-brand-50 px-2.5 py-0.5 font-mono text-xs font-bold text-brand-700 dark:bg-brand-500/15 dark:text-brand-300">
            {data.issues.length} Issues
          </span>
        </div>
      </div>

      <div className="max-h-[50vh] overflow-y-auto bg-gray-50 p-6 dark:bg-gray-900">
        <div className="grid grid-cols-1 gap-2">
          {data.issues.map((issue, idx) => (
            <div
              key={idx}
              className="flex items-center justify-between rounded-lg border border-gray-200 bg-white px-3.5 py-2 dark:border-gray-800 dark:bg-gray-950"
            >
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs font-medium text-gray-400">
                  #{idx + 1}
                </span>
                <span className="font-mono text-sm font-bold text-gray-900 dark:text-white">
                  {issue}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="flex justify-end border-t border-gray-200 bg-white px-6 py-3 dark:border-gray-800 dark:bg-gray-950">
        <button
          className="h-8 rounded-lg bg-brand-500 px-4 text-xs font-semibold text-white hover:bg-brand-600 transition-colors"
          onClick={onClose}
          type="button"
        >
          Close
        </button>
      </div>
    </Modal>
  );
}
