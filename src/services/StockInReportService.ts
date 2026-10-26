import api, { ApiError, ApiRequestOptions } from "@/utils/api";
import type { ApiListResponse } from "./PartService";

export type StockInReportFilters = {
  startDate?: string;
  endDate?: string;
  partId?: number;
};

export type StockInReportQuery = StockInReportFilters & {
  page?: number;
  limit?: number;
};

export type StockInReportRow = {
  id: number;
  createdAt: string;
  issueNumber: string;
  partId: number;
  partNumber: string;
  partName: string;
  supplyQty: number;
  supplyDate: string;
  receiptQty: number;
  receiptDate: string;
  balance: number | null;
};

export type StockInReportFormat = "pdf";

const REPORT_PATH = (
  process.env.NEXT_PUBLIC_STOCK_IN_REPORT_API_PATH || "/api/reports/stock-in"
).replace(/\/$/, "");

const isCalendarDate = (value: string) => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
};

// The BE filters SupplyDate by calendar date and includes the entire end day.
export const normalizeStockInReportFilters = (filters: StockInReportFilters) => {
  const startDate = filters.startDate || undefined;
  const endDate = filters.endDate || startDate;
  if ((startDate && !isCalendarDate(startDate)) || (endDate && !isCalendarDate(endDate))) {
    throw new Error("Please select a valid date.");
  }
  if (startDate && endDate && startDate > endDate) {
    throw new Error("End Date must be on or after Start Date.");
  }
  if (filters.partId !== undefined && (!Number.isInteger(filters.partId) || filters.partId <= 0)) {
    throw new Error("Please select a valid part.");
  }
  return { startDate, endDate, partId: filters.partId };
};

export const isStockInReportUnavailable = (error: unknown) =>
  error instanceof ApiError && [404, 405, 501].includes(error.status);

const StockInReportService = {
  getReport: async (query: StockInReportQuery, options?: ApiRequestOptions) => {
    const response = await api.get<ApiListResponse<StockInReportRow>>(REPORT_PATH, {
      ...options,
      params: {
        ...normalizeStockInReportFilters(query),
        page: query.page ?? 1,
        limit: query.limit ?? 10,
      },
    });
    if (!response.data.success) throw new Error(response.data.message || "Failed to load stock in report.");
    if (!Array.isArray(response.data.data) || !response.data.pagination) {
      throw new Error("The report response could not be read. Please try again later.");
    }
    return response.data;
  },

  exportReport: async (filters: StockInReportFilters, format: StockInReportFormat, options?: ApiRequestOptions) => {
    const response = await api.get<Blob>(`${REPORT_PATH}/export`, {
      ...options,
      params: { ...normalizeStockInReportFilters(filters), format },
      responseType: "blob",
      headers: { Accept: "application/pdf" },
    });
    const contentType = response.data.type.split(";")[0].toLowerCase();
    if (!response.data.size || contentType !== "application/pdf") {
      throw new Error("The report file could not be downloaded. Please try again later.");
    }
    return response.data;
  },
};

export default StockInReportService;
