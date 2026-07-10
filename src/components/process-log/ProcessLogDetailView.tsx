"use client";

import PageLoader from "@/components/common/PageLoader";
import { useToast } from "@/context/ToastContext";
import ProcessLogService, {
  ProcessLog,
  ProcessLogParameter,
} from "@/services/ProcessLogService";
import { ChevronLeftIcon } from "@/icons";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

type ProcessLogDetailViewProps = {
  id: number;
};

const dateFormatter = new Intl.DateTimeFormat("en-GB", {
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  month: "short",
  year: "numeric",
});

const formatDate = (value: string) => {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "-" : dateFormatter.format(date);
};

const formatDataType = (dataType?: string) => {
  if (!dataType) {
    return "Unknown";
  }

  return dataType.charAt(0).toUpperCase() + dataType.slice(1);
};

const formatValue = (value: unknown, dataType?: string) => {
  if (value === null || value === undefined || value === "") {
    return "-";
  }

  if (dataType === "boolean") {
    return value === true || value === "true" ? "OK" : "NG";
  }

  if (dataType === "number" && typeof value === "number") {
    return new Intl.NumberFormat("en-US", {
      maximumFractionDigits: 4,
    }).format(value);
  }

  return String(value);
};

const formatResult = (value?: boolean) => {
  if (typeof value !== "boolean") {
    return "-";
  }

  return value ? "OK" : "NG";
};

const getIssueNumbers = (processLog: ProcessLog) =>
  processLog.issues
    .map((issue) => issue.issueNumber)
    .filter(Boolean)
    .join(", ") || processLog.issueNo;

export default function ProcessLogDetailView({
  id,
}: ProcessLogDetailViewProps) {
  const router = useRouter();
  const toast = useToast();
  const [processLog, setProcessLog] = useState<ProcessLog | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedProcessIndex, setSelectedProcessIndex] = useState(0);
  const [selectedParameterId, setSelectedParameterId] = useState<number | null>(
    null
  );

  useEffect(() => {
    const controller = new AbortController();

    ProcessLogService.getProcessLog(id, { signal: controller.signal })
      .then((response) => {
        setProcessLog(response.data);
      })
      .catch((fetchError: unknown) => {
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
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setIsLoading(false);
        }
      });

    return () => controller.abort();
  }, [id, toast]);

  const selectedProcess = processLog?.details[selectedProcessIndex];
  const effectiveParameterId =
    selectedParameterId ?? selectedProcess?.parameters[0]?.parameterId ?? null;

  const selectedParameter = useMemo<ProcessLogParameter | undefined>(
    () =>
      selectedProcess?.parameters.find(
        (parameter) => parameter.parameterId === effectiveParameterId
      ),
    [effectiveParameterId, selectedProcess]
  );

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
              Traceability data for {processLog.serialNumberCode ?? processLog.issueNo}
            </p>
          </div>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <SummaryCard
          label="Serial Number"
          value={processLog.serialNumberCode ?? "-"}
        />
        <SummaryCard label="Issue Number" value={getIssueNumbers(processLog)} />
        <SummaryCard label="Type" value={processLog.type ?? "-"} />
        <SummaryCard label="Result" value={formatResult(processLog.status)} />
        <SummaryCard
          label="Created At"
          value={formatDate(processLog.createdAt)}
        />
      </div>

      {processLog.issues.length > 0 && (
        <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-theme-sm dark:border-white/[0.08] dark:bg-white/[0.03]">
          <div className="border-b border-gray-100 px-5 py-4 dark:border-white/[0.06]">
            <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">
              Issues
            </p>
            <h2 className="mt-1 font-semibold text-gray-800 dark:text-white/90">
              Related Issue Numbers
            </h2>
          </div>
          <div className="max-w-full overflow-x-auto">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead className="bg-gray-50 text-xs font-semibold uppercase text-gray-500 dark:bg-white/[0.03] dark:text-gray-400">
                <tr>
                  <th className="px-5 py-3">Issue Number</th>
                  <th className="px-5 py-3">Issue Type</th>
                  <th className="px-5 py-3">Part Number</th>
                  <th className="px-5 py-3">Part Name</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-white/[0.06]">
                {processLog.issues.map((issue, index) => (
                  <tr key={`${issue.issueNumber ?? "issue"}-${index}`}>
                    <td className="px-5 py-3 font-semibold text-gray-800 dark:text-white/90">
                      {issue.issueNumber ?? "-"}
                    </td>
                    <td className="px-5 py-3 text-gray-600 dark:text-gray-300">
                      {issue.issueType ?? "-"}
                    </td>
                    <td className="px-5 py-3 text-gray-600 dark:text-gray-300">
                      {issue.partNumber ?? "-"}
                    </td>
                    <td className="px-5 py-3 text-gray-600 dark:text-gray-300">
                      {issue.partName ?? "-"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div className="grid min-h-[520px] overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-theme-sm dark:border-white/[0.08] dark:bg-white/[0.03] lg:grid-cols-[280px_340px_minmax(0,1fr)]">
        <section className="border-b border-gray-200 p-5 dark:border-white/[0.08] lg:border-b-0 lg:border-r">
          <div className="mb-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">
              Processes
            </p>
            <h2 className="mt-1 font-semibold text-gray-800 dark:text-white/90">
              Process List
            </h2>
          </div>

          <div className="space-y-2">
            {processLog.details.map((process, index) => (
              <button
                className={`w-full rounded-xl border px-4 py-3 text-left transition-colors ${
                  selectedProcessIndex === index
                    ? "border-brand-500 bg-brand-50 text-brand-700 dark:bg-brand-500/15 dark:text-brand-300"
                    : "border-gray-200 text-gray-700 hover:border-brand-200 hover:bg-gray-50 dark:border-gray-800 dark:text-gray-300 dark:hover:bg-white/[0.04]"
                }`}
                key={`${process.processName ?? "process"}-${index}`}
                onClick={() => {
                  setSelectedProcessIndex(index);
                  setSelectedParameterId(
                    process.parameters[0]?.parameterId ?? null
                  );
                }}
                type="button"
              >
                <span className="block text-sm font-semibold">
                  {process.processName ?? "Unknown Process"}
                </span>
                <span className="mt-1 block text-xs opacity-70">
                  {process.parameters.length} parameter
                  {process.parameters.length === 1 ? "" : "s"}
                  {typeof process.result === "boolean"
                    ? ` / ${formatResult(process.result)}`
                    : ""}
                </span>
              </button>
            ))}

            {processLog.details.length === 0 && (
              <EmptyState message="No process data available." />
            )}
          </div>
        </section>

        <section className="border-b border-gray-200 p-5 dark:border-white/[0.08] lg:border-b-0 lg:border-r">
          <div className="mb-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">
              Parameters
            </p>
            <h2 className="mt-1 font-semibold text-gray-800 dark:text-white/90">
              {selectedProcess?.processName ?? "Select a process"}
            </h2>
          </div>

          <div className="space-y-2">
            {selectedProcess?.parameters.map((parameter) => (
              <button
                className={`w-full rounded-xl border px-4 py-3 text-left transition-colors ${
                  effectiveParameterId === parameter.parameterId
                    ? "border-brand-500 bg-brand-50 dark:bg-brand-500/15"
                    : "border-gray-200 hover:border-brand-200 hover:bg-gray-50 dark:border-gray-800 dark:hover:bg-white/[0.04]"
                }`}
                key={parameter.parameterId}
                onClick={() => setSelectedParameterId(parameter.parameterId)}
                type="button"
              >
                <span className="block text-sm font-semibold text-gray-800 dark:text-white/90">
                  {parameter.parameterName ?? "Unknown Parameter"}
                </span>
                <span className="mt-1 flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
                  <span>{parameter.parameterCode ?? formatDataType(parameter.dataType)}</span>
                  <span>
                    {parameter.values.length} value
                    {parameter.values.length === 1 ? "" : "s"}
                  </span>
                </span>
              </button>
            ))}

            {!selectedProcess?.parameters.length && (
              <EmptyState message="No parameters available." />
            )}
          </div>
        </section>

        <section className="p-5">
          <div className="mb-5 flex flex-col gap-2 border-b border-gray-100 pb-5 dark:border-white/[0.06] sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">
                Values
              </p>
              <h2 className="mt-1 text-lg font-semibold text-gray-800 dark:text-white/90">
                {selectedParameter?.parameterName ?? "Select a parameter"}
              </h2>
            </div>
            {selectedParameter && (
              <span className="w-fit rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-600 dark:bg-white/[0.06] dark:text-gray-300">
                {formatDataType(selectedParameter.dataType)}
              </span>
            )}
          </div>

          {selectedParameter ? (
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {selectedParameter.values.map((value, index) => {
                const formattedValue = formatValue(
                  value,
                  selectedParameter.dataType
                );
                const isBoolean = selectedParameter.dataType === "boolean";
                const isOk =
                  typeof selectedParameter.status === "boolean"
                    ? selectedParameter.status
                    : formattedValue === "OK";

                return (
                  <div
                    className="rounded-xl border border-gray-200 bg-gray-50 p-4 dark:border-gray-800 dark:bg-white/[0.025]"
                    key={`${selectedParameter.parameterId}-${index}`}
                  >
                    <span className="text-xs font-medium text-gray-400">
                      Value {index + 1}
                    </span>
                    {typeof selectedParameter.status === "boolean" && (
                      <span
                        className={`ml-2 inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${
                          selectedParameter.status
                            ? "bg-success-50 text-success-700 dark:bg-success-500/15 dark:text-success-400"
                            : "bg-error-50 text-error-700 dark:bg-error-500/15 dark:text-error-400"
                        }`}
                      >
                        {formatResult(selectedParameter.status)}
                      </span>
                    )}
                    <div
                      className={`mt-2 text-base font-semibold ${
                        isBoolean || typeof selectedParameter.status === "boolean"
                          ? isOk
                            ? "text-success-600 dark:text-success-400"
                            : "text-error-600 dark:text-error-400"
                          : "text-gray-800 dark:text-white/90"
                      }`}
                    >
                      {formattedValue}
                    </div>
                  </div>
                );
              })}

              {selectedParameter.values.length === 0 && (
                <EmptyState message="No values recorded for this parameter." />
              )}
            </div>
          ) : (
            <EmptyState message="Choose a parameter to display its values." />
          )}
        </section>
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

function EmptyState({ message }: { message: string }) {
  return (
    <div className="col-span-full rounded-xl border border-dashed border-gray-300 px-4 py-8 text-center text-sm text-gray-500 dark:border-gray-700 dark:text-gray-400">
      {message}
    </div>
  );
}
