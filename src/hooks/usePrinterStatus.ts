"use client";

import {
  HubConnectionBuilder,
  HubConnectionState,
  LogLevel,
} from "@microsoft/signalr";
import { useEffect, useMemo, useState } from "react";

type PrinterStatusPayload = {
  Key?: string;
  Name?: string;
  PrinterName?: string | null;
  IpAddress?: string | null;
  Port?: number | null;
  IsOnline?: boolean;
  Status?: string;
  ErrorMessage?: string | null;
  LastChecked?: string;
  key?: string;
  name?: string;
  printerName?: string | null;
  ipAddress?: string | null;
  port?: number | null;
  isOnline?: boolean;
  status?: string;
  errorMessage?: string | null;
  lastChecked?: string;
};

export type PrinterConnectionState =
  | "connecting"
  | "connected"
  | "reconnecting"
  | "offline";

export type PrinterStatus = {
  errorMessage?: string | null;
  ipAddress?: string | null;
  isOnline: boolean;
  key: string;
  lastChecked?: Date;
  name: string;
  port?: number | null;
  printerName?: string | null;
  status: string;
};

const getPrinterHubUrl = () => {
  const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL?.trim().replace(/\/$/, "");

  if (!baseUrl) {
    return "/hubs/printer";
  }

  return `${baseUrl}/hubs/printer`;
};

const normalizePrinterStatus = (
  payload: PrinterStatusPayload
): PrinterStatus => {
  const isOnline = payload.isOnline ?? payload.IsOnline ?? false;
  const lastChecked = payload.lastChecked ?? payload.LastChecked;

  return {
    errorMessage: payload.errorMessage ?? payload.ErrorMessage,
    ipAddress: payload.ipAddress ?? payload.IpAddress,
    isOnline,
    key: payload.key ?? payload.Key ?? "-",
    lastChecked: lastChecked ? new Date(lastChecked) : undefined,
    name: payload.name ?? payload.Name ?? "Printer",
    port: payload.port ?? payload.Port,
    printerName: payload.printerName ?? payload.PrinterName,
    status:
      payload.status ?? payload.Status ?? (isOnline ? "Online" : "Offline"),
  };
};

export const usePrinterStatus = () => {
  const hubUrl = useMemo(() => getPrinterHubUrl(), []);
  const [connectionState, setConnectionState] =
    useState<PrinterConnectionState>("connecting");
  const [printers, setPrinters] = useState<PrinterStatus[]>([]);
  const [apiUpdatedAt, setApiUpdatedAt] = useState<Date | undefined>();

  useEffect(() => {
    let isMounted = true;
    let retryTimeout: number | undefined;
    const connection = new HubConnectionBuilder()
      .withUrl(hubUrl, { withCredentials: true })
      .withAutomaticReconnect([0, 2000, 5000, 10000])
      .configureLogging(LogLevel.Warning)
      .build();

    const updateConnectionState = (nextState: PrinterConnectionState) => {
      if (!isMounted) {
        return;
      }

      setConnectionState(nextState);
      if (nextState === "connected") {
        setApiUpdatedAt(new Date());
      }
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
        void connection.invoke("GetStatus").catch(() => undefined);
      } catch {
        updateConnectionState("offline");
        retryConnection();
      }
    };

    connection.on("PrinterStatusUpdated", (payload: PrinterStatusPayload[]) => {
      if (!isMounted) {
        return;
      }

      setPrinters((payload ?? []).map(normalizePrinterStatus));
      setConnectionState("connected");
      setApiUpdatedAt(new Date());
    });

    connection.onreconnecting(() => {
      updateConnectionState("reconnecting");
    });

    connection.onreconnected(() => {
      updateConnectionState("connected");
      void connection.invoke("GetStatus").catch(() => undefined);
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

  return {
    apiUpdatedAt,
    connectionState,
    printers,
  };
};
