/**
 * Helper for parsing and formatting process/parameter status values.
 * Standard ConfigController Status Codes:
 * - 0: Error / Failed
 * - 1: OK / Passed
 * - 2: NG / Not Good / Belum Running
 */

export type ProcessStatusCode = 0 | 1 | 2;

export type ProcessStatusType = "ok" | "error" | "ng" | "unknown";

export interface ProcessStatusInfo {
  code: ProcessStatusCode | null;
  status: ProcessStatusType;
  label: string;
  isOk: boolean;
  isError: boolean;
  isNg: boolean;
  badgeClass: string;
  textClass: string;
  bgClass: string;
  borderClass: string;
}

/**
 * Normalizes any value (number 0/1/2, boolean, string) into ProcessStatusCode (0, 1, 2) or null.
 */
export function normalizeStatusCode(value: unknown): ProcessStatusCode | null {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  if (typeof value === "number") {
    if (value === 1) return 1;
    if (value === 0) return 0;
    if (value === 2) return 2;
    return null;
  }

  if (typeof value === "boolean") {
    return value ? 1 : 2;
  }

  if (typeof value === "string") {
    const trimmed = value.trim().toLowerCase();
    if (
      trimmed === "1" ||
      trimmed === "ok" ||
      trimmed === "true" ||
      trimmed === "passed"
    ) {
      return 1;
    }
    if (
      trimmed === "0" ||
      trimmed === "error" ||
      trimmed === "err" ||
      trimmed === "fail" ||
      trimmed === "failed"
    ) {
      return 0;
    }
    if (
      trimmed === "2" ||
      trimmed === "ng" ||
      trimmed === "false" ||
      trimmed === "rejected" ||
      trimmed === "belum running"
    ) {
      return 2;
    }
  }

  return null;
}

/**
 * Parses any value into a comprehensive ProcessStatusInfo object with styling classes.
 */
export function parseProcessStatus(value: unknown): ProcessStatusInfo {
  const code = normalizeStatusCode(value);

  if (code === 1) {
    return {
      code: 1,
      status: "ok",
      label: "OK",
      isOk: true,
      isError: false,
      isNg: false,
      badgeClass:
        "bg-success-100 text-success-700 border-success-200 dark:bg-success-500/20 dark:text-success-300 dark:border-success-500/30",
      textClass: "text-success-600 dark:text-success-400 font-semibold",
      bgClass: "bg-success-50 dark:bg-success-500/10",
      borderClass: "border-success-200 dark:border-success-500/30",
    };
  }

  if (code === 0) {
    return {
      code: 0,
      status: "error",
      label: "Error",
      isOk: false,
      isError: true,
      isNg: false,
      badgeClass:
        "bg-error-100 text-error-700 border-error-200 dark:bg-error-500/20 dark:text-error-300 dark:border-error-500/30",
      textClass: "text-error-600 dark:text-error-400 font-semibold",
      bgClass: "bg-error-50 dark:bg-error-500/10",
      borderClass: "border-error-200 dark:border-error-500/30",
    };
  }

  if (code === 2) {
    return {
      code: 2,
      status: "ng",
      label: "NG",
      isOk: false,
      isError: false,
      isNg: true,
      badgeClass:
        "bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-500/20 dark:text-amber-300 dark:border-amber-500/30",
      textClass: "text-amber-600 dark:text-amber-400 font-semibold",
      bgClass: "bg-amber-50 dark:bg-amber-500/10",
      borderClass: "border-amber-200 dark:border-amber-500/30",
    };
  }

  return {
    code: null,
    status: "unknown",
    label: value !== null && value !== undefined && value !== "" ? String(value) : "-",
    isOk: false,
    isError: false,
    isNg: false,
    badgeClass:
      "bg-gray-100 text-gray-700 border-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-700",
    textClass: "text-gray-600 dark:text-gray-400",
    bgClass: "bg-gray-50 dark:bg-gray-900",
    borderClass: "border-gray-200 dark:border-gray-800",
  };
}

/**
 * Formats a process status value to string label ("OK", "Error", "NG", or fallback).
 */
export function formatStatusLabel(value: unknown, fallback: string = "-"): string {
  const info = parseProcessStatus(value);
  return info.status !== "unknown"
    ? info.label
    : value != null && value !== ""
      ? String(value)
      : fallback;
}

/**
 * Checks if status value is OK (1, true, "OK").
 */
export function isStatusOk(value: unknown): boolean {
  return normalizeStatusCode(value) === 1;
}

/**
 * Checks if status value is Error (0, "Error").
 */
export function isStatusError(value: unknown): boolean {
  return normalizeStatusCode(value) === 0;
}

/**
 * Checks if status value is NG (2, false, "NG").
 */
export function isStatusNg(value: unknown): boolean {
  return normalizeStatusCode(value) === 2;
}

/**
 * Returns Tailwind text class for the given status value.
 */
export function getStatusTextClass(value: unknown): string {
  return parseProcessStatus(value).textClass;
}

/**
 * Returns Tailwind badge class for the given status value.
 */
export function getStatusBadgeClass(value: unknown): string {
  return parseProcessStatus(value).badgeClass;
}

/**
 * Checks if a parameter code or name is a continuous measurement value / sensor quantity
 * that should NEVER be converted or parsed into OK / NG / Error status.
 */
export function isMeasurementParameter(parameterCodeOrName?: string): boolean {
  if (!parameterCodeOrName) return false;
  const normalized = parameterCodeOrName
    .trim()
    .toUpperCase()
    .replace(/[\s_-]+/g, "_");

  // Status results that SHOULD be parsed as status.
  if (normalized.endsWith("_RESULT") || normalized.endsWith("_STATUS")) {
    return false;
  }

  return (
    normalized.includes("LEAK_LAST_LEAKAGE") ||
    normalized.includes("LEAKAGE") ||
    normalized.includes("ROTATION_SPEED") ||
    normalized.includes("ROTATION") ||
    normalized.includes("AMPERE") ||
    normalized.includes("AMPERAGE") ||
    normalized.includes("QTY") ||
    normalized.includes("HEIGHT_AVG") ||
    normalized.includes("HEIGHT_AVERAGE") ||
    normalized.includes("ECM_ASSY_BOLT_TIGHTEN_VALUE") ||
    normalized.includes("ECM_BOLT_TIGHTEN")
  );
}
