"use client";

import { formatShortDateTime as formatDate } from "@/utils/formatDateTime";
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


const isEndPlateWidthParameter = (
  parameter?: string | null,
  parameterDesc?: string | null
): boolean => {
  const text = `${parameter ?? ""} ${parameterDesc ?? ""}`
    .trim()
    .toLowerCase();

  return text.includes("end_plate_width") || text.includes("end plate width");
};

const isNumericOkNgValue = (value: unknown): boolean => {
  if (typeof value === "number") return value === 1 || value === 2;
  if (typeof value === "string") {
    const s = value.trim();
    return s === "1" || s === "2";
  }
  return false;
};

const isOkNgValue = (value: unknown, numericOkNg = false): boolean => {
  if (numericOkNg && isNumericOkNgValue(value)) return true;
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

const isPointFailed = (value: unknown, numericOkNg = false): boolean => {
  if (numericOkNg) {
    if (typeof value === "number") return value === 2;
    if (typeof value === "string") return value.trim() === "2";
  }
  if (value === false) return true;
  if (typeof value === "string") {
    const s = value.trim().toLowerCase();
    return ["ng", "false", "rejected", "error", "err", "fail", "failed"].includes(s);
  }
  return false;
};

const isOkNgArray = (values: unknown[], numericOkNg = false): boolean => {
  if (!values || values.length === 0) return false;
  return values.every((p) => isOkNgValue(p, numericOkNg));
};

const formatOkNgValue = (value: unknown, numericOkNg = false): string => {
  if (numericOkNg && isNumericOkNgValue(value)) {
    return isPointFailed(value, true) ? "NG" : "OK";
  }

  return formatSingleValue(value);
};

const getArrayDisplayValue = (
  values: unknown[],
  numericOkNg = false
): { text: string; isOkNg: boolean; isFailed: boolean } => {
  if (!values || values.length === 0) {
    return { text: "-", isOkNg: false, isFailed: false };
  }

  const isOkNg = isOkNgArray(values, numericOkNg);

  if (isOkNg) {
    const hasNg = values.some((p) => isPointFailed(p, numericOkNg));
    return {
      text: hasNg ? "NG" : "OK",
      isOkNg: true,
      isFailed: hasNg,
    };
  }

  const numericValues = values
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
  if (value === null || value === undefined || value === "") return "-";
  if (typeof value === "boolean") return value ? "true" : "false";
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
  const isProcessFailed = parameters.some((p) => {
    const isArray = Array.isArray(p.value);
    const numericOkNg = isEndPlateWidthParameter(p.parameter, p.parameterDesc);
    if (isArray) {
      const arrayInfo = getArrayDisplayValue(p.value as unknown[], numericOkNg);
      return arrayInfo.isOkNg && arrayInfo.isFailed;
    }
    return (
      isOkNgValue(p.value, numericOkNg) &&
      isPointFailed(p.value, numericOkNg)
    );
  });

  return (
    <div className="flex flex-col md:flex-row items-stretch border-b border-gray-200 dark:border-gray-800 last:border-b-0">
      {/* Left Column: Process Label */}
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
            const numericOkNg = isEndPlateWidthParameter(
              param.parameter,
              param.parameterDesc
            );
            const arrayInfo = isArray
              ? getArrayDisplayValue(param.value as unknown[], numericOkNg)
              : null;
            const isOkNg = isArray
              ? Boolean(arrayInfo?.isOkNg)
              : isOkNgValue(param.value, numericOkNg);

            const isFailed = isOkNg
              ? isArray
                ? Boolean(arrayInfo?.isFailed)
                : isPointFailed(param.value, numericOkNg)
              : false;

            return (
              <div
                key={`${param.parameter}-${i}`}
                className={`min-w-0 overflow-hidden rounded-lg p-2.5 text-center transition-all ${
                  isFailed
                    ? "border-2 border-red-500 bg-red-50/70 shadow-sm shadow-red-500/10 dark:border-red-500/80 dark:bg-red-950/30"
                    : "border border-gray-200 bg-white hover:border-brand-300 dark:border-gray-800 dark:bg-gray-900"
                }`}
              >
                <div className="flex min-h-9 items-start justify-center">
                  <span
                    className={`block max-h-9 max-w-full overflow-hidden break-words text-[10px] font-medium leading-[18px] ${
                      isFailed
                        ? "text-red-800 dark:text-red-300"
                        : "text-gray-600 dark:text-gray-400"
                    }`}
                    title={param.parameterDesc || param.parameter}
                  >
                    {param.parameterDesc || param.parameter}
                  </span>
                </div>

                <div className="mt-2 flex min-w-0 items-center justify-center">
                  {isArray && arrayInfo ? (
                    <button
                      onClick={() => onOpenArrayPoints(param)}
                      className={`inline-flex h-7 min-w-0 max-w-full items-center justify-center gap-1.5 rounded-md border px-2.5 font-mono text-xs font-bold transition-all hover:scale-[1.02] ${
                        isOkNg
                          ? isFailed
                            ? "border-2 border-red-500 bg-red-100 text-red-700 hover:bg-red-200 dark:border-red-500/80 dark:bg-red-900/40 dark:text-red-300"
                            : "border-emerald-300 bg-emerald-50 text-emerald-800 hover:bg-emerald-100 dark:border-emerald-500/40 dark:bg-emerald-500/15 dark:text-emerald-300"
                          : "border-gray-200 bg-gray-50 text-gray-800 hover:bg-gray-100 dark:border-gray-700 dark:bg-gray-800/80 dark:text-gray-200 dark:hover:bg-gray-800"
                      }`}
                      title={`Click to view ${(param.value as unknown[]).length} points detail`}
                      type="button"
                    >
                      <span className="truncate">
                        {arrayInfo.text}
                      </span>
                      <svg
                        className="size-3.5 shrink-0 opacity-70 fill-none stroke-current stroke-2"
                        viewBox="0 0 24 24"
                      >
                        <path d="M2.5 12s3.5-6 9.5-6 9.5 6 9.5 6-3.5 6-9.5 6-9.5-6Z" />
                        <circle cx="12" cy="12" r="2.5" />
                      </svg>
                    </button>
                  ) : (
                    <span
                      className={`font-mono text-xs font-bold truncate ${
                        isOkNg
                          ? isFailed
                            ? "text-red-600 dark:text-red-400"
                            : "text-emerald-600 dark:text-emerald-400"
                          : "text-gray-900 dark:text-white"
                      }`}
                      title={formatSingleValue(param.value)}
                    >
                      {formatOkNgValue(param.value, numericOkNg)}
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


function ArrayPointsModal({
  data,
  onClose,
}: {
  data: ArrayPointModalState;
  onClose: () => void;
}) {
  const points = data.values;
  const numericOkNg = isEndPlateWidthParameter(data.parameter, data.parameterDesc);
  const isOkNgType = isOkNgArray(points, numericOkNg);

  const passedCount = isOkNgType
    ? points.filter((p) => !isPointFailed(p, numericOkNg)).length
    : 0;
  const rejectedCount = isOkNgType ? points.length - passedCount : 0;
  const isFailedOverall = isOkNgType && rejectedCount > 0;

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
            const isFailed = isOkNgType && isPointFailed(value, numericOkNg);
            const displayLabel = formatOkNgValue(value, numericOkNg);

            return (
              <div
                key={index}
                className={`rounded-lg p-2.5 text-center transition-all ${
                  isOkNgType
                    ? isFailed
                      ? "border-2 border-red-500 bg-red-50/80 shadow-sm shadow-red-500/10 dark:border-red-500 dark:bg-red-950/40"
                      : "border border-emerald-300 bg-emerald-50/60 dark:border-emerald-500/40 dark:bg-emerald-950/30"
                    : "border border-gray-200 bg-white hover:border-brand-300 dark:border-gray-800 dark:bg-gray-900"
                }`}
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
      <div className="border-b border-gray-200 bg-white px-6 py-4 pr-16 dark:border-gray-800 dark:bg-gray-950 sm:pr-20">
        <div className="flex items-start">
          <div className="min-w-0">
            <h3 className="text-base font-bold text-gray-900 dark:text-white">
              {data.title}
            </h3>
            <p className="font-mono text-xs text-gray-500 dark:text-gray-400">
              Serial: {data.serialNumber}
            </p>
            <p className="mt-1 text-xs font-semibold text-brand-600 dark:text-brand-300">
              {data.issues.length} Issues
            </p>
          </div>
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
