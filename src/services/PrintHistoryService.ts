import api, { ApiRequestOptions } from "@/utils/api";
import { ApiListResponse } from "./ParameterService";

export type PrintModule = "StockIn" | "Clinching" | "MFanAssy" | string | number;
export type PrintStatus = "Failed" | "Success" | string | number;

export type PrintHistory = {
  id: number;
  module: PrintModule;
  referenceId: number;
  referenceNumber?: string | null;
  printerName: string;
  status: PrintStatus;
  errorMessage?: string | null;
  stackTrace?: string | null;
  retryCount: number;
  createdAt: string;
  lastRetryAt?: string | null;
};

export type PrintHistoryQuery = {
  page?: number;
  limit?: number;
  search?: string;
};

const PRINT_HISTORY_ENDPOINT = "/api/print-histories";

const normalizeQuery = (query: PrintHistoryQuery) => ({
  page: query.page,
  limit: query.limit,
  search: query.search,
});

const PrintHistoryService = {
  getPrintHistories: async (
    query: PrintHistoryQuery = {},
    options?: ApiRequestOptions
  ) => {
    const response = await api.get<ApiListResponse<PrintHistory>>(
      PRINT_HISTORY_ENDPOINT,
      {
        ...options,
        params: normalizeQuery(query),
      }
    );

    return response.data;
  },

  reprint: async (id: number, options?: ApiRequestOptions) => {
    const response = await api.post<{
      success: boolean;
      message: string;
      data?: PrintHistory | null;
    }>(`${PRINT_HISTORY_ENDPOINT}/reprint/${id}`, undefined, options);

    return response.data;
  },
};

export default PrintHistoryService;
