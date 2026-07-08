import api, { ApiRequestOptions } from "@/utils/api";
import { ApiListResponse } from "./ParameterService";

export type StockInRework = {
  id: number;
  serialNumberId: number;
  serialNumberCode?: string | null;
  issueNumberBefore: string;
  issueNumberAfter: string;
  qty: number;
  note?: string | null;
  status: boolean;
  createdAt: string;
  updatedAt?: string | null;
};

export type StockInReworkIssueRequest = {
  issueNumber: string;
  note?: string;
  status: boolean;
};

export type CreateStockInReworkRequest = {
  serialNumberCode: string;
  issueNumbers: StockInReworkIssueRequest[];
};

export type StockInReworkQuery = {
  page?: number;
  limit?: number;
  serialNumberId?: number;
};

const STOCK_IN_REWORK_ENDPOINT = "/api/stock-in-reworks";

const normalizeQuery = (query: StockInReworkQuery) => ({
  page: query.page,
  limit: query.limit,
  serialNumberId: query.serialNumberId,
});

const StockInReworkService = {
  getStockInReworks: async (
    query: StockInReworkQuery = {},
    options?: ApiRequestOptions
  ) => {
    const response = await api.get<ApiListResponse<StockInRework>>(
      STOCK_IN_REWORK_ENDPOINT,
      {
        ...options,
        params: normalizeQuery(query),
      }
    );

    return response.data;
  },

  createStockInRework: async (
    data: CreateStockInReworkRequest,
    options?: ApiRequestOptions
  ) => {
    const response = await api.post<{
      success: boolean;
      message: string;
      data: StockInRework[];
    }>(STOCK_IN_REWORK_ENDPOINT, data, options);

    return response.data;
  },
};

export default StockInReworkService;
