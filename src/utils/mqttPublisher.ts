export type MqttPublisherInfo = {
  isMqttPublisher?: boolean | null;
  mqttPublisherStatus?: string | null;
  reason?: string | null;
};

export const isEmptyProcessValue = (value: unknown): boolean => {
  if (value == null) return true;
  if (typeof value === "string") return ["", "-"].includes(value.trim());
  if (Array.isArray(value)) return value.every(isEmptyProcessValue);
  return false;
};

export const getMqttPublisherState = (
  process: MqttPublisherInfo
): "Enabled" | "Disabled" | "Unknown" => {
  // An explicit configuration flag takes precedence over missing measurements.
  if (typeof process.isMqttPublisher === "boolean") {
    return process.isMqttPublisher ? "Enabled" : "Disabled";
  }
  const status = process.mqttPublisherStatus?.trim().toLowerCase();
  if (status === "disabled") return "Disabled";
  if (status === "enabled") return "Enabled";
  // Empty values or a free-text reason alone do not establish configuration.
  return "Unknown";
};
