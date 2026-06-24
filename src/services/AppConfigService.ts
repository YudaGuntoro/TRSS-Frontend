import api, { ApiRequestOptions } from "@/utils/api";
import { ApiListResponse } from "@/services/ParameterService";

export type AppConfig = {
  id: number;
  key: string;
  value: string;
  description?: string;
  createdAt: string;
  updatedAt?: string;
};

export type CreateAppConfigPayload = {
  key: string;
  value: string;
  description?: string;
};

export type UpdateAppConfigPayload = {
  value: string;
  description?: string;
};

export type AppConfigQuery = {
  page?: number;
  limit?: number;
  search?: string;
};

const normalizeQuery = (query: AppConfigQuery) => ({
  page: query.page,
  limit: query.limit,
  search: query.search,
});

const AppConfigService = {
  getAppConfigs: async (
    query: AppConfigQuery = {},
    options?: ApiRequestOptions
  ) => {
    const response = await api.get<ApiListResponse<AppConfig>>(
      "/api/appconfigs",
      {
        ...options,
        params: normalizeQuery(query),
      }
    );

    return response.data;
  },

  getAppConfig: async (id: number, options?: ApiRequestOptions) => {
    const response = await api.get<{
      success: boolean;
      message: string;
      data: AppConfig;
    }>(`/api/appconfigs/${id}`, options);

    return response.data;
  },

  getAppConfigByKey: async (key: string, options?: ApiRequestOptions) => {
    const response = await api.get<{
      success: boolean;
      message: string;
      data: AppConfig;
    }>(`/api/appconfigs/key/${encodeURIComponent(key)}`, options);

    return response.data;
  },

  createAppConfig: async (
    data: CreateAppConfigPayload,
    options?: ApiRequestOptions
  ) => {
    const response = await api.post<{
      success: boolean;
      message: string;
      data: AppConfig;
    }>("/api/appconfigs", data, options);

    return response.data;
  },

  updateAppConfig: async (
    id: number,
    data: UpdateAppConfigPayload,
    options?: ApiRequestOptions
  ) => {
    const response = await api.put<{
      success: boolean;
      message: string;
      data: AppConfig;
    }>(`/api/appconfigs/${id}`, data, options);

    return response.data;
  },

  deleteAppConfig: async (id: number, options?: ApiRequestOptions) => {
    const response = await api.delete<{
      success: boolean;
      message: string;
    }>(`/api/appconfigs/${id}`, options);

    return response.data;
  },
};

export default AppConfigService;
