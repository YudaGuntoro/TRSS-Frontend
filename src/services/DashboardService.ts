import api, { ApiRequestOptions } from "@/utils/api";

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

export type DashboardLogParameter = {
  parameterId: number;
  parameterName: string;
  dataType: string;
  values: Array<string | number | boolean>;
};

export type DashboardLogDetail = {
  processName: string;
  parameters: DashboardLogParameter[];
};

export type DashboardRecentLog = {
  id: number;
  issueNo: string;
  partNumber?: string;
  partName?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt?: string;
  details: DashboardLogDetail[];
};

type ApiDataResponse<T> = {
  success: boolean;
  message: string;
  data: T;
};

type BackendProcessLogParameter = {
  parameterCode?: string;
  parameterName?: string;
  status?: boolean;
  value?: string | number | boolean | null;
};

type BackendProcessLogProcess = {
  parameters?: BackendProcessLogParameter[];
  processCode?: string;
  processName?: string;
  result?: boolean;
};

type BackendProcessLogIssue = {
  issueNumber?: string;
  partName?: string;
  partNumber?: string;
};

type BackendProcessLog = {
  createdAt: string;
  id: number;
  isActive: boolean;
  issues?: BackendProcessLogIssue[];
  processes?: BackendProcessLogProcess[];
  serialNumberCode?: string;
  updatedAt?: string;
};

const normalizeLogValue = (value: BackendProcessLogParameter["value"]) => {
  if (value === null || value === undefined || value === "") {
    return "-";
  }

  return value;
};

const getValueDataType = (value: string | number | boolean) => {
  if (typeof value === "boolean") {
    return "boolean";
  }

  if (typeof value === "number") {
    return "number";
  }

  return "text";
};

const mapRecentLog = (log: BackendProcessLog): DashboardRecentLog => {
  const firstIssue = log.issues?.[0];

  return {
    id: log.id,
    issueNo: firstIssue?.issueNumber ?? log.serialNumberCode ?? "-",
    partName: firstIssue?.partName,
    partNumber: firstIssue?.partNumber,
    isActive: log.isActive,
    createdAt: log.createdAt,
    updatedAt: log.updatedAt,
    details: (log.processes ?? []).map((process) => ({
      processName: process.processName ?? process.processCode ?? "-",
      parameters: (process.parameters ?? []).map((parameter, index) => {
        const value = normalizeLogValue(parameter.value);

        return {
          parameterId: index,
          parameterName:
            parameter.parameterName ?? parameter.parameterCode ?? "-",
          dataType: getValueDataType(value),
          values: [value],
        };
      }),
    })),
  };
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
      data: response.data.data.map(mapRecentLog),
    };
  },
};

export default DashboardService;
