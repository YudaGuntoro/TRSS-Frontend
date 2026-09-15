import api, { ApiRequestOptions } from "@/utils/api";
import { ApiListResponse } from "./ParameterService";

type MaybeCased<T extends string> = T | Capitalize<T>;

export type ProcessLogParameter = {
  parameter?: string;
  parameterDesc?: string;
  value?: unknown;
  status?: boolean | null;
};

type BackendProcessLogListItem = {
  [key in MaybeCased<
    "id" | "type" | "serialNumberCode" | "status" | "isFinished" | "createdAt" | "updatedAt" | "clinching" | "mfan"
  >]?: unknown;
} & {
  MFan?: unknown;
  [key: string]: unknown;
};

export type ProcessLogType = "clinching" | "mfan" | string;

export type ProcessLogListItem = {
  id: number;
  type: ProcessLogType;
  serialNumberCode: string;
  status: boolean;
  isFinished: boolean;
  createdAt: string;
  updatedAt?: string;
  clinching?: ProcessLogParameter[] | null;
  mfan?: ProcessLogParameter[] | null;
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
): ProcessLogListItem => {
  const clinching =
    (log.clinching ??
      log.Clinching ??
      log["CLINCHING"]) as ProcessLogParameter[] | undefined;

  const mfan =
    (log.mFan ??
      log.mfan ??
      log.MFan ??
      log.MFAN ??
      log["m_fan"] ??
      log["M_FAN"]) as ProcessLogParameter[] | undefined;

  return {
    id: Number(pick(log, "id", "Id") ?? 0),
    type: String(pick(log, "type", "Type") ?? "-"),
    serialNumberCode: String(
      pick(log, "serialNumberCode", "SerialNumberCode") ?? "-"
    ),
    status: Boolean(pick(log, "status", "Status")),
    isFinished: Boolean(pick(log, "isFinished", "IsFinished")),
    createdAt: String(pick(log, "createdAt", "CreatedAt") ?? ""),
    updatedAt: pick<string>(log, "updatedAt", "UpdatedAt"),
    clinching: Array.isArray(clinching) ? clinching : null,
    mfan: Array.isArray(mfan) ? mfan : null,
  };
};

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
