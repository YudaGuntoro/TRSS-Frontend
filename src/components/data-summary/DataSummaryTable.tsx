"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useToast } from "@/context/ToastContext";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { useProcessLogs } from "@/hooks/useProcessLogs";
import ProcessLogService, {
  ProcessLog,
  ProcessLogFullValueDetail,
  ProcessLogFullValues,
} from "@/services/ProcessLogService";

type SummaryColumn = {
  key: string;
  label: string;
  getValue: (
    fullValues: ProcessLogFullValues | undefined,
    processLog: ProcessLog
  ) => string;
};

type SummaryColumnGroup = {
  key: string;
  title: string;
  columns: SummaryColumn[];
};

const numericTextPattern = /^-?\d+([,.]\d+)?$/;

const filterInputClassName =
  "h-10 w-[240px] max-w-full rounded-lg border border-gray-300 bg-transparent px-3 py-2 text-sm text-gray-800 outline-none focus:border-brand-300 focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90";

const selectClassName =
  "h-10 rounded-lg border border-gray-300 bg-transparent px-3 py-2 text-sm text-gray-800 outline-none focus:border-brand-300 focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90";

const getAllDetails = (fullValues?: ProcessLogFullValues) => [
  ...(fullValues?.clinching.details ?? []),
  ...(fullValues?.mFan.details ?? []),
  ...(fullValues?.overall ?? []),
];

const getParameterValue = (
  fullValues: ProcessLogFullValues | undefined,
  processCode: string,
  parameterCode: string
) =>
  getAllDetails(fullValues).find(
    (detail) =>
      detail.processCode === processCode &&
      detail.parameterCode === parameterCode
  )?.value;

const getValueByCode =
  (processCode: string, parameterCode: string): SummaryColumn["getValue"] =>
  (fullValues) =>
    formatSummaryValue(getParameterValue(fullValues, processCode, parameterCode));

const getMFanSerialNumber: SummaryColumn["getValue"] = (fullValues) =>
  fullValues?.mFan.serialNumberCode ?? "-";

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

const formatSummaryValue = (
  value: ProcessLogFullValueDetail["value"] | undefined
) => {
  if (value === null || value === undefined || value === "") {
    return "-";
  }

  if (typeof value === "boolean") {
    return value ? "OK" : "NG";
  }

  if (typeof value === "string") {
    const normalizedValue = value.trim().toLowerCase();

    if (normalizedValue === "true") {
      return "OK";
    }

    if (normalizedValue === "false") {
      return "NG";
    }

    return trimNumericText(value);
  }

  return new Intl.NumberFormat("en-US", {
    maximumFractionDigits: 4,
  }).format(value);
};

const getValueClassName = (value: string) => {
  if (value === "OK") {
    return "text-success-600 dark:text-success-400";
  }

  if (value === "NG") {
    return "text-error-600 dark:text-error-400";
  }

  return "text-gray-800 dark:text-white/90";
};

const escapeHtml = (value: string) =>
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

const getExportFileName = () => {
  const timestamp = new Date()
    .toISOString()
    .slice(0, 19)
    .replace(/[-:T]/g, "");

  return `data-summary-${timestamp}.xls`;
};

const summaryGroups: SummaryColumnGroup[] = [
  {
    key: "clinching-short-side",
    title: "Clinching Short Side",
    columns: [
      {
        key: "lot-core-asm",
        label: "Lot Core ASM",
        getValue: getValueByCode("CLINCHING_SHORT_SIDE", "CORE_ASM_RESULT"),
      },
      {
        key: "lot-upper-tank-asm",
        label: "Lot Upper Tank ASM",
        getValue: getValueByCode(
          "CLINCHING_SHORT_SIDE",
          "UPPER_TANK_ASM_RESULT"
        ),
      },
      {
        key: "lot-lower-tank-asm",
        label: "Lot Lower Tank ASM",
        getValue: getValueByCode(
          "CLINCHING_SHORT_SIDE",
          "LOWER_TANK_ASM_RESULT"
        ),
      },
    ],
  },
  {
    key: "clinching-long-side",
    title: "Clinching Long Side",
    columns: [
      {
        key: "clinch-height-result",
        label: "Clinch Height OK / NG",
        getValue: getValueByCode(
          "CLINCHING_LONG_SIDE",
          "CLINCHING_HEIGHT_RESULT"
        ),
      },
      {
        key: "clinch-height-value",
        label: "Clinch Height",
        getValue: getValueByCode(
          "CLINCHING_LONG_SIDE",
          "CLINCHING_HEIGHT_VALUE"
        ),
      },
      {
        key: "end-plate-width",
        label: "End Plate Width",
        getValue: getValueByCode(
          "CLINCHING_LONG_SIDE",
          "END_PLATE_WIDTH_VALUE"
        ),
      },
    ],
  },
  {
    key: "he-leak",
    title: "He Leak",
    columns: [
      {
        key: "rad-cap-position",
        label: "RAD Cap (Cap Type)(Position)",
        getValue: getValueByCode("HE_LEAK", "CAP_TYPE_POSITION_RESULT"),
      },
      {
        key: "he-leak-result",
        label: "He Leak OK / NG",
        getValue: getValueByCode("HE_LEAK", "LEAK_TEST_RESULT"),
      },
      {
        key: "he-leak-last-leakage",
        label: "He Leak Last Leakage",
        getValue: getValueByCode("HE_LEAK", "LEAK_VALUE"),
      },
    ],
  },
  {
    key: "m-fan-assy",
    title: "M Fan Assy",
    columns: [
      {
        key: "m-fan-sebango",
        label: "M-Fan Sebango",
        getValue: getMFanSerialNumber,
      },
      {
        key: "lot-fan-asm",
        label: "Lot FAN ASM",
        getValue: getValueByCode("M_FAN_ASSY", "FAN_ASM_RESULT"),
      },
      {
        key: "lot-motor-asm",
        label: "Lot Motor ASM",
        getValue: getValueByCode("M_FAN_ASSY", "MOTOR_ASM_RESULT"),
      },
      {
        key: "lot-guide-asm",
        label: "Lot Guide ASM",
        getValue: getValueByCode("M_FAN_ASSY", "FUN_GUIDE_ASM_RESULT"),
      },
      {
        key: "m-fan-tighten-bolt-qty",
        label: "M-Fan Tighten Bolt Qty",
        getValue: getValueByCode("M_FAN_ASSY", "BOLT_TIGHTEN_VALUE"),
      },
      {
        key: "m-fan-tighten-bolt-ok",
        label: "M-Fan Tighten Bolt OK",
        getValue: getValueByCode("M_FAN_ASSY", "BOLT_TIGHTEN_RESULT"),
      },
      {
        key: "m-fan-tighten-nut-ok",
        label: "M-Fan Tighten Nut OK",
        getValue: getValueByCode("M_FAN_ASSY", "NUT_TIGHTEN_RESULT"),
      },
    ],
  },
  {
    key: "m-fan-inspection",
    title: "M Fan Inspection",
    columns: [
      {
        key: "m-fan-rotation-sp-max",
        label: "M-Fan Rotation Sp Max",
        getValue: getValueByCode(
          "M_FAN_INSPECTION",
          "M_FAN_INSPECTION_ROTATION_SPEED_MAX_VALUE"
        ),
      },
      {
        key: "m-fan-rotation-sp-min",
        label: "M-Fan Rotation Sp Min",
        getValue: getValueByCode(
          "M_FAN_INSPECTION",
          "M_FAN_INSPECTION_ROTATION_SPEED_MIN_VALUE"
        ),
      },
      {
        key: "m-fan-ampere-max",
        label: "M-Fan Ampere Max",
        getValue: getValueByCode(
          "M_FAN_INSPECTION",
          "M_FAN_INSPECTION_AMPERE_MAX_VALUE"
        ),
      },
      {
        key: "m-fan-ampere-min",
        label: "M-Fan Ampere Min",
        getValue: getValueByCode(
          "M_FAN_INSPECTION",
          "M_FAN_INSPECTION_AMPERE_MIN_VALUE"
        ),
      },
      {
        key: "m-fan-wind-direction",
        label: "M-Fan Wind Direction",
        getValue: getValueByCode(
          "M_FAN_INSPECTION",
          "M_FAN_INSPECTION_WIND_DIRECTION_VALUE"
        ),
      },
      {
        key: "m-fan-inspection-result",
        label: "M-Fan Inspection OK / NG",
        getValue: getValueByCode("M_FAN_INSPECTION", "M_FAN_TEST_RESULT"),
      },
    ],
  },
  {
    key: "ecm-assy",
    title: "ECM Assy",
    columns: [
      {
        key: "ecm-bolt-tight-qty",
        label: "ECM Assy Bolt Tight Qty",
        getValue: getValueByCode("ECM_ASSY", "ECM_ASSY_BOLT_TIGHTEN_VALUE"),
      },
      {
        key: "ecm-bolt-tight-ok",
        label: "ECM Assy Bolt Tight OK",
        getValue: getValueByCode("ECM_ASSY", "ECM_ASSY_BOLT_TIGHTEN_RESULT"),
      },
    ],
  },
  {
    key: "final-inspection",
    title: "Final Inspection",
    columns: [
      {
        key: "final-inspection-ok",
        label: "Final Inspection OK",
        getValue: getValueByCode("FINAL_INSPECTION", "ALL_CHECK_POINT_RESULT"),
      },
    ],
  },
];

const flatColumns = summaryGroups.flatMap((group) => group.columns);

export default function DataSummaryTable() {
  const toast = useToast();
  const lastErrorRef = useRef<string | null>(null);
  const [serialNumberSearch, setSerialNumberSearch] = useState("");
  const debouncedSerialNumberSearch = useDebouncedValue(
    serialNumberSearch.trim(),
    500
  );
  const [fullValuesBySerial, setFullValuesBySerial] = useState<
    Record<string, ProcessLogFullValues>
  >({});
  const [detailError, setDetailError] = useState<string | null>(null);
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);

  const {
    data,
    error,
    isLoading,
    pagination,
    query,
    setLimit,
    setPage,
    setQuery,
  } = useProcessLogs({
    limit: 10,
    page: 1,
  });

  const serialNumberKey = useMemo(
    () =>
      Array.from(
        new Set(
          data
            .map((processLog) => processLog.serialNumberCode)
            .filter((serialNumber): serialNumber is string =>
              Boolean(serialNumber)
            )
        )
      ).join("|"),
    [data]
  );

  useEffect(() => {
    if (debouncedSerialNumberSearch === query.serialNumberCode) {
      return;
    }

    setQuery({ serialNumberCode: debouncedSerialNumberSearch });
  }, [debouncedSerialNumberSearch, query.serialNumberCode, setQuery]);

  useEffect(() => {
    if (!error || lastErrorRef.current === error) {
      return;
    }

    lastErrorRef.current = error;
    toast.error({
      message: error,
      title: "Failed to load process logs",
    });
  }, [error, toast]);

  useEffect(() => {
    const controller = new AbortController();
    const serialNumbers = serialNumberKey ? serialNumberKey.split("|") : [];

    const loadDetails = async () => {
      if (serialNumbers.length === 0) {
        setIsLoadingDetails(false);
        return;
      }

      setIsLoadingDetails(true);
      setDetailError(null);

      try {
        const results = await Promise.allSettled(
          serialNumbers.map((serialNumber) =>
            ProcessLogService.getProcessLogFullValues(serialNumber, {
              signal: controller.signal,
            })
          )
        );

        if (controller.signal.aborted) {
          return;
        }

        const nextFullValues: Record<string, ProcessLogFullValues> = {};
        let failedCount = 0;

        results.forEach((result, index) => {
          const serialNumber = serialNumbers[index];

          if (result.status === "fulfilled") {
            nextFullValues[serialNumber] = result.value.data;
            return;
          }

          failedCount += 1;
        });

        setFullValuesBySerial(nextFullValues);
        setDetailError(
          failedCount > 0
            ? `${failedCount} process log detail${failedCount === 1 ? "" : "s"} failed to load.`
            : null
        );
      } catch (fetchError: unknown) {
        if (
          fetchError instanceof DOMException &&
          fetchError.name === "AbortError"
        ) {
          return;
        }

        setDetailError(
          fetchError instanceof Error
            ? fetchError.message
            : "Failed to load data summary details"
        );
      } finally {
        if (!controller.signal.aborted) {
          setIsLoadingDetails(false);
        }
      }
    };

    void loadDetails();

    return () => controller.abort();
  }, [serialNumberKey]);

  const currentPage = pagination?.page ?? 1;
  const currentLimit = pagination?.limit ?? 10;
  const totalPage = pagination?.totalPage ?? 1;
  const total = pagination?.total ?? data.length;
  const firstItem = data.length > 0 ? (currentPage - 1) * currentLimit + 1 : 0;
  const lastItem = data.length > 0 ? firstItem + data.length - 1 : 0;
  const isTableLoading = isLoading || isLoadingDetails;
  const tableMinWidth = 210 + flatColumns.length * 160;

  const handleExport = () => {
    if (isTableLoading) {
      toast.info({
        title: "Export is preparing",
        message: "Please wait until the data summary finishes loading.",
      });
      return;
    }

    if (data.length === 0) {
      toast.warning({
        title: "No data",
        message: "There is no data summary to export.",
      });
      return;
    }

    const groupHeaderCells = summaryGroups
      .map(
        (group) =>
          `<th colspan="${group.columns.length}">${escapeHtml(group.title)}</th>`
      )
      .join("");
    const columnHeaderCells = flatColumns
      .map((column) => `<th>${escapeHtml(column.label)}</th>`)
      .join("");
    const bodyRows = data
      .map((processLog) => {
        const serialNumberCode = processLog.serialNumberCode ?? "";
        const fullValues = fullValuesBySerial[serialNumberCode];
        const cells = flatColumns
          .map((column) => {
            const value = column.getValue(fullValues, processLog);
            return `<td>${escapeHtml(value)}</td>`;
          })
          .join("");

        return `<tr><td>${escapeHtml(serialNumberCode || "-")}</td>${cells}</tr>`;
      })
      .join("");
    const worksheet = `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <style>
      table { border-collapse: collapse; font-family: Arial, sans-serif; }
      th, td { border: 1px solid #b7b7b7; padding: 6px 10px; white-space: nowrap; }
      th { background: #217346; color: #ffffff; font-weight: 700; text-align: center; }
      td { text-align: center; }
      td:first-child { font-weight: 700; text-align: left; }
    </style>
  </head>
  <body>
    <table>
      <thead>
        <tr>
          <th rowspan="2">Name Label Serial No.</th>
          ${groupHeaderCells}
        </tr>
        <tr>${columnHeaderCells}</tr>
      </thead>
      <tbody>${bodyRows}</tbody>
    </table>
  </body>
</html>`;
    const blob = new Blob(["\ufeff", worksheet], {
      type: "application/vnd.ms-excel;charset=utf-8;",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = getExportFileName();
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);

    toast.success({
      title: "Export ready",
      message: "Data summary exported successfully.",
    });
  };

  return (
    <div className="mx-4 my-4 overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-white/[0.05] dark:bg-white/[0.03]">
      <div className="border-b border-gray-100 px-5 py-4 dark:border-white/[0.05]">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-wrap items-center gap-3">
            <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
              Show
              <select
                className={selectClassName}
                disabled={isTableLoading}
                onChange={(event) => setLimit(Number(event.target.value))}
                value={currentLimit}
              >
                {[10, 25, 50, 100].map((limit) => (
                  <option key={limit} value={limit}>
                    {limit}
                  </option>
                ))}
              </select>
              entries
            </label>

            <input
              className={filterInputClassName}
              onChange={(event) => setSerialNumberSearch(event.target.value)}
              placeholder="Serial Number"
              type="text"
              value={serialNumberSearch}
            />
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-end">
            {detailError && data.length > 0 && (
              <p className="text-sm font-medium text-error-600 dark:text-error-400">
                {detailError}
              </p>
            )}

            <button
              className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-[#217346] px-4 text-sm font-semibold text-white shadow-theme-xs transition-colors hover:bg-[#185C37] focus:outline-none focus:ring-3 focus:ring-[#217346]/25 disabled:cursor-not-allowed disabled:opacity-60"
              disabled={isTableLoading}
              onClick={handleExport}
              type="button"
            >
              <ExcelIcon />
              <span>Export Excel</span>
            </button>
          </div>
        </div>
      </div>

      <div className="mx-4 mb-4 mt-2 overflow-hidden rounded-lg border border-gray-100 dark:border-white/[0.05]">
        <div className="max-w-full overflow-x-auto">
          <table
            className="w-full border-collapse text-left text-sm"
            style={{ minWidth: `${tableMinWidth}px` }}
          >
            <thead className="text-xs font-semibold uppercase text-white">
              <tr>
                <th
                  className="sticky left-0 z-20 w-[210px] border border-[#5E7FE6] bg-[#6D8AF3] px-4 py-3 text-center align-middle dark:border-[#5E7FE6] dark:bg-[#6D8AF3]"
                  rowSpan={2}
                >
                  Name Label Serial No.
                </th>
                {summaryGroups.map((group) => (
                  <th
                    className="border border-[#5E7FE6] bg-[#5F7DE0] px-4 py-3 text-center align-middle dark:border-[#5E7FE6] dark:bg-[#5F7DE0]"
                    colSpan={group.columns.length}
                    key={group.key}
                  >
                    {group.title}
                  </th>
                ))}
              </tr>
              <tr>
                {flatColumns.map((column) => (
                  <th
                    className="min-w-[160px] border border-[#5E7FE6] bg-[#6D8AF3] px-4 py-3 text-center align-middle dark:border-[#5E7FE6] dark:bg-[#6D8AF3]"
                    key={column.key}
                  >
                    <span className="block whitespace-normal break-words leading-5">
                      {column.label}
                    </span>
                  </th>
                ))}
              </tr>
            </thead>

            <tbody className="divide-y divide-gray-100 dark:divide-white/[0.08]">
              {isTableLoading &&
                Array.from({ length: currentLimit }).map((_, rowIndex) => (
                  <tr key={`loading-${rowIndex}`}>
                    <td className="sticky left-0 z-10 border-r border-gray-100 bg-white px-4 py-4 dark:border-white/[0.08] dark:bg-[#111827]">
                      <div className="h-4 w-full animate-pulse rounded bg-gray-100 dark:bg-white/[0.05]" />
                    </td>
                    {flatColumns.map((column) => (
                      <td className="px-4 py-4" key={column.key}>
                        <div className="h-4 w-full animate-pulse rounded bg-gray-100 dark:bg-white/[0.05]" />
                      </td>
                    ))}
                  </tr>
                ))}

              {!isTableLoading && error && (
                <tr>
                  <td
                    className="px-5 py-8 text-center text-sm text-error-600 dark:text-error-400"
                    colSpan={flatColumns.length + 1}
                  >
                    {error}
                  </td>
                </tr>
              )}

              {!isTableLoading && !error && data.length === 0 && (
                <tr>
                  <td
                    className="px-5 py-8 text-center text-sm text-gray-500 dark:text-gray-400"
                    colSpan={flatColumns.length + 1}
                  >
                    No data summary found
                  </td>
                </tr>
              )}

              {!isTableLoading &&
                !error &&
                data.map((processLog) => {
                  const serialNumberCode = processLog.serialNumberCode ?? "";
                  const fullValues = fullValuesBySerial[serialNumberCode];

                  return (
                    <tr
                      className="hover:bg-gray-50/70 dark:hover:bg-white/[0.03]"
                      key={processLog.id}
                    >
                      <td className="sticky left-0 z-10 border-r border-gray-100 bg-white px-4 py-4 font-semibold text-gray-800 dark:border-white/[0.08] dark:bg-[#111827] dark:text-white/90">
                        {serialNumberCode || "-"}
                      </td>
                      {flatColumns.map((column) => {
                        const value = column.getValue(fullValues, processLog);

                        return (
                          <td
                            className={`px-4 py-4 text-center font-semibold ${getValueClassName(
                              value
                            )}`}
                            key={column.key}
                          >
                            {value}
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
            </tbody>
          </table>
        </div>
      </div>

      {pagination && (
        <div className="flex flex-col gap-3 border-t border-gray-100 px-5 py-4 text-sm text-gray-500 dark:border-white/[0.05] dark:text-gray-400 sm:flex-row sm:items-center sm:justify-between">
          <span>
            Showing {firstItem} to {lastItem} of {total} entries
          </span>

          <div className="flex flex-wrap items-center gap-2">
            <button
              className="rounded-lg border border-gray-300 px-3 py-2 font-medium text-gray-700 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-700 dark:text-gray-300"
              disabled={currentPage <= 1 || isTableLoading}
              onClick={() => setPage(currentPage - 1)}
              type="button"
            >
              Prev
            </button>

            <button
              className="h-10 min-w-10 rounded-lg border border-brand-500 bg-brand-500 px-3 text-sm font-medium text-white"
              disabled
              type="button"
            >
              {currentPage}
            </button>

            <button
              className="rounded-lg border border-gray-300 px-3 py-2 font-medium text-gray-700 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-700 dark:text-gray-300"
              disabled={currentPage >= totalPage || isTableLoading}
              onClick={() => setPage(currentPage + 1)}
              type="button"
            >
              Next
            </button>

            <button
              className="rounded-lg border border-gray-300 px-3 py-2 font-medium text-gray-700 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-700 dark:text-gray-300"
              disabled={currentPage >= totalPage || isTableLoading}
              onClick={() => setPage(totalPage)}
              type="button"
            >
              Last Page
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function ExcelIcon() {
  return (
    <span
      aria-hidden="true"
      className="relative inline-flex size-5 shrink-0 items-center justify-center"
    >
      <span className="absolute right-0 top-0 h-4 w-3.5 rounded-[2px] bg-white/95">
        <span className="absolute left-1/2 top-1 h-2.5 w-px -translate-x-1/2 bg-[#217346]/25" />
        <span className="absolute left-0 top-1/2 h-px w-full -translate-y-1/2 bg-[#217346]/25" />
      </span>
      <span className="absolute left-0 top-1/2 flex size-4 -translate-y-1/2 items-center justify-center rounded-[3px] bg-[#185C37] text-[10px] font-black leading-none text-white shadow-sm">
        X
      </span>
    </span>
  );
}
