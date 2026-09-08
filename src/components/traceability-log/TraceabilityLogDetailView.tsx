"use client";

import PageLoader from "@/components/common/PageLoader";
import { Modal } from "@/components/ui/modal";
import { useToast } from "@/context/ToastContext";
import { ChevronLeftIcon } from "@/icons";
import TraceabilityLogService, {
  ProcessLogFullValueDetail,
  ProcessLogFullValues,
} from "@/services/TraceabilityLogService";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

type TraceabilityLogDetailViewProps = {
  identifier: string;
};

type DetailTableConfig = {
  key: string;
  title: string;
  serialNumberCode?: string;
  details: ProcessLogFullValueDetail[];
};

type ProcessDetailGroup = {
  processCode?: string;
  processName?: string;
  details: ProcessLogFullValueDetail[];
};

type ParameterColumn = {
  key: string;
  parameterCode?: string;
  parameterName?: string;
};

type MeasurementDetail = ProcessLogFullValueDetail & {
  expectedCount?: number;
  title?: string;
  unit?: string;
};

type MeasurementKind = "clinchingHeight" | "endPlate";

type MeasurementPoint = {
  index: number;
  value: ProcessLogFullValueDetail["value"];
};

const lotParameterHeaderKeys = new Set([
  "CORE ASM",
  "CORE ASM RESULT",
  "UPPER TANK ASM",
  "UPPER TANK ASM RESULT",
  "LOWER TANK ASM",
  "LOWER TANK ASM RESULT",
  "FAN ASM",
  "FAN ASM RESULT",
  "MOTOR ASM",
  "MOTOR ASM RESULT",
  "FUN GUIDE ASM",
  "FUN GUIDE ASM RESULT",
  "LOT CORE ASM",
  "LOT CORE ASM RESULT",
  "LOT UPPER TANK ASM",
  "LOT UPPER TANK ASM RESULT",
  "LOT LOWER TANK ASM",
  "LOT LOWER TANK ASM RESULT",
  "LOT FAN ASM",
  "LOT FAN ASM RESULT",
  "LOT MOTOR ASM",
  "LOT MOTOR ASM RESULT",
  "LOT FUN GUIDE ASM",
  "LOT FUN GUIDE ASM RESULT",
]);

const dateFormatter = new Intl.DateTimeFormat("en-GB", {
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  month: "short",
  year: "numeric",
});

const numericIdentifierPattern = /^\d+$/;
const numericTextPattern = /^-?\d+([,.]\d+)?$/;

const formatDate = (value?: string) => {
  if (!value) {
    return "-";
  }

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "-" : dateFormatter.format(date);
};

export const formatResult = (value?: boolean) => {
  if (typeof value !== "boolean") {
    return "-";
  }

  return value ? "OK" : "NG";
};

const getBooleanValue = (value: unknown) => {
  if (typeof value === "boolean") {
    return value;
  }

  if (typeof value !== "string") {
    return null;
  }

  const normalizedValue = value.trim().toLowerCase();
  if (normalizedValue === "true") {
    return true;
  }

  if (normalizedValue === "false") {
    return false;
  }

  return null;
};

const trimNumericText = (value: string) => {
  const trimmedValue = value.trim();

  if (!numericTextPattern.test(trimmedValue)) {
    return trimmedValue;
  }

  const separator = trimmedValue.includes(",") ? "," : ".";
  const [integerPart, decimalPart] = trimmedValue.split(separator);

  if (!decimalPart) {
    return integerPart;
  }

  const compactDecimal = decimalPart.replace(/0+$/, "");
  return compactDecimal
    ? `${integerPart}${separator}${compactDecimal}`
    : integerPart;
};

const formatValue = (value: ProcessLogFullValueDetail["value"]) => {
  if (value === null || value === undefined || value === "") {
    return "-";
  }

  const booleanValue = getBooleanValue(value);
  if (typeof booleanValue === "boolean") {
    return booleanValue ? "OK" : "NG";
  }

  if (typeof value === "number") {
    return new Intl.NumberFormat("en-US", {
      maximumFractionDigits: 4,
    }).format(value);
  }

  return trimNumericText(String(value));
};

const stripMeasurementUnit = (value: ProcessLogFullValueDetail["value"]) =>
  formatValue(value).replace(/\s*(?:mm|rpm|a)\b/gi, "").trim();

const getValueClassName = (value: ProcessLogFullValueDetail["value"]) => {
  const booleanValue = getBooleanValue(value);

  if (typeof booleanValue !== "boolean") {
    return "text-gray-800 dark:text-white/90";
  }

  return booleanValue
    ? "text-success-600 dark:text-success-400"
    : "text-error-600 dark:text-error-400";
};

const getDetailCountLabel = (details: ProcessLogFullValueDetail[]) => {
  const processCount = new Set(
    details
      .map((detail) => detail.processCode ?? detail.processName)
      .filter(Boolean)
  ).size;

  return `${details.length} parameter${details.length === 1 ? "" : "s"} / ${
    processCount || 0
  } process${processCount === 1 ? "" : "es"}`;
};

const groupDetailsByProcess = (
  details: ProcessLogFullValueDetail[]
): ProcessDetailGroup[] => {
  const groups = new Map<string, ProcessDetailGroup>();

  details.forEach((detail) => {
    const key =
      detail.processCode ?? detail.processName ?? `process-${groups.size}`;
    const existingGroup = groups.get(key);

    if (existingGroup) {
      existingGroup.details.push(detail);
      return;
    }

    groups.set(key, {
      processCode: detail.processCode,
      processName: detail.processName,
      details: [detail],
    });
  });

  return Array.from(groups.values());
};

const getParameterColumnKey = (detail: ProcessLogFullValueDetail) =>
  detail.parameterCode ?? detail.parameterName ?? "unknown-parameter";

const getParameterColumns = (
  details: ProcessLogFullValueDetail[]
): ParameterColumn[] => {
  const columns = new Map<string, ParameterColumn>();

  details.forEach((detail) => {
    const key = getParameterColumnKey(detail);

    if (!columns.has(key)) {
      columns.set(key, {
        key,
        parameterCode: detail.parameterCode,
        parameterName: detail.parameterName,
      });
    }
  });

  return Array.from(columns.values());
};

const getProcessParameterDetails = (
  group: ProcessDetailGroup,
  column: ParameterColumn
) =>
  group.details.filter(
    (detail) => getParameterColumnKey(detail) === column.key
  );

const formatCellValue = (details: ProcessLogFullValueDetail[]) => {
  if (details.length === 0) {
    return "-";
  }

  return details.map((detail) => formatValue(detail.value)).join(", ");
};

const formatColumnHeader = (value?: string) => {
  if (!value) {
    return "-";
  }

  return value
    .replace(/_/g, " ")
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
};

const normalizeHeaderKey = (value?: string) =>
  value?.trim().replace(/[_\s]+/g, " ").toUpperCase();

const isLotParameterColumn = (column: ParameterColumn) =>
  [column.parameterName, column.parameterCode].some((value) => {
    const key = normalizeHeaderKey(value);
    return Boolean(key && lotParameterHeaderKeys.has(key));
  });

const formatParameterColumnHeader = (column: ParameterColumn) => {
  const formattedHeader = formatColumnHeader(
    column.parameterName ?? column.parameterCode
  );

  if (formattedHeader === "-" || !isLotParameterColumn(column)) {
    return formattedHeader;
  }

  const lotHeader = formattedHeader.toLowerCase().startsWith("lot ")
    ? formattedHeader
    : `Lot ${formattedHeader}`;

  return lotHeader.replace(/\s+Result$/i, "");
};

const shouldDisplayCode = (value?: string) => Boolean(value && !value.includes("_"));

const resolveSerialNumberCode = async (
  identifier: string,
  signal: AbortSignal
) => {
  if (!numericIdentifierPattern.test(identifier)) {
    return identifier;
  }

  const response = await TraceabilityLogService.getTraceabilityLog(Number(identifier), {
    signal,
  });
  const serialNumberCode = response.data.serialNumberCode;

  if (!serialNumberCode) {
    throw new Error("Serial number was not found for this traceability log.");
  }

  return serialNumberCode;
};

export default function TraceabilityLogDetailView({
  identifier,
}: TraceabilityLogDetailViewProps) {
  const router = useRouter();
  const toast = useToast();
  const [processLog, setProcessLog] = useState<ProcessLogFullValues | null>(
    null
  );
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isCheckPointModalOpen, setIsCheckPointModalOpen] = useState(false);
  const [selectedMeasurement, setSelectedMeasurement] =
    useState<MeasurementDetail | null>(null);

  useEffect(() => {
    const controller = new AbortController();

    const loadProcessLog = async () => {
      try {
        setError(null);
        setIsLoading(true);

        const serialNumberCode = await resolveSerialNumberCode(
          identifier,
          controller.signal
        );
        const response = await TraceabilityLogService.getTraceabilityLogFullValues(
          serialNumberCode,
          {
            signal: controller.signal,
          }
        );

        setProcessLog(response.data);
      } catch (fetchError: unknown) {
        if (
          fetchError instanceof DOMException &&
          fetchError.name === "AbortError"
        ) {
          return;
        }

        const message =
          fetchError instanceof Error
            ? fetchError.message
            : "Failed to load traceability log detail";
        setError(message);
        toast.error({
          title: "Failed to load details",
          message,
        });
      } finally {
        if (!controller.signal.aborted) {
          setIsLoading(false);
        }
      }
    };

    loadProcessLog();

    return () => controller.abort();
  }, [identifier, toast]);

  const detailTables = useMemo<DetailTableConfig[]>(() => {
    if (!processLog) {
      return [];
    }

    return [
      {
        key: "clinching",
        title: "Clinching",
        serialNumberCode: processLog.clinching.serialNumberCode,
        details: processLog.clinching.details,
      },
      {
        key: "mFan",
        title: "M Fan",
        serialNumberCode: processLog.mFan.serialNumberCode,
        details: processLog.mFan.details,
      },
      {
        key: "overall",
        title: "Overall",
        serialNumberCode: processLog.serialNumberCode,
        details: processLog.overall,
      },
    ];
  }, [processLog]);

  if (isLoading) {
    return <PageLoader />;
  }

  if (error || !processLog) {
    return (
      <div className="rounded-2xl border border-error-200 bg-error-50 p-6 text-error-700 dark:border-error-500/30 dark:bg-error-500/10 dark:text-error-300">
        <h2 className="text-lg font-semibold">Traceability detail unavailable</h2>
        <p className="mt-2 text-sm">{error ?? "Traceability log was not found."}</p>
        <button
          className="mt-5 rounded-lg bg-error-500 px-4 py-2 text-sm font-semibold text-white hover:bg-error-600"
          onClick={() => router.push("/traceability-log")}
          type="button"
        >
          Back to Traceability Log
        </button>
      </div>
    );
  }

  return (
    <div className="mx-4 max-w-[1440px] space-y-5 xl:mx-auto">
      <div className="flex flex-col gap-4 border-b border-gray-200 pb-5 dark:border-gray-800 sm:flex-row sm:items-center sm:justify-between">
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
            <h1 className="text-2xl font-semibold text-gray-800 dark:text-white/90">
              Traceability Log Multi-Row Record Sheet
            </h1>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Traceability detail for {processLog.serialNumberCode ?? identifier}
            </p>
          </div>
        </div>
      </div>

      <MultiRowRecordSheet detailTables={detailTables} identifier={identifier} onOpenCheckPoints={() => setIsCheckPointModalOpen(true)} onOpenMeasurement={setSelectedMeasurement} processLog={processLog} />
      <CheckPointModal isOpen={isCheckPointModalOpen} onClose={() => setIsCheckPointModalOpen(false)} processLog={processLog} />
      <MeasurementModal detail={selectedMeasurement} onClose={() => setSelectedMeasurement(null)} />
    </div>
  );
}

const getDetail = (details: ProcessLogFullValueDetail[], parameterName: string) =>
  details.find((detail) => detail.parameterName === parameterName);

const getDetailAlias = (
  details: ProcessLogFullValueDetail[],
  parameterNames: string[]
) =>
  details.find((detail) =>
    parameterNames.some(
      (parameterName) =>
        detail.parameterName?.toLowerCase() === parameterName.toLowerCase() ||
        detail.parameterCode?.replace(/_/g, " ").toLowerCase() ===
          parameterName.toLowerCase()
    )
  );

const getMeasurementPointNumber = (
  detail: ProcessLogFullValueDetail,
  kind: MeasurementKind
) => {
  const code = detail.parameterCode ?? "";
  const name = detail.parameterName ?? "";
  const pattern =
    kind === "clinchingHeight"
      ? /CLINCHING_HEIGHT_(\d+)_(?:VALUE|RESULT)$/i
      : /END_PLATE_WIDTH_(\d+)_(?:VALUE|RESULT)$/i;
  const namePattern =
    kind === "clinchingHeight"
      ? /Clinching Height\s+(\d+)/i
      : /End Plate Width\s+(\d+)/i;
  const match = code.match(pattern) ?? name.match(namePattern);

  return match ? Number(match[1]) : null;
};

const getMeasurementPoints = (
  details: ProcessLogFullValueDetail[],
  kind: MeasurementKind
) =>
  details
    .map((detail) => ({
      index: getMeasurementPointNumber(detail, kind),
      value: detail.value,
    }))
    .filter(
      (point): point is MeasurementPoint =>
        typeof point.index === "number" && point.index > 0
    )
    .sort((first, second) => first.index - second.index);

const getMeasurementValues = (
  summaryDetail: ProcessLogFullValueDetail | undefined,
  points: MeasurementPoint[]
) => {
  if (summaryDetail?.values?.length) {
    return summaryDetail.values;
  }

  return points.map((point) => point.value).filter((value) => value != null);
};

const toNumberValue = (value: ProcessLogFullValueDetail["value"]) => {
  if (typeof value === "number") {
    return value;
  }

  if (typeof value !== "string") {
    return null;
  }

  const parsedValue = Number(value.replace(",", "."));
  return Number.isFinite(parsedValue) ? parsedValue : null;
};

const buildMeasurementDetail = (
  details: ProcessLogFullValueDetail[],
  kind: MeasurementKind
): MeasurementDetail | undefined => {
  const isClinchingHeight = kind === "clinchingHeight";
  const summaryDetail = getDetail(
    details,
    isClinchingHeight ? "Clinching Height Avg" : "End Plate Width"
  );
  const points = getMeasurementPoints(details, kind);
  const values = getMeasurementValues(summaryDetail, points);

  if (!summaryDetail && values.length === 0) {
    return undefined;
  }

  if (summaryDetail) {
    return {
      ...summaryDetail,
      expectedCount: isClinchingHeight ? 18 : 60,
      title: isClinchingHeight
        ? "Clinching Avg (18 Pts)"
        : "End Plate (60 Pts)",
      unit: isClinchingHeight ? "mm" : undefined,
      values,
    };
  }

  const numericValues = values.map(toNumberValue).filter((value) => value != null);
  const passedCount = values.filter((value) => getBooleanValue(value) === true).length;

  return {
    parameterName: isClinchingHeight ? "Clinching Height Avg" : "End Plate Width",
    title: isClinchingHeight ? "Clinching Avg (18 Pts)" : "End Plate (60 Pts)",
    unit: isClinchingHeight ? "mm" : undefined,
    value: isClinchingHeight && numericValues.length
      ? `${(numericValues.reduce((total, value) => total + value, 0) / numericValues.length).toFixed(2)} mm`
      : `${passedCount}/${values.length} OK`,
    values,
    expectedCount: isClinchingHeight ? 18 : 60,
  };
};

function MatrixCell({ detail, label, onClick }: { detail?: ProcessLogFullValueDetail; label: string; onClick?: () => void }) {
  const valueClassName = `mt-1 truncate font-mono text-sm font-semibold ${detail ? getValueClassName(detail.value) : "text-gray-400 dark:text-gray-500"}`;
  const isEndPlate = label.toLowerCase().includes("end plate");

  return <div className="min-w-0 px-3 py-4"><p className="truncate text-[10px] font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">{label}</p>{detail && onClick ? <button aria-label={`View ${label} details`} className={`mt-1 inline-flex max-w-full items-center justify-between gap-2 truncate rounded-lg border bg-white px-3 py-1.5 font-mono text-sm font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-brand-500/40 dark:bg-gray-900 ${isEndPlate ? "border-success-200 text-success-700 hover:bg-success-50 dark:border-success-500/30 dark:text-success-400 dark:hover:bg-success-500/10" : "border-sky-200 text-gray-800 hover:bg-sky-50 dark:border-sky-500/30 dark:text-white/90 dark:hover:bg-sky-500/10"}`} onClick={onClick} type="button"><span className="truncate">{formatValue(detail.value)}</span><span className={`inline-flex size-4 shrink-0 items-center justify-center ${isEndPlate ? "text-success-600 dark:text-success-400" : "text-sky-500 dark:text-sky-400"}`}><MeasurementEyeIcon /></span></button> : <p className={valueClassName}>{detail ? formatValue(detail.value) : "-"}</p>}</div>;
}

function MeasurementEyeIcon() {
  return (
    <svg
      aria-hidden="true"
      className="size-3.5"
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="2"
      viewBox="0 0 24 24"
    >
      <path d="M2.5 12s3.5-6 9.5-6 9.5 6 9.5 6-3.5 6-9.5 6-9.5-6-9.5-6Z" />
      <circle cx="12" cy="12" r="2.5" />
    </svg>
  );
}

function MultiRowRecordSheet({
  detailTables,
  identifier,
  onOpenCheckPoints,
  onOpenMeasurement,
  processLog,
}: {
  detailTables: DetailTableConfig[];
  identifier: string;
  onOpenCheckPoints: () => void;
  onOpenMeasurement: (detail: MeasurementDetail) => void;
  processLog: ProcessLogFullValues;
}) {
  const clinching =
    detailTables.find((table) => table.key === "clinching")?.details ?? [];
  const mFan =
    detailTables.find((table) => table.key === "mFan")?.details ?? [];
  const overall =
    detailTables.find((table) => table.key === "overall")?.details ?? [];
  const serialClinching =
    detailTables.find((table) => table.key === "clinching")
      ?.serialNumberCode ??
    processLog.serialNumberCode ??
    identifier;
  const serialMFan =
    detailTables.find((table) => table.key === "mFan")?.serialNumberCode ?? "-";
  const checkPoints = getDetail(overall, "Check Points");
  const clinchingHeight = buildMeasurementDetail(clinching, "clinchingHeight");
  const endPlate = buildMeasurementDetail(clinching, "endPlate");

  return (
    <article className="overflow-x-auto rounded-lg border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03]">
      <div className="min-w-[1280px]">
        <header className="flex items-center justify-between border-b border-brand-500 bg-[#6D8AF3] px-5 py-3 text-white dark:border-brand-400 dark:bg-brand-600">
          <div className="flex items-center gap-3 text-xs">
            <span className="inline-flex size-7 items-center justify-center rounded-full bg-white/20 font-mono font-bold text-white">
              01
            </span>
            <span className="font-mono text-white/85">
              {formatDate(processLog.createdAt)}
            </span>
            <span className="font-mono font-bold text-white">
              {serialClinching}
            </span>
            <span className="text-white/60">|</span>
            <span className="font-mono font-bold text-white">{serialMFan}</span>
          </div>
          <span
            className={`rounded-full border px-3 py-1 text-xs font-semibold ${
              processLog.status
                ? "border-success-200 bg-success-50 text-success-700"
                : "border-error-200 bg-error-50 text-error-700"
            }`}
          >
            {processLog.status ? "UNIT PASSED" : "UNIT REJECTED"}
          </span>
        </header>

        <div className="grid grid-cols-10 divide-x divide-gray-200 border-b border-gray-200 dark:divide-gray-800 dark:border-gray-800">
          <MatrixCell
            detail={{ parameterName: "Serial Clinching", value: serialClinching }}
            label="Serial Clinching"
          />
          <MatrixCell label="Core Asm" detail={getDetail(clinching, "Core Asm")} />
          <MatrixCell label="Upper Tank" detail={getDetail(clinching, "Upper Tank Asm")} />
          <MatrixCell label="Lower Tank" detail={getDetail(clinching, "Lower Tank Asm")} />
          <MatrixCell label="O-Ring Set" detail={getDetail(clinching, "O-Ring Set")} />
          <MatrixCell label="NG Box (Short)" detail={getDetail(clinching, "NG Box Short Side")} />
          <MatrixCell
            detail={clinchingHeight}
            label="Clinching Avg (18 Pts)"
            onClick={clinchingHeight ? () => onOpenMeasurement(clinchingHeight) : undefined}
          />
          <MatrixCell
            detail={endPlate}
            label="End Plate (60 Pts)"
            onClick={endPlate ? () => onOpenMeasurement(endPlate) : undefined}
          />
          <MatrixCell label="NG Box (Long)" detail={getDetail(clinching, "NG Box Long Side")} />
          <MatrixCell
            label="HE Process"
            detail={getDetailAlias(clinching, ["HE Process", "Cap Type Position"])}
          />
        </div>

        <div className="grid grid-cols-10 divide-x divide-gray-200 border-b border-gray-200 bg-gray-50/50 dark:divide-gray-800 dark:border-gray-800 dark:bg-gray-900/25">
          <MatrixCell label="HE Leak" detail={getDetailAlias(clinching, ["HE Leak"])} />
          <MatrixCell
            label="HE Leakage"
            detail={getDetailAlias(clinching, ["HE Leak Last Leakage", "Leak Last Leakage"])}
          />
          <MatrixCell
            detail={{ parameterName: "Serial M-Fan", value: serialMFan }}
            label="Serial M-Fan"
          />
          <MatrixCell label="Lot Fan Asm" detail={getDetail(mFan, "Lot Fan Asm")} />
          <MatrixCell label="Lot Motor Asm" detail={getDetail(mFan, "Lot Motor Asm")} />
          <MatrixCell label="Lot Guide Asm" detail={getDetail(mFan, "Lot Guide Asm")} />
          <MatrixCell label="MFan Bolt Tighten" detail={getDetail(mFan, "Bolt Tighten")} />
          <MatrixCell label="Bolt Qty" detail={getDetail(mFan, "Bolt Qty")} />
          <MatrixCell label="Nut Tighten" detail={getDetail(mFan, "Nut Tighten")} />
          <MatrixCell
            label="Rotation Max"
            detail={getDetailAlias(mFan, ["Rotation Max", "Rotation Speed Max"])}
          />
        </div>

        <div className="grid grid-cols-10 divide-x divide-gray-200 dark:divide-gray-800">
          <MatrixCell
            label="Rotation Min"
            detail={getDetailAlias(mFan, ["Rotation Min", "Rotation Speed Min"])}
          />
          <MatrixCell label="Ampere Max" detail={getDetailAlias(mFan, ["Ampere Max"])} />
          <MatrixCell label="Ampere Min" detail={getDetailAlias(mFan, ["Ampere Min"])} />
          <MatrixCell label="Wind Direction" detail={getDetail(mFan, "Wind Direction")} />
          <MatrixCell label="M-Fan Insp Test" detail={getDetail(mFan, "M-Fan Test")} />
          <MatrixCell label="Motor Fan Label" detail={getDetail(overall, "Motor Fan Label")} />
          <MatrixCell label="ECM Bolt Tighten" detail={getDetail(overall, "ECM Bolt Tighten")} />
          <MatrixCell label="ECM Bolt Qty" detail={getDetail(overall, "ECM Bolt Qty")} />
          <button
            className="col-span-2 px-3 py-4 text-left transition-colors hover:bg-violet-50 dark:hover:bg-violet-500/10"
            onClick={onOpenCheckPoints}
            type="button"
          >
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wide text-violet-700 dark:text-violet-300">
                  Final Inspection (Check Point 1 - 20)
                </p>
                <p
                  className={`mt-1 inline-flex rounded-md px-2.5 py-1 text-sm font-semibold ${
                    processLog.status
                      ? "bg-success-600 text-white"
                      : "bg-error-600 text-white"
                  }`}
                >
                  {processLog.status ? "PASSED" : "REJECTED"} (
                  {checkPoints ? formatValue(checkPoints.value) : "-"})
                </p>
              </div>
              <span className="text-xs text-violet-700 dark:text-violet-300">
                View 20 CP
              </span>
            </div>
          </button>
        </div>
      </div>
    </article>
  );
}

function MeasurementModal({
  detail,
  onClose,
}: {
  detail: MeasurementDetail | null;
  onClose: () => void;
}) {
  const values = detail?.values?.length
    ? detail.values
    : detail?.value !== undefined && detail.value !== null
      ? [detail.value]
      : [];
  const booleanValues = values
    .map((value) => getBooleanValue(value))
    .filter((value): value is boolean => typeof value === "boolean");
  const passedCount = booleanValues.filter(Boolean).length;
  const valueCount = values.length;
  const summary =
    booleanValues.length > 0
      ? `${passedCount}/${valueCount} OK`
      : `${valueCount}/${detail?.expectedCount ?? valueCount} values`;

  return <Modal className="mx-4 max-w-5xl overflow-hidden p-0" isOpen={Boolean(detail)} onClose={onClose}><div className="border-b border-gray-200 bg-white px-6 py-5 dark:border-gray-800 dark:bg-gray-950"><div className="pr-10"><div className="flex items-center gap-2"><span className={`size-2 rounded-full ${booleanValues.length > 0 ? "bg-emerald-500" : "bg-sky-500"}`} /><h2 className="text-lg font-semibold text-gray-800 dark:text-white/90">{detail?.title ?? detail?.parameterName ?? "Measurement Details"}</h2></div><p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Summary: {detail ? stripMeasurementUnit(detail.value) : "-"} - {summary}</p></div></div><div className="grid max-h-[60vh] grid-cols-2 gap-3 overflow-y-auto bg-gray-50 p-6 dark:bg-gray-950 sm:grid-cols-4 lg:grid-cols-6">{values.map((value, index) => { const booleanValue = getBooleanValue(value); const isBoolean = typeof booleanValue === "boolean"; const isPassed = booleanValue === true; return <div className={`rounded-lg border bg-white px-4 py-3 ${isBoolean ? isPassed ? "border-success-200 dark:border-success-500/30 dark:bg-gray-900" : "border-error-200 dark:border-error-500/30 dark:bg-gray-900" : "border-sky-200 dark:border-sky-500/30 dark:bg-gray-900"}`} key={`${detail?.parameterCode ?? detail?.parameterName ?? "measurement"}-${index}`}><p className={`text-xs font-semibold ${isBoolean ? isPassed ? "text-success-700 dark:text-success-300" : "text-error-700 dark:text-error-300" : "text-sky-700 dark:text-sky-300"}`}>Point {String(index + 1).padStart(2, "0")}</p><p className={`mt-1 font-mono text-sm font-bold ${isBoolean ? isPassed ? "text-success-700 dark:text-success-300" : "text-error-700 dark:text-error-300" : "text-gray-900 dark:text-white"}`}>{stripMeasurementUnit(value)}</p></div>; })}{values.length === 0 && <div className="col-span-full rounded-lg border border-dashed border-gray-200 px-5 py-8 text-center text-sm text-gray-500 dark:border-white/[0.12] dark:text-gray-400">No measurement values recorded.</div>}</div><div className="flex justify-end border-t border-gray-200 bg-white px-6 py-4 dark:border-gray-800 dark:bg-gray-950"><button className="h-9 rounded-lg bg-brand-500 px-4 text-sm font-semibold text-white hover:bg-brand-600" onClick={onClose} type="button">Close</button></div></Modal>;
}

function CheckPointModal({ isOpen, onClose, processLog }: { isOpen: boolean; onClose: () => void; processLog: ProcessLogFullValues }) {
  const checkPointDetail = getDetail(processLog.overall, "Check Points");
  const checkPoints = checkPointDetail?.values?.length
    ? checkPointDetail.values.map((value) => getBooleanValue(value) ?? false)
    : Array.from({ length: 20 }, () => processLog.status ?? false);
  const passedCount = checkPoints.filter(Boolean).length;

  return <Modal className="mx-4 max-w-4xl p-0" isOpen={isOpen} onClose={onClose}><div className="border-b border-gray-200 px-6 py-5 dark:border-gray-800"><div className="pr-10"><h2 className="text-lg font-semibold text-gray-800 dark:text-white/90">Final Inspection (Check Point 1 - 20)</h2><p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{processLog.serialNumberCode} - {passedCount}/20 check points OK</p></div></div><div className="grid grid-cols-2 gap-3 p-6 sm:grid-cols-4 lg:grid-cols-5">{checkPoints.map((isPassed, index) => <div className={`rounded-lg border px-4 py-3 ${isPassed ? "border-success-200 bg-success-50 dark:border-success-500/25 dark:bg-success-500/10" : "border-error-200 bg-error-50 dark:border-error-500/25 dark:bg-error-500/10"}`} key={index}><p className="text-xs font-semibold text-gray-500 dark:text-gray-400">CP-{String(index + 1).padStart(2, "0")}</p><p className={`mt-1 text-sm font-bold ${isPassed ? "text-success-700 dark:text-success-400" : "text-error-700 dark:text-error-400"}`}>{isPassed ? "OK" : "NG"}</p></div>)}</div><div className="flex justify-end border-t border-gray-200 px-6 py-4 dark:border-gray-800"><button className="h-9 rounded-lg bg-brand-500 px-4 text-sm font-semibold text-white hover:bg-brand-600" onClick={onClose} type="button">Close</button></div></Modal>;
}

export function SummaryCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-theme-xs dark:border-white/[0.08] dark:bg-white/[0.03]">
      <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">
        {label}
      </p>
      <p className="mt-2 truncate text-base font-semibold text-gray-800 dark:text-white/90">
        {value}
      </p>
    </div>
  );
}

export function ProcessValueTable({
  details,
  serialNumberCode,
  title,
}: {
  details: ProcessLogFullValueDetail[];
  serialNumberCode?: string;
  title: string;
}) {
  const processGroups = groupDetailsByProcess(details);

  return (
    <section className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-theme-sm dark:border-white/[0.08] dark:bg-white/[0.03]">
      <div className="flex flex-col gap-3 border-b border-gray-100 px-5 py-4 dark:border-white/[0.06] sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">
            {serialNumberCode || "Traceability Log"}
          </p>
          <h2 className="mt-1 font-semibold text-gray-800 dark:text-white/90">
            {title}
          </h2>
        </div>
        <span className="w-fit rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-600 dark:bg-white/[0.06] dark:text-gray-300">
          {getDetailCountLabel(details)}
        </span>
      </div>

      <div className="space-y-5 p-4 sm:p-5">
        {processGroups.map((group, groupIndex) => (
          <ProcessGroupTable
            group={group}
            key={`${group.processCode ?? "process"}-${groupIndex}`}
          />
        ))}

        {details.length === 0 && (
          <div className="rounded-lg border border-dashed border-gray-200 px-5 py-8 text-center text-sm text-gray-500 dark:border-white/[0.12] dark:text-gray-400">
            No values recorded.
          </div>
        )}
      </div>
    </section>
  );
}

function ProcessGroupTable({ group }: { group: ProcessDetailGroup }) {
  const parameterColumns = getParameterColumns(group.details);
  const tableMinWidth = Math.max(520, parameterColumns.length * 180);

  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="font-semibold text-gray-800 dark:text-white/90">
            {formatColumnHeader(group.processName ?? group.processCode)}
          </h3>
          {shouldDisplayCode(group.processCode) && (
            <p className="mt-1 text-xs font-medium text-gray-500 dark:text-gray-400">
              {formatColumnHeader(group.processCode)}
            </p>
          )}
        </div>
        <span className="w-fit rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-600 dark:bg-white/[0.06] dark:text-gray-300">
          {group.details.length} parameter
          {group.details.length === 1 ? "" : "s"}
        </span>
      </div>

      <div className="max-w-full overflow-x-auto rounded-lg border border-gray-200 dark:border-white/[0.12]">
        <table
          className="w-full text-left text-sm"
          style={{ minWidth: `${tableMinWidth}px` }}
        >
          <thead className="bg-[#6D8AF3] text-xs font-semibold uppercase text-white dark:bg-[#6D8AF3]/90">
            <tr>
              {parameterColumns.map((column) => (
                <th
                  className="min-w-[180px] px-4 py-3 text-center align-middle"
                  key={column.key}
                >
                  <span className="block whitespace-normal break-words leading-5">
                    {formatParameterColumnHeader(column)}
                  </span>
                  {shouldDisplayCode(column.parameterCode) && (
                    <span className="mt-1 block whitespace-normal break-words text-[10px] font-medium text-white/75">
                      {formatColumnHeader(column.parameterCode)}
                    </span>
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            <tr className="hover:bg-gray-50/70 dark:hover:bg-white/[0.03]">
              {parameterColumns.map((column) => {
                const columnDetails = getProcessParameterDetails(group, column);
                const firstDetail = columnDetails[0];

                return (
                  <td
                    className="px-4 py-4 text-center align-middle"
                    key={column.key}
                  >
                    <span
                      className={`font-semibold ${
                        firstDetail
                          ? getValueClassName(firstDetail.value)
                          : "text-gray-400 dark:text-gray-500"
                      }`}
                    >
                      {formatCellValue(columnDetails)}
                    </span>
                  </td>
                );
              })}
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
