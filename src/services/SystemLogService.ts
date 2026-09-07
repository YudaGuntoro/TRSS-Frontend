import api, { ApiRequestOptions } from "@/utils/api";
import { ApiListResponse } from "./ParameterService";

export const SYSTEM_LOG_LEVELS = ["INF", "WRN", "ERR", "DBG", "FTL", "VRB"] as const;
export const SYSTEM_LOG_SORT_ORDERS = ["desc", "asc"] as const;

export type SystemLog = {
  id: string;
  timestamp: string;
  level: string;
  service: string;
  environment: string;
  category: string;
  correlationId: string | null;
  requestId: string | null;
  userId: string | null;
  message: string;
  sourceFile: string;
};

export type SystemLogQuery = {
  page: number;
  limit: number;
  date: string;
  startDate: string;
  endDate: string;
  level: typeof SYSTEM_LOG_LEVELS[number] | "";
  service: string;
  category: string;
  search: string;
  sortOrder: typeof SYSTEM_LOG_SORT_ORDERS[number];
};

export const getSystemLogParams = (query: SystemLogQuery) => ({
  Page: query.page,
  Limit: query.limit,
  Date: query.date || undefined,
  StartDate: query.startDate || undefined,
  EndDate: query.endDate || undefined,
  Level: query.level || undefined,
  Service: query.service || undefined,
  Category: query.category || undefined,
  Search: query.search || undefined,
  SortOrder: query.sortOrder,
});

const SystemLogService = {
  getLogs: async (query: SystemLogQuery, options?: ApiRequestOptions) => {
    const { data } = await api.get<ApiListResponse<SystemLog>>("/api/logs/system", {
      ...options,
      params: getSystemLogParams(query),
    });
    if (!data.success) throw new Error(data.message || "Failed to load system logs.");
    return data;
  },
  getLog: async (id: string, options?: ApiRequestOptions) => {
    const { data } = await api.get<{ success: boolean; message: string; data: SystemLog }>(
      `/api/logs/system/${encodeURIComponent(id)}`,
      options
    );
    if (!data.success || !data.data) throw new Error(data.message || "System log not found.");
    return data.data;
  },
};

export default SystemLogService;
