import api, { ApiRequestOptions } from "@/utils/api";
import { ApiListResponse } from "./ParameterService";

type MaybeCased<T extends string> = T | Capitalize<T>;

type ProcessLogRawDetail = Record<string, unknown> | null;

type BackendProcessLogListItem = {
  [key in MaybeCased<
    "id" | "type" | "serialNumberCode" | "status" | "isFinished" | "createdAt" | "updatedAt" | "detail"
  >]?: unknown;
};

export type ProcessLogType = "clinching" | "mfan" | string;

export type ProcessLogDetail = Record<string, unknown>;

export type ProcessLogListItem = {
  id: number;
  type: ProcessLogType;
  serialNumberCode: string;
  status: boolean;
  isFinished: boolean;
  createdAt: string;
  updatedAt?: string;
  detail: ProcessLogDetail;
};

export type ProcessLogQuery = {
  page?: number;
  limit?: number;
  serialNumberCode?: string;
  status?: boolean | null;
  isFinished?: boolean | null;
  startDate?: string;
  endDate?: string;
};

const PROCESS_LOG_ENDPOINT = "/api/process-logs";

const normalizeQuery = (query: ProcessLogQuery) => ({
  page: query.page,
  limit: query.limit,
  serialNumberCode: query.serialNumberCode,
  status: query.status ?? undefined,
  isFinished: query.isFinished ?? undefined,
  startDate: query.startDate || undefined,
  endDate: query.endDate || undefined,
});

const pick = <T>(
  value: BackendProcessLogListItem,
  camelKey: keyof BackendProcessLogListItem,
  pascalKey: keyof BackendProcessLogListItem
): T | undefined => (value[camelKey] ?? value[pascalKey]) as T | undefined;

const normalizeProcessLog = (
  log: BackendProcessLogListItem
): ProcessLogListItem => ({
  id: Number(pick(log, "id", "Id") ?? 0),
  type: String(pick(log, "type", "Type") ?? "-"),
  serialNumberCode: String(
    pick(log, "serialNumberCode", "SerialNumberCode") ?? "-"
  ),
  status: Boolean(pick(log, "status", "Status")),
  isFinished: Boolean(pick(log, "isFinished", "IsFinished")),
  createdAt: String(pick(log, "createdAt", "CreatedAt") ?? ""),
  updatedAt: pick<string>(log, "updatedAt", "UpdatedAt"),
  detail:
    (pick<ProcessLogRawDetail>(log, "detail", "Detail") ?? {}) as ProcessLogDetail,
});

const ProcessLogService = {
  getProcessLogs: async (
    query: ProcessLogQuery = {},
    options?: ApiRequestOptions
  ) => {
    const response = await api.get<ApiListResponse<BackendProcessLogListItem>>(
      PROCESS_LOG_ENDPOINT,
      {
        ...options,
        params: normalizeQuery(query),
      }
    );

    return {
      ...response.data,
      data: response.data.data.map(normalizeProcessLog),
    };
  },
};

export default ProcessLogService;
