import api, { ApiRequestOptions } from "@/utils/api";
import {
  BackendTraceabilityLogV2,
  mapTraceabilityLogV2Response,
  ProcessLog,
  ProcessLogDetail,
  ProcessLogParameter,
} from "./TraceabilityLogService";

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
    const response = await api.get<ApiDataResponse<BackendTraceabilityLogV2[]>>(
      "/api/v2/traceability-logs/recents",
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
      data: response.data.data.map(mapTraceabilityLogV2Response),
    };
  },
};

export default DashboardService;
