import api, { ApiRequestOptions } from "@/utils/api";
import { ApiListResponse } from "./ParameterService";

export type SerialNumber = {
  id: number;
  serialNumberCode: string;
  type: string;
  issues: SerialNumberIssue[];
  createdAt: string;
  createdBy?: string | null;
  updatedAt?: string | null;
  updatedBy?: string | null;
};

export type SerialNumberIssue = {
  id: number;
  number: string;
  stockInId: number;
  partNumber: string;
  partName: string;
  createdAt: string;
  updatedAt?: string | null;
};

export type SerialNumberQuery = {
  page?: number;
  limit?: number;
  search?: string;
};

type ApiDataResponse<T> = {
  success: boolean;
  message: string;
  data: T;
};

const SerialNumberService = {
  getSerialNumbers: async (
    query: SerialNumberQuery = {},
    options?: ApiRequestOptions
  ) => {
    const response = await api.get<ApiListResponse<SerialNumber>>(
      "/api/serial-numbers",
      {
        ...options,
        params: query,
      }
    );

    return response.data;
  },

  getSerialNumberByCode: async (
    serialNumberCode: string,
    options?: ApiRequestOptions
  ) => {
    const response = await api.get<ApiDataResponse<SerialNumber>>(
      `/api/serial-numbers/${encodeURIComponent(serialNumberCode)}`,
      options
    );

    return response.data;
  },
};

export default SerialNumberService;
