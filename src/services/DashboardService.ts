import api, { ApiRequestOptions } from "@/utils/api";
import {
  BackendProcessLog,
  mapProcessLogResponse,
  ProcessLog,
  ProcessLogDetail,
  ProcessLogParameter,
} from "./ProcessLogService";

export type DashboardPeriodSummary = {
  totalProduction: number;
  okCount: number;
  ngCount: number;
  yieldRate: number;
};

export type DashboardSummary = {
  today: DashboardPeriodSummary;
  thisMonth: DashboardPeriodSummary;
  total: DashboardPeriodSummary;
};

export type DashboardChartItem = {
  label: string;
  value: number;
};

export type DashboardStats = {
  qualityDistribution: DashboardChartItem[];
  topPartsProduction: DashboardChartItem[];
  productionTrend: DashboardChartItem[];
};

export type DashboardLogParameter = ProcessLogParameter;

export type DashboardLogDetail = ProcessLogDetail;

export type DashboardRecentLog = ProcessLog;

type ApiDataResponse<T> = {
  success: boolean;
  message: string;
  data: T;
};

const DashboardService = {
  getSummary: async (options?: ApiRequestOptions) => {
    const response = await api.get<ApiDataResponse<DashboardSummary>>(
      "/api/dashboard/summary",
      options
    );

    return response.data;
  },

  getStats: async (options?: ApiRequestOptions) => {
    const response = await api.get<ApiDataResponse<DashboardStats>>(
      "/api/dashboard/stats",
      options
    );

    return response.data;
  },

  getRecentLogs: async (count = 10, options?: ApiRequestOptions) => {
    const response = await api.get<ApiDataResponse<BackendProcessLog[]>>(
      "/api/dashboard/recent-logs",
      {
        ...options,
        params: {
          ...options?.params,
          count,
        },
      }
    );

    return {
      ...response.data,
      data: response.data.data.map(mapProcessLogResponse),
    };
  },
};

export default DashboardService;
