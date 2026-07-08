import api, { ApiRequestOptions } from "@/utils/api";
import { ApiListResponse } from "./ParameterService";

export type SerialNumber = {
  id: number;
  serialNumberCode: string;
  type: string;
  createdAt: string;
  createdBy?: string | null;
  updatedAt?: string | null;
  updatedBy?: string | null;
};

export type SerialNumberQuery = {
  page?: number;
  limit?: number;
  search?: string;
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
};

export default SerialNumberService;
