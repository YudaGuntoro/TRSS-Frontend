import api, { ApiRequestOptions } from "@/utils/api";
import { ApiListResponse } from "./ParameterService";

export type ProcessLogParameter = {
  parameterId: number;
  parameterCode?: string;
  parameterName?: string;
  dataType?: "boolean" | "number" | "text" | string;
  status?: boolean;
  values: Array<string | number | boolean>;
};

export type ProcessLogDetail = {
  processCode?: string;
  processName?: string;
  result?: boolean;
  parameters: ProcessLogParameter[];
};

export type ProcessLogIssue = {
  issueType?: string;
  issueNumber?: string;
  partNumber?: string;
  partName?: string;
};

export type ProcessLog = {
  id: number;
  issueNo: string;
  issues: ProcessLogIssue[];
  partNumber?: string;
  partName?: string;
  isActive: boolean;
  status?: boolean;
  isParent?: boolean;
  serialNumberCode?: string;
  type?: string;
  createdAt: string;
  updatedAt?: string;
  details: ProcessLogDetail[];
};

export type ProcessLogQuery = {
  page?: number;
  limit?: number;
  serialNumberCode?: string;
  issueNo?: string;
  partNumber?: string;
  isActive?: boolean | null;
};

const normalizeQuery = (query: ProcessLogQuery) => ({
  page: query.page,
  limit: query.limit,
  serialNumberCode: query.serialNumberCode ?? query.issueNo,
  isActive: query.isActive ?? undefined,
});

const PROCESS_LOG_ENDPOINT = "/api/process-logs";

export type BackendProcessLogParameter = {
  parameterCode?: string;
  parameterId?: number;
  parameterName?: string;
  dataType?: string;
  status?: boolean;
  value?: unknown;
  values?: unknown[];
};

export type BackendProcessLogProcess = {
  parameters?: BackendProcessLogParameter[];
  processCode?: string;
  processName?: string;
  result?: boolean;
};

export type BackendProcessLog = {
  createdAt: string;
  details?: BackendProcessLogProcess[];
  id: number;
  isActive?: boolean;
  isParent?: boolean;
  issueNo?: string;
  issues?: ProcessLogIssue[];
  partName?: string;
  partNumber?: string;
  processes?: BackendProcessLogProcess[];
  serialNumberCode?: string;
  status?: boolean;
  type?: string;
  updatedAt?: string;
};

const normalizeLogValue = (value: unknown): string | number | boolean => {
  if (value === null || value === undefined || value === "") {
    return "-";
  }

  if (
    typeof value === "string" ||
    typeof value === "number" ||
    typeof value === "boolean"
  ) {
    return value;
  }

  return String(value);
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

const joinUnique = (values: Array<string | undefined>) => {
  const uniqueValues = Array.from(new Set(values.filter(Boolean) as string[]));
  return uniqueValues.join(", ");
};

export const mapProcessLogResponse = (log: BackendProcessLog): ProcessLog => {
  const issues = log.issues ?? [];
  const issueNo =
    joinUnique(issues.map((issue) => issue.issueNumber)) ||
    log.issueNo ||
    log.serialNumberCode ||
    "-";
  const sourceProcesses = log.processes ?? log.details ?? [];

  return {
    id: log.id,
    issueNo,
    issues,
    partName: joinUnique(issues.map((issue) => issue.partName)) || log.partName,
    partNumber:
      joinUnique(issues.map((issue) => issue.partNumber)) || log.partNumber,
    isActive:
      typeof log.isActive === "boolean"
        ? log.isActive
        : Boolean(log.status),
    status: log.status,
    isParent: log.isParent,
    serialNumberCode: log.serialNumberCode,
    type: log.type,
    createdAt: log.createdAt,
    updatedAt: log.updatedAt,
    details: sourceProcesses.map((process) => ({
      processCode: process.processCode,
      processName: process.processName ?? process.processCode ?? "-",
      result: process.result,
      parameters: (process.parameters ?? []).map((parameter, index) => {
        const values =
          parameter.values && parameter.values.length > 0
            ? parameter.values.map(normalizeLogValue)
            : [normalizeLogValue(parameter.value)];
        const firstValue = values[0] ?? "-";

        return {
          parameterId: parameter.parameterId ?? index,
          parameterCode: parameter.parameterCode,
          parameterName:
            parameter.parameterName ?? parameter.parameterCode ?? "-",
          dataType: parameter.dataType ?? getValueDataType(firstValue),
          status: parameter.status,
          values,
        };
      }),
    })),
  };
};

const ProcessLogService = {
  getProcessLogs: async (
    query: ProcessLogQuery = {},
    options?: ApiRequestOptions
  ) => {
    const response = await api.get<ApiListResponse<BackendProcessLog>>(
      PROCESS_LOG_ENDPOINT,
      {
        ...options,
        params: normalizeQuery(query),
      }
    );

    return {
      ...response.data,
      data: response.data.data.map(mapProcessLogResponse),
    };
  },

  getProcessLog: async (id: number, options?: ApiRequestOptions) => {
    const response = await api.get<{
      success: boolean;
      message: string;
      data: BackendProcessLog;
    }>(`${PROCESS_LOG_ENDPOINT}/${id}`, options);

    return {
      ...response.data,
      data: mapProcessLogResponse(response.data.data),
    };
  },
};

export default ProcessLogService;
