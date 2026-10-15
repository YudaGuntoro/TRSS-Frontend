import api, { ApiRequestOptions } from "@/utils/api";
import { ApiListResponse } from "./ParameterService";
import { MqttPublisherInfo } from "@/utils/mqttPublisher";
import type { ScanHistoryEntry } from "@/utils/scanHistory";

type MaybeCased<T extends string> = T | Capitalize<T>;

export type ProcessLogParameter = {
  parameter?: string;
  parameterDesc?: string;
  value?: unknown;
  status?: boolean | null;
};

export type ProcessLogProcess = MqttPublisherInfo & {
  processCode?: string;
  processName?: string;
  parameters: ProcessLogParameter[];
  history: ScanHistoryEntry[];
};

export type ProcessLogDetail = {
  status?: boolean;
  processes: ProcessLogProcess[];
};

const asRecord = (value: unknown): Record<string, unknown> =>
  value !== null && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};

const optionalText = (value: unknown): string | undefined =>
  typeof value === "string" ? value.trim() || undefined : undefined;

export const normalizeProcessLogDetail = (value: unknown): ProcessLogDetail => {
  const detail = asRecord(value);
  const processes = detail.processes ?? detail.Processes;
  const status = detail.status ?? detail.Status;
  return {
    status: typeof status === "boolean" ? status : undefined,
    processes: (Array.isArray(processes) ? processes : [])
      .filter((process) => process !== null && typeof process === "object")
      .map((value) => {
        const process = asRecord(value);
        const publisher = process.isMqttPublisher ?? process.IsMqttPublisher;
        const parameters = process.parameters ?? process.Parameters;
        const history = process.history ?? process.History;
        return {
          processCode: optionalText(process.processCode ?? process.ProcessCode),
          processName: optionalText(process.processName ?? process.ProcessName),
          isMqttPublisher: typeof publisher === "boolean" ? publisher : null,
          mqttPublisherStatus: optionalText(process.mqttPublisherStatus ?? process.MqttPublisherStatus),
          reason: optionalText(process.reason ?? process.Reason),
          history: (Array.isArray(history) ? history : [])
            .filter((entry) => entry !== null && typeof entry === "object")
            .map((value) => {
              const entry = asRecord(value);
              const status = entry.status ?? entry.Status;
              const id = entry.id ?? entry.Id;
              return {
                id: typeof id === "number" ? id : undefined,
                parameterCode: optionalText(entry.parameterCode ?? entry.ParameterCode) ?? "",
                parameterName: optionalText(entry.parameterName ?? entry.ParameterName),
                value: entry.value ?? entry.Value,
                status: typeof status === "boolean" ? status : null,
                createdAt: optionalText(entry.createdAt ?? entry.CreatedAt),
              };
            }),
          parameters: (Array.isArray(parameters) ? parameters : [])
            .filter((parameter) => parameter !== null && typeof parameter === "object")
            .map((value) => {
              const parameter = asRecord(value);
              const status = parameter.status ?? parameter.Status;
              return {
                parameter: optionalText(parameter.parameterCode ?? parameter.ParameterCode),
                parameterDesc: optionalText(parameter.parameterName ?? parameter.ParameterName),
                value: parameter.value ?? parameter.Value,
                status: typeof status === "boolean" ? status : null,
              };
            }),
        };
      }),
  };
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
  getProcessLogDetail: async (serialNumber: string, options?: ApiRequestOptions) => {
    const response = await api.get<{ data: unknown }>(
      `${PROCESS_LOG_ENDPOINT}/by-serial-number/${encodeURIComponent(serialNumber)}`,
      options
    );
    return normalizeProcessLogDetail(response.data.data);
  },
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
