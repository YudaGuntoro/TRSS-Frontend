import api, { ApiRequestOptions } from "@/utils/api";
import { ApiListResponse } from "./ParameterService";

export const MQTT_LOG_STATUSES = ["RECEIVED", "PROCESSING", "SUCCESS", "FAILED"] as const;

export type MqttLog = {
  id: number;
  messageId: string;
  topic: string;
  processName: string | null;
  operatorUsername: string | null;
  isOk: boolean | null;
  payload: string | null;
  status: string;
  errorMessage: string | null;
  receivedAt: string;
  processedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type MqttLogQuery = {
  page: number;
  limit: number;
  status: typeof MQTT_LOG_STATUSES[number] | "";
  isOk: "" | "true" | "false";
  date: string;
  startDate: string;
  endDate: string;
};

export const getMqttLogParams = (query: MqttLogQuery) => {
  // Intersect a single day with any selected range; the API has no Date filter.
  const startDate = [query.date, query.startDate].filter(Boolean).sort().at(-1);
  const endDate = [query.date, query.endDate].filter(Boolean).sort().at(0);
  return {
    page: query.page,
    limit: query.limit,
    status: query.status || undefined,
    isOk: query.isOk === "" ? undefined : query.isOk === "true",
    startDate: startDate ? `${startDate}T00:00:00` : undefined,
    endDate: endDate ? `${endDate}T23:59:59.999999` : undefined,
  };
};

const MqttLogService = {
  getLogs: async (query: MqttLogQuery, options?: ApiRequestOptions) => {
    const { data } = await api.get<ApiListResponse<MqttLog>>("/api/logs/mqtt", {
      ...options,
      params: getMqttLogParams(query),
    });
    if (!data.success) throw new Error(data.message || "Failed to load MQTT logs.");
    return data;
  },
  getLog: async (id: number, options?: ApiRequestOptions) => {
    const { data } = await api.get<{ success: boolean; message: string; data: MqttLog }>(
      `/api/logs/mqtt/${id}`, options
    );
    if (!data.success || !data.data) throw new Error(data.message || "MQTT log not found.");
    return data.data;
  },
};

export default MqttLogService;
