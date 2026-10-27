import api, { ApiError, type ApiRequestOptions } from "@/utils/api";
import type { ApiListResponse } from "./PartService";

export type TraceabilityReportFilters = { startDate?: string; endDate?: string };
export type TraceabilityReportSort = "newest" | "oldest";
export type TraceabilityReportQuery = {
  filters: TraceabilityReportFilters;
  page: number;
  limit: number;
  sort: TraceabilityReportSort;
};
export type TraceabilityReportRow = {
  id: number;
  createdAt: string;
  serialNumberClinching: string;
  serialNumberMfan: string;
  clinchingIssues: string[];
  mfanIssues: string[];
  status: "OK" | "NG";
};

const REPORT_PATH = "/api/reports/traceability";
const DETAIL_EXPORT_PATH = (
  process.env.NEXT_PUBLIC_TRACEABILITY_DETAIL_EXPORT_PATH || "/api/reports/traceability-log"
).replace(/\/$/, "");

export const getTraceabilityDetailFilename = (serialNumber: string) =>
  `Traceability_${serialNumber.trim().replace(/[^A-Za-z0-9_-]/g, "_")}.xlsx`;

const isCalendarDate = (value: string) => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
};

// The report API applies date-only bounds to CreatedAt and includes the end day.
export const normalizeTraceabilityReportFilters = (filters: TraceabilityReportFilters) => {
  const startDate = filters.startDate || undefined;
  const endDate = filters.endDate || startDate;
  if ((startDate && !isCalendarDate(startDate)) || (endDate && !isCalendarDate(endDate))) {
    throw new Error("Please select a valid date.");
  }
  if (startDate && endDate && startDate > endDate) {
    throw new Error("End Date must be on or after Start Date.");
  }
  return { startDate, endDate };
};

export const isTraceabilityReportUnavailable = (error: unknown) =>
  error instanceof ApiError && [404, 405, 501].includes(error.status);

const TraceabilityReportService = {
  getReport: async (query: TraceabilityReportQuery, options?: ApiRequestOptions): Promise<ApiListResponse<TraceabilityReportRow>> => {
    if (!Number.isInteger(query.page) || query.page < 1 || !Number.isInteger(query.limit) || query.limit < 1) {
      throw new Error("Invalid report page.");
    }
    const response = await api.get<ApiListResponse<TraceabilityReportRow>>(REPORT_PATH, {
      ...options,
      params: {
        ...normalizeTraceabilityReportFilters(query.filters),
        page: query.page,
        limit: query.limit,
        sortBy: "createdAt",
        sortOrder: query.sort === "oldest" ? "asc" : "desc",
      },
    });
    if (!response.data.success || !Array.isArray(response.data.data) || !response.data.pagination) {
      throw new Error(response.data.message || "The traceability report could not be loaded.");
    }
    return response.data;
  },

  exportDetailExcel: async (clinchingSerialNumber: string, options?: ApiRequestOptions) => {
    const serial = clinchingSerialNumber.trim();
    if (!serial || serial === "-") throw new Error("Clinching serial number is missing.");
    const response = await api.get<Blob>(`${DETAIL_EXPORT_PATH}/${encodeURIComponent(serial)}/export`, {
      ...options,
      params: { format: "excel" },
      headers: { Accept: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" },
      responseType: "blob",
    });
    if (!response.data.size || response.data.type.split(";")[0].toLowerCase() !== "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet") {
      throw new Error("The detail Excel file could not be downloaded. Please try again later.");
    }
    return response.data;
  },
};

export default TraceabilityReportService;
