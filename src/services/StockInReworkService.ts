import api, { ApiRequestOptions } from "@/utils/api";
import { ApiListResponse } from "./ParameterService";
import SerialNumberService from "./SerialNumberService";

export type StockInReworkDisposition = "PENDING" | "STOCK_IN" | "SCRAP";
export type StockInReworkFinalDisposition = Exclude<
  StockInReworkDisposition,
  "PENDING"
>;
export type StockInReworkDispositionFilter =
  | StockInReworkFinalDisposition
  | "ALL"
  | "";

export type StockInRework = {
  id: number;
  serialNumberId: number;
  serialNumberCode?: string | null;
  issueNumberBefore: string;
  issueNumberAfter: string;
  count?: number;
  qty: number;
  note?: string | null;
  status: boolean;
  disposition?: StockInReworkDisposition | string | null;
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

export type UpdateStockInReworkDispositionRequest = {
  disposition: StockInReworkFinalDisposition;
};

export type StockInReworkQuery = {
  page?: number;
  limit?: number;
  serialNumberId?: number;
  serialNumberCode?: string;
  disposition?: StockInReworkDispositionFilter;
  includeAllDispositions?: boolean;
};

const STOCK_IN_REWORK_ENDPOINT = "/api/stock-in-reworks";

const normalizeQuery = (query: StockInReworkQuery) => ({
  page: query.page,
  limit: query.limit,
  serialNumberId: query.serialNumberId,
  serialNumberCode: query.serialNumberCode,
  disposition:
    query.disposition && query.disposition !== "ALL"
      ? query.disposition
      : undefined,
  includeAllDispositions: query.includeAllDispositions,
});

const StockInReworkService = {
  getStockInReworks: async (
    query: StockInReworkQuery = {},
    options?: ApiRequestOptions
  ) => {
    const serialNumberCode = query.serialNumberCode?.trim();
    const serialNumberId = serialNumberCode
      ? (await SerialNumberService.getSerialNumberByCode(serialNumberCode, options)).data?.id
      : query.serialNumberId;
    if (serialNumberCode && !serialNumberId) {
      throw new Error("Serial number tidak ditemukan.");
    }
    const response = await api.get<ApiListResponse<StockInRework>>(
      STOCK_IN_REWORK_ENDPOINT,
      {
        ...options,
        params: normalizeQuery({ ...query, serialNumberCode: undefined, serialNumberId }),
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

  updateStockInReworkDisposition: async (
    id: number,
    data: UpdateStockInReworkDispositionRequest,
    options?: ApiRequestOptions
  ) => {
    const response = await api.put<{
      success: boolean;
      message: string;
      data: StockInRework;
    }>(`${STOCK_IN_REWORK_ENDPOINT}/${id}/update-disposition`, data, options);

    return response.data;
  },
};

export default StockInReworkService;
