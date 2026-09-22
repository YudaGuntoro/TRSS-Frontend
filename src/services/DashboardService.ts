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
  filtered?: DashboardPeriodSummary;
};

export type DashboardChartItem = {
  label: string;
  value: number;
};

export type DashboardProductionTrendItem = {
  label: string;
  value: number;
  ok?: number;
  ng?: number;
  total?: number;
};

export type DashboardStats = {
  summary?: DashboardPeriodSummary;
  qualityDistribution: DashboardChartItem[];
  topPartsProduction: DashboardChartItem[];
  productionTrend: DashboardProductionTrendItem[];
};

export type DashboardStatsPeriod = "day" | "week" | "month" | "year";

export type DashboardStatsQuery = {
  period?: DashboardStatsPeriod;
  topParts?: number;
  trendDays?: number;
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
  getSummary: async (
    query?: { period?: DashboardStatsPeriod },
    options?: ApiRequestOptions
  ) => {
    const response = await api.get<ApiDataResponse<DashboardSummary>>(
      "/api/dashboard/summary",
      {
        ...options,
        params: {
          ...options?.params,
          ...query,
        },
      }
    );

    return response.data;
  },

  getStats: async (
    query: DashboardStatsQuery = {},
    options?: ApiRequestOptions
  ) => {
    const response = await api.get<ApiDataResponse<DashboardStats>>(
      "/api/dashboard/stats",
      {
        ...options,
        params: {
          ...options?.params,
          ...query,
        },
      }
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
