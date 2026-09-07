"use client";

import PageLoader from "@/components/common/PageLoader";
import { Modal } from "@/components/ui/modal";
import { useToast } from "@/context/ToastContext";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { useTraceabilityLogs } from "@/hooks/useTraceabilityLogs";
import { EyeIcon, RefreshIcon } from "@/icons";
import TraceabilityLogService, {
  ProcessLog,
  ProcessLogFullValues,
  ProcessLogParameter,
} from "@/services/TraceabilityLogService";
import { ApiError } from "@/utils/api";
import { Fragment, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";

type ResultFilter = "" | "ok" | "ng";
type MeasurementKind = "clinching" | "endPlate";
type MeasurementValue = string | number | boolean;
type MeasurementModalState = {
  kind: MeasurementKind;
  serialNumberCode: string;
  timestamp: string;
  summary: string;
  values: MeasurementValue[];
};

const dateFormatter = new Intl.DateTimeFormat("en-GB", {
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  month: "short",
  year: "numeric",
});

const isPassed = (log: ProcessLog) =>
  typeof log.status === "boolean" ? log.status : log.isActive;

const formatDate = (value: string) => {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "-" : dateFormatter.format(date);
};

const getPageNumbers = (currentPage: number, totalPage: number) => {
  const pageNumbers: number[] = [];
  const start = Math.max(1, currentPage - 1);
  const end = Math.min(totalPage, currentPage + 1);

  for (let page = start; page <= end; page += 1) {
    pageNumbers.push(page);
  }

  return pageNumbers;
};

const getBooleanValue = (value: unknown) => {
  if (typeof value === "boolean") {
    return value;
  }

  if (typeof value !== "string") {
    return null;
  }

  const normalizedValue = value.trim().toLowerCase();
  if (["true", "ok", "passed", "on"].includes(normalizedValue)) {
    return true;
  }

  if (["false", "ng", "rejected", "off"].includes(normalizedValue)) {
    return false;
  }

  return null;
};

const stripUnit = (value: unknown) =>
  String(value ?? "-")
    .replace(/\s*mm\b/gi, "")
    .trim();

const formatValue = (value: unknown) => {
  const booleanValue = getBooleanValue(value);
  if (typeof booleanValue === "boolean") {
    return booleanValue ? "OK" : "NG";
  }

  return stripUnit(value);
};

const getFlatParameters = (log: ProcessLog) =>
  log.details.flatMap((detail) => detail.parameters);

const findParameter = (log: ProcessLog, label: string) =>
  getFlatParameters(log).find((parameter) => parameter.parameterName === label);

const parameterValue = (parameter?: ProcessLogParameter) => {
  if (!parameter) {
    return "-";
  }

  if (parameter.displayValue !== undefined) {
    return formatValue(parameter.displayValue);
  }

  if (parameter.parameterCode === "CHECK_POINTS") {
    return `${parameter.values.filter(Boolean).length}/${parameter.values.length} OK`;
  }

  return parameter.values.slice(0, 2).map(formatValue).join(", ") || "-";
};

const cellValue = (log: ProcessLog, label: string) =>
  parameterValue(findParameter(log, label));

const getParameterValues = (parameter?: ProcessLogParameter) =>
  parameter?.values?.length ? parameter.values : [];

const getMeasurementFromFullValues = (
  fullValues: ProcessLogFullValues,
  kind: MeasurementKind
) => {
  const label = kind === "clinching" ? "Clinching Height Avg" : "End Plate Width";
  const summary = fullValues.clinching.details.find(
    (detail) => detail.parameterName === label
  );

  if (summary?.values?.length) {
    return {
      summary: formatValue(summary.value),
      values: summary.values,
    };
  }

  const pattern =
    kind === "clinching"
      ? /CLINCHING_HEIGHT_(\d+)_(?:VALUE|RESULT)$/i
      : /END_PLATE_WIDTH_(\d+)_(?:VALUE|RESULT)$/i;
  const values = fullValues.clinching.details
    .map((detail) => ({
      index: Number(detail.parameterCode?.match(pattern)?.[1] ?? 0),
      value: detail.value,
    }))
    .filter((item) => item.index > 0)
    .sort((first, second) => first.index - second.index)
    .map((item) => item.value)
    .filter((value): value is MeasurementValue => value != null);

  return {
    summary: summary ? formatValue(summary.value) : "-",
    values,
  };
};

export default function TraceabilityLogTable() {
  const toast = useToast();
  const router = useRouter();
  const lastErrorRef = useRef<string | null>(null);
  const [search, setSearch] = useState("");
  const [resultFilter, setResultFilter] = useState<ResultFilter>("");
  const [expandedRows, setExpandedRows] = useState<Set<number>>(new Set());
  const [measurement, setMeasurement] = useState<MeasurementModalState | null>(
    null
  );
  const [isMeasurementLoading, setIsMeasurementLoading] = useState(false);
  const debouncedSearch = useDebouncedValue(search.trim(), 500);
  const {
    data,
    error,
    isLoading,
    pagination,
    query,
    refetch,
    setLimit,
    setPage,
    setQuery,
  } = useTraceabilityLogs({ limit: 10, page: 1 });
  const currentPage = pagination?.page ?? query.page;
  const currentLimit = pagination?.limit ?? query.limit;
  const totalPage = pagination?.totalPage ?? 1;
  const total = pagination?.total ?? data.length;
  useEffect(() => {
    if (debouncedSearch !== query.serialNumberCode) {
      setQuery({ serialNumberCode: debouncedSearch });
    }
  }, [debouncedSearch, query.serialNumberCode, setQuery]);

  useEffect(() => {
    if (!error || lastErrorRef.current === error) {
      return;
    }

    lastErrorRef.current = error;
    toast.error({ title: "Failed to load traceability logs", message: error });
  }, [error, toast]);

  const visibleLogs = useMemo(
    () =>
      data.filter(
        (log) => resultFilter === "" || (resultFilter === "ok") === isPassed(log)
      ),
    [data, resultFilter]
  );
  const firstItem = visibleLogs.length > 0
    ? (currentPage - 1) * currentLimit + 1
    : 0;
  const lastItem = visibleLogs.length > 0
    ? firstItem + visibleLogs.length - 1
    : 0;
  const pageNumbers = getPageNumbers(currentPage, totalPage);
  const toggleRow = (id: number) => {
    setExpandedRows((current) => {
      const nextRows = new Set(current);
      if (nextRows.has(id)) {
        nextRows.delete(id);
      } else {
        nextRows.add(id);
      }
      return nextRows;
    });
  };

  const openMeasurement = async (log: ProcessLog, kind: MeasurementKind) => {
    const serialNumberCode = log.serialNumberCode ?? log.issueNo ?? String(log.id);
    const label = kind === "clinching" ? "Clinching Height Avg" : "End Plate Width";
    const expectedCount = kind === "clinching" ? 18 : 60;
    const parameter = findParameter(log, label);
    const localValues = getParameterValues(parameter);

    if (localValues.length >= expectedCount) {
      setMeasurement({
        kind,
        serialNumberCode,
        timestamp: log.createdAt,
        summary: parameterValue(parameter),
        values: localValues,
      });
      return;
    }

    try {
      setIsMeasurementLoading(true);
      const response = await TraceabilityLogService.getTraceabilityLogFullValues(
        serialNumberCode
      );
      const nextMeasurement = getMeasurementFromFullValues(response.data, kind);
      setMeasurement({
        kind,
        serialNumberCode,
        timestamp: log.createdAt,
        summary: nextMeasurement.summary,
        values: nextMeasurement.values,
      });
    } catch (fetchError) {
      toast.error({
        title: "Failed to load measurement detail",
        message:
          fetchError instanceof ApiError || fetchError instanceof Error
            ? fetchError.message
            : "Measurement detail is unavailable.",
      });
    } finally {
      setIsMeasurementLoading(false);
    }
  };

  if (isLoading && data.length === 0) {
    return <PageLoader />;
  }

  return (
    <>
      <div className="process-log-sheet mx-4 my-4 overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-white/[0.05] dark:bg-white/[0.03]">
        <div className="border-b border-gray-100 px-5 py-4 dark:border-white/[0.05]">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex flex-wrap items-center gap-3">
              <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                Show
                <select
                  className="h-10 rounded-lg border border-gray-300 bg-transparent px-3 py-2 text-sm text-gray-800 outline-none focus:border-brand-300 focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
                  onChange={(event) => setLimit(Number(event.target.value))}
                  value={query.limit}
                >
                  {[10, 25, 50].map((limit) => (
                    <option key={limit} value={limit}>
                      {limit}
                    </option>
                  ))}
                </select>
                entries
              </label>
              <select
                className="h-10 rounded-lg border border-gray-300 bg-transparent px-3 py-2 text-sm font-medium text-gray-800 outline-none focus:border-brand-300 focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
                onChange={(event) => setResultFilter(event.target.value as ResultFilter)}
                value={resultFilter}
              >
                <option value="">All Results</option>
                <option value="ok">Passed (OK)</option>
                <option value="ng">Rejected (NG)</option>
              </select>
              <button
                aria-label="Refresh traceability logs"
                className="process-log-refresh-button inline-flex size-10 items-center justify-center rounded-lg border border-gray-300 bg-white text-gray-600 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300 dark:hover:bg-gray-800"
                onClick={refetch}
                title="Refresh"
                type="button"
              >
                <RefreshIcon className="size-4" />
              </button>
            </div>

            <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
              Search
              <input
                className="h-10 w-full rounded-lg border border-gray-300 bg-transparent px-3 py-2 text-sm text-gray-800 outline-none placeholder:text-gray-400 focus:border-brand-300 focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 sm:w-64"
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search serial number"
                value={search}
              />
            </label>
          </div>
        </div>

        <div className="mx-4 mb-4 mt-2 overflow-hidden rounded-lg border border-gray-100 dark:border-white/[0.05]">
          <div className="overflow-x-auto">
        <table className="w-full min-w-[1180px] text-left text-xs">
          <thead className="text-[11px] font-semibold uppercase text-white">
            <tr>
              <th className="w-16 bg-[#6D8AF3] px-2.5 py-3 text-center">
                No
              </th>
              <th className="bg-[#6D8AF3] px-2.5 py-3">Timestamp</th>
              <th className="bg-[#6D8AF3] px-2.5 py-3">Serial No</th>
              <th className="bg-[#6D8AF3] px-2.5 py-3">Lot Core Asm</th>
              <th className="bg-[#6D8AF3] px-2.5 py-3">Lot Upper T Asm</th>
              <th className="bg-[#6D8AF3] px-2.5 py-3">Lot Lower T Asm</th>
              <th className="bg-[#6D8AF3] px-2.5 py-3 text-center">
                Clinching Height
                <span className="block text-[9px] font-medium normal-case text-white/85">
                  (OK/NG)
                </span>
              </th>
              <th className="border-x border-white/25 bg-[#6D8AF3] px-2.5 py-3 text-center">
                Clinching Height
                <span className="block text-[9px] font-medium normal-case text-white/90">
                  Average Value (18 Pts)
                </span>
              </th>
              <th className="border-r border-white/25 bg-[#6D8AF3] px-2.5 py-3 text-center">
                End Plate Width
                <span className="block text-[9px] font-medium normal-case text-white/90">
                  Status (60 Pts OK/NG)
                </span>
              </th>
              <th className="bg-[#6D8AF3] px-2.5 py-3 text-center">
                NG Box (Red) Sensor
                <span className="block text-[9px] font-medium normal-case text-white/85">
                  (OK/NG)
                </span>
              </th>
              <th className="bg-[#6D8AF3] px-2.5 py-3 text-center">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 text-xs dark:divide-gray-800">
            {visibleLogs.map((log, index) => (
              <Fragment key={log.id}>
                <ProcessLogRow
                  index={(query.page - 1) * query.limit + index + 1}
                  isExpanded={expandedRows.has(log.id)}
                  isMeasurementLoading={isMeasurementLoading}
                  log={log}
                  onOpen={() =>
                    router.push(
                      `/traceability-log/${encodeURIComponent(
                        log.serialNumberCode ?? String(log.id)
                      )}`
                    )
                  }
                  onOpenMeasurement={openMeasurement}
                  onToggle={() => toggleRow(log.id)}
                />
                {expandedRows.has(log.id) && <ExpandedDetailRow log={log} />}
              </Fragment>
            ))}
          </tbody>
        </table>
          </div>
        {visibleLogs.length === 0 && (
          <div className="py-12 text-center text-sm text-gray-500 dark:text-gray-400">
            {error ?? "No traceability logs found."}
          </div>
        )}
        </div>

      <footer className="flex flex-col gap-3 border-t border-gray-100 px-5 py-4 text-sm text-gray-500 dark:border-white/[0.05] dark:text-gray-400 sm:flex-row sm:items-center sm:justify-between">
        <span>
          Showing {firstItem} to {lastItem} of {total} entries
        </span>
        <div className="flex flex-wrap items-center gap-2">
          <button
            className="rounded-lg border border-gray-300 px-3 py-2 font-medium text-gray-700 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-700 dark:text-gray-300"
            disabled={currentPage <= 1 || isLoading}
            onClick={() => setPage(currentPage - 1)}
            type="button"
          >
            Prev
          </button>
          {pageNumbers.map((page) => (
            <button
              className={`h-10 min-w-10 rounded-lg border px-3 text-sm font-medium ${
                page === currentPage
                  ? "border-brand-500 bg-brand-500 text-white"
                  : "border-gray-300 text-gray-700 dark:border-gray-700 dark:text-gray-300"
              }`}
              disabled={isLoading}
              key={page}
              onClick={() => setPage(page)}
              type="button"
            >
              {page}
            </button>
          ))}
          <button
            className="rounded-lg border border-gray-300 px-3 py-2 font-medium text-gray-700 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-700 dark:text-gray-300"
            disabled={currentPage >= totalPage || isLoading}
            onClick={() => setPage(currentPage + 1)}
            type="button"
          >
            Next
          </button>
          <button
            className="rounded-lg border border-gray-300 px-3 py-2 font-medium text-gray-700 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-700 dark:text-gray-300"
            disabled={currentPage >= totalPage || isLoading}
            onClick={() => setPage(totalPage)}
            type="button"
          >
            Last Page
          </button>
        </div>
      </footer>
      </div>

      <MeasurementModal detail={measurement} onClose={() => setMeasurement(null)} />
    </>
  );
}

function ProcessLogRow({
  index,
  isExpanded,
  isMeasurementLoading,
  log,
  onOpen,
  onOpenMeasurement,
  onToggle,
}: {
  index: number;
  isExpanded: boolean;
  isMeasurementLoading: boolean;
  log: ProcessLog;
  onOpen: () => void;
  onOpenMeasurement: (log: ProcessLog, kind: MeasurementKind) => void;
  onToggle: () => void;
}) {
  const passed = isPassed(log);
  const clinchingStatus = findParameter(log, "Clinching Height Avg")?.status ?? passed;
  const endPlate = findParameter(log, "End Plate Width");
  const endPlateStatus = endPlate?.status ?? passed;
  const sensorStatus = getBooleanValue(cellValue(log, "NG Box Long Side")) ?? true;

  return (
    <tr
      className={
        passed
          ? "hover:bg-gray-50/70 dark:hover:bg-white/[0.03]"
          : "bg-error-50/40 hover:bg-error-50 dark:bg-error-500/[0.04]"
      }
    >
      <td className="px-2.5 py-3 text-center font-mono text-xs text-gray-600 dark:text-gray-300">
        <div className="flex items-center justify-center gap-2">
          <button
            aria-label={isExpanded ? "Collapse row detail" : "Expand row detail"}
            className={`inline-flex size-5 items-center justify-center rounded-full border text-sm leading-none ${
              isExpanded
                ? "border-warning-400 text-warning-600"
                : "border-sky-400 text-sky-600"
            }`}
            onClick={onToggle}
            type="button"
          >
            {isExpanded ? "-" : "+"}
          </button>
          <span>{index}</span>
        </div>
      </td>
      <td className="whitespace-nowrap px-2.5 py-3 text-xs text-gray-600 dark:text-gray-300">
        {formatDate(log.createdAt)}
      </td>
      <td className="px-2.5 py-3 font-mono font-semibold text-brand-600 dark:text-brand-300">
        {log.serialNumberCode ?? log.issueNo}
      </td>
      <td className="px-2.5 py-3 font-mono text-xs text-gray-700 dark:text-gray-300">
        {cellValue(log, "Core Asm")}
      </td>
      <td className="px-2.5 py-3 font-mono text-xs text-gray-700 dark:text-gray-300">
        {cellValue(log, "Upper Tank Asm")}
      </td>
      <td className="px-2.5 py-3 font-mono text-xs text-gray-700 dark:text-gray-300">
        {cellValue(log, "Lower Tank Asm")}
      </td>
      <td className="px-2.5 py-3 text-center">
        <StatusPill passed={clinchingStatus} />
      </td>
      <td className="h-16 border-x border-gray-200 bg-sky-50/40 px-2.5 py-0 text-center align-middle dark:border-gray-800 dark:bg-sky-500/[0.04]">
        <div className="flex h-full items-center justify-center">
          <button
            className="inline-flex h-8 w-[146px] items-center justify-between rounded-lg border border-sky-200 bg-white px-3 font-mono text-xs font-semibold text-gray-800 hover:bg-sky-50 disabled:opacity-60 dark:border-sky-500/30 dark:bg-gray-900 dark:text-white/90 dark:hover:bg-sky-500/10"
            disabled={isMeasurementLoading}
            onClick={() => onOpenMeasurement(log, "clinching")}
            type="button"
          >
            <span className="inline-flex items-center gap-1.5">
              <span>{cellValue(log, "Clinching Height Avg")}</span>
              <span className="font-sans text-[9px] font-medium text-gray-500 dark:text-gray-400">
                (18 pts)
              </span>
            </span>
            <span className="inline-flex size-4 shrink-0 items-center justify-center text-sky-500">
              <MeasurementEyeIcon />
            </span>
          </button>
        </div>
      </td>
      <td className="h-16 border-r border-gray-200 bg-emerald-50/40 px-2.5 py-0 text-center align-middle dark:border-gray-800 dark:bg-emerald-500/[0.04]">
        <div className="flex h-full items-center justify-center">
          <button
            className={`inline-flex h-8 w-[198px] items-center justify-between rounded-lg border bg-white px-3 font-mono text-xs font-semibold disabled:opacity-60 dark:bg-gray-900 ${
              endPlateStatus
                ? "border-emerald-200 text-emerald-700 hover:bg-emerald-50 dark:border-emerald-500/30 dark:text-emerald-300 dark:hover:bg-emerald-500/10"
                : "border-error-300 text-error-700 hover:bg-error-50 dark:border-error-500/40 dark:text-error-300 dark:hover:bg-error-500/10"
            }`}
            disabled={isMeasurementLoading}
            onClick={() => onOpenMeasurement(log, "endPlate")}
            type="button"
          >
            <span className="inline-flex items-center gap-1.5">
              <span
                className={`rounded px-2 py-0.5 ${
                  endPlateStatus
                    ? "bg-success-100 text-success-700 dark:bg-success-500/20 dark:text-success-300"
                    : "bg-error-100 text-error-700 dark:bg-error-500/20 dark:text-error-300"
                }`}
              >
                {endPlateStatus ? "OK" : "NG"}
              </span>
              <span>{parameterValue(endPlate)}</span>
              <span className="font-sans text-[9px] font-medium text-gray-500 dark:text-gray-400">
                (60 pts)
              </span>
            </span>
            <span className="inline-flex size-4 shrink-0 items-center justify-center">
              <MeasurementEyeIcon />
            </span>
          </button>
        </div>
      </td>
      <td className="px-2.5 py-3 text-center">
        <StatusPill passed={sensorStatus} />
      </td>
      <td className="px-2.5 py-3 text-center">
        <button
          className="process-log-details-button inline-flex h-8 items-center gap-1 rounded-lg border border-gray-300 bg-white px-2.5 text-xs font-semibold text-brand-600 hover:bg-brand-50 dark:border-gray-700 dark:bg-gray-900 dark:text-brand-300 dark:hover:bg-brand-500/10"
          onClick={onOpen}
          type="button"
        >
          <EyeIcon className="size-4 fill-current" />
          Detail
        </button>
      </td>
    </tr>
  );
}

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

function ExpandedDetailRow({ log }: { log: ProcessLog }) {
  return (
    <tr>
      <td className="bg-gray-50 p-0 dark:bg-white/[0.02]" colSpan={11}>
        <div className="m-3 border-l-4 border-[#6D8AF3] bg-white p-4 shadow-theme-xs dark:bg-gray-900">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-200 bg-slate-50 px-4 py-3 dark:border-gray-800 dark:bg-white/[0.03]">
            <div className="flex flex-wrap items-center gap-3 text-xs text-gray-500 dark:text-gray-400">
              <span className="rounded-lg border border-brand-200 bg-brand-50 px-3 py-1 font-mono font-semibold text-brand-700 dark:border-brand-500/30 dark:bg-brand-500/10 dark:text-brand-300">
                Parameter Log: {log.serialNumberCode ?? log.issueNo}
              </span>
              <span>
                Timestamp:{" "}
                <strong className="font-mono text-gray-800 dark:text-white/90">
                  {formatDate(log.createdAt)}
                </strong>
              </span>
            </div>
            <StatusPill passed={isPassed(log)} />
          </div>
          <div className="mt-4 grid gap-3 lg:grid-cols-5">
            <DetailPanel
              items={[
                ["Lot Core Asm", cellValue(log, "Core Asm")],
                ["Lot Upper Tank", cellValue(log, "Upper Tank Asm")],
                ["Lot Lower Tank", cellValue(log, "Lower Tank Asm")],
              ]}
              subtitle="Lot component trace"
              tone="brand"
              title="Clinching Assembly"
            />
            <DetailPanel
              items={[
                ["Serial M-Fan", cellValue(log, "Serial M-Fan")],
                ["Lot Fan Asm", cellValue(log, "Lot Fan Asm")],
                ["Lot Motor Asm", cellValue(log, "Lot Motor Asm")],
                ["Lot Guide Asm", cellValue(log, "Lot Guide Asm")],
              ]}
              subtitle="Sub-assembly component lots"
              tone="sky"
              title="M-Fan Assembly Scan"
            />
            <DetailPanel
              items={[
                ["M-Fan Bolt Tighten", cellValue(log, "Bolt Tighten")],
                ["Bolt Tighten Qty", cellValue(log, "Bolt Qty")],
                ["Nut Tighten", cellValue(log, "Nut Tighten")],
              ]}
              subtitle="Torque, bolt and nut fasteners"
              tone="slate"
              title="M-Fan Assembly"
            />
            <DetailPanel
              items={[
                ["Rotation Max / Min", cellValue(log, "Rotation Max / Min")],
                ["Ampere Max / Min", cellValue(log, "Ampere Max / Min")],
                ["Wind Direction", cellValue(log, "Wind Direction")],
                ["M-Fan Result", cellValue(log, "M-Fan Test")],
              ]}
              subtitle="Rotation speed and ampere"
              tone="amber"
              title="M-Fan Inspection"
            />
            <DetailPanel
              items={[
                ["Motor Fan Label", cellValue(log, "Motor Fan Label")],
                ["ECM Bolt", cellValue(log, "ECM Bolt Tighten")],
                ["ECM Bolt Qty", cellValue(log, "ECM Bolt Qty")],
                ["Check Points", cellValue(log, "Check Points")],
              ]}
              subtitle="Label, bolt and final points"
              tone="emerald"
              title="ECM & Final"
            />
          </div>
        </div>
      </td>
    </tr>
  );
}

function DetailPanel({
  items,
  subtitle,
  tone,
  title,
}: {
  items: Array<[string, string]>;
  subtitle: string;
  tone: "amber" | "brand" | "emerald" | "sky" | "slate";
  title: string;
}) {
  const toneClass = {
    amber: "border-t-warning-400 bg-warning-50/30 dark:border-t-warning-500 dark:bg-warning-500/[0.04]",
    brand: "border-t-brand-500 bg-brand-50/30 dark:border-t-brand-400 dark:bg-brand-500/[0.05]",
    emerald: "border-t-success-500 bg-success-50/30 dark:border-t-success-400 dark:bg-success-500/[0.05]",
    sky: "border-t-sky-500 bg-sky-50/30 dark:border-t-sky-400 dark:bg-sky-500/[0.05]",
    slate: "border-t-gray-400 bg-gray-50 dark:border-t-gray-500 dark:bg-white/[0.03]",
  }[tone];

  return (
    <section className={`rounded-lg border border-t-2 border-gray-200 p-3.5 dark:border-gray-800 ${toneClass}`}>
      <div className="border-b border-gray-200 pb-3 dark:border-gray-800">
        <h3 className="text-sm font-semibold text-gray-800 dark:text-white/90">
          {title}
        </h3>
        <p className="mt-1 text-[11px] text-gray-500 dark:text-gray-400">
          {subtitle}
        </p>
      </div>
      <div className="mt-3 space-y-2">
        {items.map(([label, value]) => (
          <div className="flex items-center justify-between gap-3" key={label}>
            <span className="text-xs text-gray-500 dark:text-gray-400">
              {label}
            </span>
            <span className={`rounded border px-2 py-1 font-mono text-xs font-semibold ${getDetailValueClass(value)}`}>
              {value}
            </span>
          </div>
        ))}
      </div>
    </section>
  );
}

function getDetailValueClass(value: string) {
  const normalizedValue = value.trim().toLowerCase();

  if (["ok", "on", "passed"].includes(normalizedValue) || normalizedValue.includes("/20 ok")) {
    return "border-success-200 bg-success-50 text-success-700 dark:border-success-500/30 dark:bg-success-500/15 dark:text-success-300";
  }

  if (["ng", "off", "rejected"].includes(normalizedValue) || normalizedValue.includes("ng")) {
    return "border-error-200 bg-error-50 text-error-700 dark:border-error-500/30 dark:bg-error-500/15 dark:text-error-300";
  }

  return "border-gray-200 bg-white text-gray-800 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90";
}

function MeasurementModal({
  detail,
  onClose,
}: {
  detail: MeasurementModalState | null;
  onClose: () => void;
}) {
  const isClinching = detail?.kind === "clinching";
  const values = detail?.values ?? [];
  const passedCount = values.filter((value) => getBooleanValue(value) === true).length;
  const rejectedCount = values.filter((value) => getBooleanValue(value) === false).length;

  return (
    <Modal className="mx-4 max-w-5xl overflow-hidden p-0" isOpen={Boolean(detail)} onClose={onClose}>
      <div className="border-b border-gray-200 bg-white px-6 py-5 dark:border-gray-800 dark:bg-gray-950">
        <div className="pr-10">
          <div className="flex items-center gap-2">
            <span className={`size-2 rounded-full ${isClinching ? "bg-sky-500" : "bg-emerald-500"}`} />
            <h2 className="text-lg font-semibold text-gray-800 dark:text-white/90">
              {isClinching
                ? "Detail Pengukuran Clinching Height (Point 1 - 18)"
                : "Detail Pengukuran End Plate Width (Point 1 - 60)"}
            </h2>
          </div>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Serial: {detail?.serialNumberCode ?? "-"} | Timestamp:{" "}
            {detail ? formatDate(detail.timestamp) : "-"}
          </p>
        </div>
      </div>
      <div className="max-h-[70vh] overflow-y-auto bg-gray-50 p-6 pb-8 dark:bg-gray-950">
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <SummaryBox
            label={isClinching ? "Average Value" : "Total Titik Sensor"}
            tone={isClinching ? "sky" : "brand"}
            value={isClinching ? detail?.summary ?? "-" : `${values.length} Points`}
          />
          {isClinching ? (
            <>
              <SummaryBox label="Nilai Terendah (Min)" tone="cyan" value={getMinMax(values, "min")} />
              <SummaryBox label="Nilai Tertinggi (Max)" tone="indigo" value={getMinMax(values, "max")} />
              <SummaryBox label="Out of Spec" tone="emerald" value="0 Points" />
            </>
          ) : (
            <>
              <SummaryBox label="Passed (OK)" tone="emerald" value={`${passedCount} Points`} />
              <SummaryBox label="Rejected (NG)" tone="rose" value={`${rejectedCount} Points`} />
              <SummaryBox
                label="Status Akhir Unit"
                tone={rejectedCount > 0 ? "rose" : "emerald"}
                value={rejectedCount > 0 ? "NG / REJECTED" : "OK / PASSED"}
              />
            </>
          )}
        </div>

        <div className="mt-6 flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
          <h3 className="text-sm font-semibold uppercase text-gray-700 dark:text-gray-300">
            {isClinching
              ? "Detail Nilai Clinching Height 1 - 18"
              : "Matriks Hasil End Plate 1 s/d 60"}
          </h3>
          {!isClinching && (
            <span className="text-xs text-gray-500 dark:text-gray-400">
              Jika ada minimal 1 titik NG, unit dinyatakan NG
            </span>
          )}
        </div>

        <div
          className={`mt-3 grid gap-3 ${
            isClinching
              ? "grid-cols-2 sm:grid-cols-4 lg:grid-cols-6"
              : "grid-cols-[repeat(auto-fill,minmax(92px,1fr))]"
          }`}
        >
          {values.map((value, index) => {
            const booleanValue = getBooleanValue(value);
            const passed = booleanValue !== false;
            const pointLabel = isClinching
              ? `Point ${String(index + 1).padStart(2, "0")}`
              : `P-${String(index + 1).padStart(2, "0")}`;

            return (
              <div
                className={`min-h-20 rounded-lg border px-3 py-3 transition-colors ${
                  !isClinching && !passed
                    ? "border-error-300 bg-white dark:border-error-500/35 dark:bg-gray-900"
                    : isClinching
                      ? "border-sky-200 bg-white dark:border-sky-500/30 dark:bg-gray-900"
                      : "border-emerald-200 bg-white dark:border-emerald-500/30 dark:bg-gray-900"
                }`}
                key={`${detail?.kind ?? "measurement"}-${index}`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className={`whitespace-nowrap font-mono text-[11px] font-semibold ${isClinching ? "text-sky-700 dark:text-sky-300" : passed ? "text-emerald-700 dark:text-emerald-300" : "text-error-700 dark:text-error-300"}`}>
                    {pointLabel}
                  </span>
                  {!isClinching && (
                    <span
                      className={`shrink-0 rounded px-2 py-0.5 text-[11px] font-semibold ${
                        passed
                          ? "bg-success-50 text-success-700 dark:bg-success-500/20 dark:text-success-300"
                          : "bg-error-50 text-error-700 dark:bg-error-500/20 dark:text-error-300"
                      }`}
                    >
                      {passed ? "OK" : "NG"}
                    </span>
                  )}
                </div>
                <p className={`mt-3 text-center font-mono text-base font-bold leading-none ${!isClinching && !passed ? "text-error-700 dark:text-error-300" : "text-gray-900 dark:text-white"}`}>
                  {isClinching ? stripUnit(value) : formatValue(value)}
                </p>
              </div>
            );
          })}
          {values.length === 0 && (
            <div className="col-span-full rounded-lg border border-dashed border-gray-200 px-5 py-8 text-center text-sm text-gray-500 dark:border-white/[0.12] dark:text-gray-400">
              No measurement values recorded.
            </div>
          )}
        </div>
      </div>
      <div className="flex justify-end border-t border-gray-200 bg-white px-6 py-4 dark:border-gray-800 dark:bg-gray-950">
        <button
          className="h-9 rounded-lg bg-brand-500 px-4 text-sm font-semibold text-white hover:bg-brand-600"
          onClick={onClose}
          type="button"
        >
          Tutup
        </button>
      </div>
    </Modal>
  );
}

function SummaryBox({
  label,
  tone = "brand",
  value,
}: {
  label: string;
  tone?: "brand" | "cyan" | "emerald" | "indigo" | "rose" | "sky";
  value: string;
}) {
  const toneClass = {
    brand: "border-brand-200 bg-white text-brand-700 dark:border-brand-500/30 dark:bg-gray-900 dark:text-brand-300",
    cyan: "border-cyan-200 bg-white text-cyan-700 dark:border-cyan-500/30 dark:bg-gray-900 dark:text-cyan-300",
    emerald: "border-success-200 bg-white text-success-700 dark:border-success-500/30 dark:bg-gray-900 dark:text-success-300",
    indigo: "border-indigo-200 bg-white text-indigo-700 dark:border-indigo-500/30 dark:bg-gray-900 dark:text-indigo-300",
    rose: "border-error-200 bg-white text-error-700 dark:border-error-500/30 dark:bg-gray-900 dark:text-error-300",
    sky: "border-sky-200 bg-white text-sky-700 dark:border-sky-500/30 dark:bg-gray-900 dark:text-sky-300",
  }[tone];

  return (
    <div className={`rounded-lg border p-4 ${toneClass}`}>
      <p className="text-xs font-medium opacity-80">
        {label}
      </p>
      <p className="mt-2 font-mono text-lg font-bold">
        {value}
      </p>
    </div>
  );
}

function getMinMax(values: MeasurementValue[], mode: "min" | "max") {
  const numbers = values
    .map((value) => Number(stripUnit(value).replace(",", ".")))
    .filter(Number.isFinite);

  if (numbers.length === 0) {
    return "-";
  }

  return String(mode === "min" ? Math.min(...numbers) : Math.max(...numbers));
}
