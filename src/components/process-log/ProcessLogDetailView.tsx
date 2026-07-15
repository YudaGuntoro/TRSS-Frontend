"use client";

import PageLoader from "@/components/common/PageLoader";
import { useToast } from "@/context/ToastContext";
import { ChevronLeftIcon } from "@/icons";
import ProcessLogService, {
  ProcessLogFullValueDetail,
  ProcessLogFullValues,
} from "@/services/ProcessLogService";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

type ProcessLogDetailViewProps = {
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

const formatResult = (value?: boolean) => {
  if (typeof value !== "boolean") {
    return "-";
  }

  return value ? "OK" : "NG";
};

const formatFinished = (value?: boolean) => {
  if (typeof value !== "boolean") {
    return "-";
  }

  return value ? "Finished" : "In Progress";
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
  return details.reduce<ProcessDetailGroup[]>((groups, detail) => {
    const latestGroup = groups[groups.length - 1];
    const isSameProcess =
      latestGroup &&
      latestGroup.processCode === detail.processCode &&
      latestGroup.processName === detail.processName;

    if (isSameProcess) {
      latestGroup.details.push(detail);
      return groups;
    }

    groups.push({
      processCode: detail.processCode,
      processName: detail.processName,
      details: [detail],
    });
    return groups;
  }, []);
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

const shouldDisplayCode = (value?: string) => Boolean(value && !value.includes("_"));

const resolveSerialNumberCode = async (
  identifier: string,
  signal: AbortSignal
) => {
  if (!numericIdentifierPattern.test(identifier)) {
    return identifier;
  }

  const response = await ProcessLogService.getProcessLog(Number(identifier), {
    signal,
  });
  const serialNumberCode = response.data.serialNumberCode;

  if (!serialNumberCode) {
    throw new Error("Serial number was not found for this process log.");
  }

  return serialNumberCode;
};

export default function ProcessLogDetailView({
  identifier,
}: ProcessLogDetailViewProps) {
  const router = useRouter();
  const toast = useToast();
  const [processLog, setProcessLog] = useState<ProcessLogFullValues | null>(
    null
  );
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
        const response = await ProcessLogService.getProcessLogFullValues(
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
            : "Failed to load process log detail";
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
        <h2 className="text-lg font-semibold">Process detail unavailable</h2>
        <p className="mt-2 text-sm">{error ?? "Process log was not found."}</p>
        <button
          className="mt-5 rounded-lg bg-error-500 px-4 py-2 text-sm font-semibold text-white hover:bg-error-600"
          onClick={() => router.push("/process-log")}
          type="button"
        >
          Back to Process Log
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <button
            aria-label="Back to process log"
            className="inline-flex size-10 items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-600 transition-colors hover:bg-gray-50 hover:text-gray-900 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-300 dark:hover:bg-gray-800"
            onClick={() => router.push("/process-log")}
            type="button"
          >
            <ChevronLeftIcon className="size-5 fill-current" />
          </button>
          <div>
            <h1 className="text-2xl font-semibold text-gray-800 dark:text-white/90">
              Process Detail
            </h1>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Traceability full values for{" "}
              {processLog.serialNumberCode ?? identifier}
            </p>
          </div>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-6">
        <SummaryCard
          label="Serial Number"
          value={processLog.serialNumberCode ?? "-"}
        />
        <SummaryCard
          label="Clinching"
          value={processLog.clinching.serialNumberCode ?? "-"}
        />
        <SummaryCard label="M Fan" value={processLog.mFan.serialNumberCode ?? "-"} />
        <SummaryCard label="Result" value={formatResult(processLog.status)} />
        <SummaryCard
          label="Finished"
          value={formatFinished(processLog.isFinished)}
        />
        <SummaryCard label="Created At" value={formatDate(processLog.createdAt)} />
      </div>

      <div className="space-y-5">
        {detailTables.map((table) => (
          <ProcessValueTable
            details={table.details}
            key={table.key}
            serialNumberCode={table.serialNumberCode}
            title={table.title}
          />
        ))}
      </div>
    </div>
  );
}

function SummaryCard({ label, value }: { label: string; value: string }) {
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

function ProcessValueTable({
  details,
  serialNumberCode,
  title,
}: {
  details: ProcessLogFullValueDetail[];
  serialNumberCode?: string;
  title: string;
}) {
  const processGroups = groupDetailsByProcess(details);
  const parameterColumns = getParameterColumns(details);
  const tableMinWidth = Math.max(920, 240 + parameterColumns.length * 180);

  return (
    <section className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-theme-sm dark:border-white/[0.08] dark:bg-white/[0.03]">
      <div className="flex flex-col gap-3 border-b border-gray-100 px-5 py-4 dark:border-white/[0.06] sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">
            {serialNumberCode || "Process Log"}
          </p>
          <h2 className="mt-1 font-semibold text-gray-800 dark:text-white/90">
            {title}
          </h2>
        </div>
        <span className="w-fit rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-600 dark:bg-white/[0.06] dark:text-gray-300">
          {getDetailCountLabel(details)}
        </span>
      </div>

      <div className="max-w-full overflow-x-auto">
        <table
          className="w-full text-left text-sm"
          style={{ minWidth: `${tableMinWidth}px` }}
        >
          <thead className="bg-[#6D8AF3] text-xs font-semibold uppercase text-white dark:bg-[#6D8AF3]/90">
            <tr>
              <th className="sticky left-0 z-10 w-[240px] bg-[#6D8AF3] px-5 py-3 text-center align-middle dark:bg-[#6D8AF3]">
                Process
              </th>
              {parameterColumns.map((column) => (
                <th
                  className="min-w-[180px] px-4 py-3 text-center align-middle"
                  key={column.key}
                >
                  <span className="block whitespace-normal break-words leading-5">
                    {formatColumnHeader(
                      column.parameterName ?? column.parameterCode
                    )}
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
          <tbody className="divide-y divide-gray-200 dark:divide-white/[0.12]">
            {processGroups.map((group, groupIndex) => (
              <tr
                className="hover:bg-gray-50/70 dark:hover:bg-white/[0.03]"
                key={`${group.processCode ?? "process"}-${groupIndex}`}
              >
                <td className="sticky left-0 z-10 border-b border-gray-200 bg-white px-5 py-4 text-center align-middle dark:border-white/[0.12] dark:bg-[#111827]">
                  <p className="font-semibold text-gray-800 dark:text-white/90">
                    {formatColumnHeader(group.processName ?? group.processCode)}
                  </p>
                  {shouldDisplayCode(group.processCode) && (
                    <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                      {formatColumnHeader(group.processCode)}
                    </p>
                  )}
                </td>

                {parameterColumns.map((column) => {
                  const columnDetails = getProcessParameterDetails(
                    group,
                    column
                  );
                  const firstDetail = columnDetails[0];

                  return (
                    <td
                      className="border-b border-gray-200 px-4 py-4 text-center align-middle dark:border-white/[0.12]"
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
            ))}

            {details.length === 0 && (
              <tr>
                <td
                  className="px-5 py-8 text-center text-sm text-gray-500 dark:text-gray-400"
                  colSpan={Math.max(parameterColumns.length + 1, 1)}
                >
                  No values recorded.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
