"use client";

import {
  HubConnectionBuilder,
  HubConnectionState,
  LogLevel,
} from "@microsoft/signalr";
import { useEffect, useMemo, useState } from "react";

type MqttStatusPayload = {
  Broker?: string;
  IsConnected?: boolean;
  Port?: number;
  Status?: string;
  broker?: string;
  isConnected?: boolean;
  port?: number;
  status?: string;
};

export type MqttConnectionState =
  | "connecting"
  | "connected"
  | "reconnecting"
  | "offline";

export type MqttStatus = {
  apiUpdatedAt?: Date;
  broker?: string;
  connectionState: MqttConnectionState;
  isConnected: boolean;
  mqttUpdatedAt?: Date;
  port?: number;
  status: string;
};

const getMqttHubUrl = () => {
  const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL?.trim().replace(/\/$/, "");

  if (!baseUrl) {
    return "/hubs/mqtt-status";
  }

  return `${baseUrl}/hubs/mqtt-status`;
};

const normalizeMqttStatus = (payload: MqttStatusPayload) => {
  const isConnected = payload.isConnected ?? payload.IsConnected ?? false;

  return {
    broker: payload.broker ?? payload.Broker,
    isConnected,
    port: payload.port ?? payload.Port,
    status:
      payload.status ?? payload.Status ?? (isConnected ? "Online" : "Offline"),
  };
};

export const useMqttStatus = () => {
  const hubUrl = useMemo(() => getMqttHubUrl(), []);
  const [mqttStatus, setMqttStatus] = useState<MqttStatus>({
    connectionState: "connecting",
    isConnected: false,
    status: "Connecting",
  });

  useEffect(() => {
    let isMounted = true;
    let retryTimeout: number | undefined;
    const connection = new HubConnectionBuilder()
      .withUrl(hubUrl, { withCredentials: true })
      .withAutomaticReconnect([0, 2000, 5000, 10000])
      .configureLogging(LogLevel.Warning)
      .build();

    const updateConnectionState = (connectionState: MqttConnectionState) => {
      if (!isMounted) {
        return;
      }

      setMqttStatus((current) => ({
        ...current,
        apiUpdatedAt:
          connectionState === "connected" ? new Date() : current.apiUpdatedAt,
        connectionState,
      }));
    };

    const retryConnection = () => {
      if (!isMounted) {
        return;
      }

      retryTimeout = window.setTimeout(() => {
        void startConnection();
      }, 5000);
    };

    const startConnection = async () => {
      if (
        connection.state !== HubConnectionState.Disconnected ||
        !isMounted
      ) {
        return;
      }

      try {
        await connection.start();
        updateConnectionState("connected");
      } catch {
        updateConnectionState("offline");
        retryConnection();
      }
    };

    connection.on("MqttStatusUpdated", (payload: MqttStatusPayload) => {
      if (!isMounted) {
        return;
      }

      const nextStatus = normalizeMqttStatus(payload);
      const now = new Date();

      setMqttStatus((current) => ({
        ...current,
        ...nextStatus,
        apiUpdatedAt: now,
        connectionState: "connected",
        mqttUpdatedAt: now,
      }));
    });

    connection.onreconnecting(() => {
      updateConnectionState("reconnecting");
    });

    connection.onreconnected(() => {
      updateConnectionState("connected");
    });

    connection.onclose(() => {
      updateConnectionState("offline");
      retryConnection();
    });

    void startConnection();

    return () => {
      isMounted = false;
      if (retryTimeout) {
        window.clearTimeout(retryTimeout);
      }
      void connection.stop();
    };
  }, [hubUrl]);

  return mqttStatus;
};
