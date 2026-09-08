"use client";

import type { MqttClient } from "mqtt";
import { useEffect, useMemo, useRef, useState } from "react";

type PayloadValue =
  | string
  | number
  | boolean
  | null
  | PayloadValue[]
  | { [key: string]: PayloadValue };

type TopicTone =
  | "amber"
  | "blue"
  | "emerald"
  | "indigo"
  | "orange"
  | "rose"
  | "slate"
  | "sky"
  | "violet";

type PublisherTopic = {
  id: string;
  label: string;
  topic: string;
  tone: TopicTone;
  payload: Record<string, PayloadValue>;
  hasIssuePicker?: boolean;
  defaultIssues?: string[];
};

type ConsoleLog = {
  id: number;
  message: string;
  tone: "data" | "error" | "info" | "publish" | "subscribe" | "success" | "warn";
  time: string;
};

type SubscriptionState = Record<
  string,
  {
    active: boolean;
    count: number;
    topic: string;
  }
>;

type ReceivedMessage = {
  id: number;
  payload: string;
  time: string;
  topic: string;
};

const allIssueNumbers = [
  "20260907001",
  "20260907002",
  "20260907003",
  "20260907004",
  "20260907005",
  "20260907006",
];

const buildClinchingLongSidePayload = () => {
  const data: Record<string, PayloadValue> = {};

  for (let index = 1; index <= 60; index += 1) {
    data[`END_PLATE_WIDTH_${index}_RESULT`] = true;
  }

  for (let index = 1; index <= 18; index += 1) {
    data[`CLINCHING_HEIGHT_${index}_VALUE`] = Number(
      (1.25 + index * 0.01).toFixed(2)
    );
  }

  data.NG_BOX_SENSOR_LONG_SIDE_VALUE = "ON";
  return data;
};

const buildFinalInspectionPayload = () => {
  const data: Record<string, PayloadValue> = {
    FINAL_INSPECTION_RAD_CORE_ASM_NAME_LABEL_RESULT: true,
  };

  for (let index = 1; index <= 20; index += 1) {
    data[`CHECK_POINT_${index}`] = true;
  }

  data.NG_BOX_SENSOR_FINAL_INSPECTION_VALUE = "ON";
  return data;
};

const processTopics: PublisherTopic[] = [
  {
    id: "clinching-short-side-scan",
    label: "Clinching Short Side Scan",
    topic: "data/process/clinching-short-side/result-scan",
    tone: "blue",
    hasIssuePicker: true,
    defaultIssues: ["20260907001", "20260907002", "20260907003"],
    payload: {
      operator_username: "OP001",
      timestamp: "",
      isOk: true,
      data: {
        issue_numbers: ["20260907001", "20260907002", "20260907003"],
      },
    },
  },
  {
    id: "clinching-short-side",
    label: "Clinching Short Side",
    topic: "data/process/clinching-short-side/result",
    tone: "sky",
    payload: {
      serial_number: "CC20260630001",
      operator_username: "OP001",
      timestamp: "",
      isOk: true,
      data: {
        O_RING_SET_RESULT: true,
        NG_BOX_SENSOR_SHORT_SIDE_VALUE: "ON",
      },
    },
  },
  {
    id: "clinching-long-side",
    label: "Clinching Long Side",
    topic: "data/process/clinching-long-side/result",
    tone: "indigo",
    payload: {
      serial_number: "CC20260630001",
      operator_username: "OP001",
      timestamp: "",
      isOk: true,
      data: buildClinchingLongSidePayload(),
    },
  },
  {
    id: "m-fan-assy-scan",
    label: "M-Fan Assembly Scan",
    topic: "data/process/m-fan-assy/result-scan",
    tone: "violet",
    hasIssuePicker: true,
    defaultIssues: ["20260907004", "20260907005", "20260907006"],
    payload: {
      operator_username: "OP001",
      timestamp: "",
      isOk: true,
      data: {
        issue_numbers: ["20260907004", "20260907005", "20260907006"],
      },
    },
  },
  {
    id: "m-fan-assy",
    label: "M-Fan Assembly",
    topic: "data/process/m-fan-assy/result",
    tone: "slate",
    payload: {
      serial_number_m_fan_assy: "MF20260630001",
      operator_username: "OP001",
      timestamp: "",
      isOk: true,
      data: {
        LOT_FAN_ASM_RESULT: "OK",
        LOT_MOTOR_ASM_RESULT: "OK",
        LOT_GUIDE_ASM_RESULT: "OK",
        BOLT_TIGHTEN_VALUE: "45.67",
        BOLT_TIGHTEN_QTY_VALUE: "4",
        NUT_TIGHTEN_VALUE: true,
      },
    },
  },
  {
    id: "m-fan-inspection",
    label: "M-Fan Inspection",
    topic: "data/process/m-fan-inspection/result",
    tone: "amber",
    payload: {
      serial_number_m_fan_assy: "MF20260630001",
      operator_username: "OP001",
      timestamp: "",
      isOk: true,
      data: {
        M_FAN_TEST_RESULT: true,
        M_FAN_INSPECTION_ROTATION_SPEED_MAX_VALUE: 100,
        M_FAN_INSPECTION_ROTATION_SPEED_MIN_VALUE: 40,
        M_FAN_INSPECTION_AMPERE_MAX_VALUE: 120,
        M_FAN_INSPECTION_AMPERE_MIN_VALUE: 60,
        M_FAN_INSPECTION_WIND_DIRECTION_VALUE: "CW",
        NG_BOX_SENSOR_M_FAN_INSPECTION_VALUE: "ON",
      },
    },
  },
  {
    id: "ecm-assy",
    label: "ECM Assembly",
    topic: "data/process/ecm-assy/result",
    tone: "orange",
    payload: {
      serial_number_clinching: "CC20260630001",
      serial_number_m_fan_assy: "MF20260630001",
      operator_username: "OP001",
      timestamp: "",
      isOk: true,
      data: {
        RAD_CORE_ASM_NAME_LABEL_RESULT: true,
        MOTOR_FAN_ASSY_LABEL_RESULT: true,
        ECM_ASSY_BOLT_TIGHTEN_VALUE: 45.67,
        ECM_ASSY_BOLT_TIGHTEN_QTY_VALUE: 4,
        NG_BOX_SENSOR_ECM_ASSY_VALUE: "ON",
      },
    },
  },
  {
    id: "final-inspection",
    label: "Final Inspection",
    topic: "data/process/final-inspection/result",
    tone: "emerald",
    payload: {
      serial_number: "CC20260630001",
      operator_username: "OP001",
      timestamp: "",
      isOk: true,
      data: buildFinalInspectionPayload(),
    },
  },
];

const printTopics: PublisherTopic[] = [
  {
    id: "print-clinching-short-side",
    label: "Print Clinching Short Side",
    topic: "traceability/print/request/clinching-short-side",
    tone: "rose",
    payload: { issue_number: "ISS-00001" },
  },
  {
    id: "print-m-fan-assy",
    label: "Print M-Fan Assembly",
    topic: "traceability/print/request/m-fan-assy",
    tone: "orange",
    payload: { issue_number: "ISS-00001" },
  },
];

const subscribeTopics = [
  {
    id: "clinching-short-side-process",
    label: "Clinching Short Side Process",
    topic: "data/process/clinching-short-side/process-scan",
    tone: "sky" as TopicTone,
  },
  {
    id: "m-fan-assy-scan-process",
    label: "M-Fan Assy Scan Process",
    topic: "data/process/m-fan-assy/process-scan",
    tone: "violet" as TopicTone,
  },
  {
    id: "validation-process",
    label: "Process Validation",
    topic: "data/process/validation",
    tone: "indigo" as TopicTone,
  },
];

const toneClass = {
  amber: {
    accent: "bg-warning-500",
    button: "bg-[#A86412] hover:bg-[#92570F]",
    header: "border-[#92570F] bg-[#A86412] dark:border-[#7A450B] dark:bg-[#8A4E0D]",
    topic: "border-warning-200 bg-warning-50 text-warning-700 dark:border-warning-500/30 dark:bg-warning-500/10 dark:text-warning-300",
  },
  blue: {
    accent: "bg-brand-500",
    button: "bg-[#6D8AF3] hover:bg-[#5f7be0]",
    header: "border-[#5f7be0] bg-[#6D8AF3] dark:border-[#465fc4] dark:bg-[#506BD8]",
    topic: "border-brand-200 bg-brand-50 text-brand-700 dark:border-brand-500/30 dark:bg-brand-500/10 dark:text-brand-300",
  },
  emerald: {
    accent: "bg-success-500",
    button: "bg-[#07875E] hover:bg-[#066D4C]",
    header: "border-[#066D4C] bg-[#07875E] dark:border-[#05563D] dark:bg-[#066D4C]",
    topic: "border-success-200 bg-success-50 text-success-700 dark:border-success-500/30 dark:bg-success-500/10 dark:text-success-300",
  },
  indigo: {
    accent: "bg-indigo-500",
    button: "bg-[#4F63C6] hover:bg-[#4355AA]",
    header: "border-[#4355AA] bg-[#4F63C6] dark:border-[#36468F] dark:bg-[#4355AA]",
    topic: "border-indigo-200 bg-indigo-50 text-indigo-700 dark:border-indigo-500/30 dark:bg-indigo-500/10 dark:text-indigo-300",
  },
  orange: {
    accent: "bg-orange-500",
    button: "bg-[#C65F1A] hover:bg-[#AA5015]",
    header: "border-[#AA5015] bg-[#C65F1A] dark:border-[#884011] dark:bg-[#9A4914]",
    topic: "border-orange-200 bg-orange-50 text-orange-700 dark:border-orange-500/30 dark:bg-orange-500/10 dark:text-orange-300",
  },
  rose: {
    accent: "bg-error-500",
    button: "bg-[#C0384A] hover:bg-[#A62F40]",
    header: "border-[#A62F40] bg-[#C0384A] dark:border-[#842635] dark:bg-[#A62F40]",
    topic: "border-error-200 bg-error-50 text-error-700 dark:border-error-500/30 dark:bg-error-500/10 dark:text-error-300",
  },
  slate: {
    accent: "bg-gray-500",
    button: "bg-[#526071] hover:bg-[#465260]",
    header: "border-[#465260] bg-[#526071] dark:border-[#36414D] dark:bg-[#465260]",
    topic: "border-gray-200 bg-gray-50 text-gray-700 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300",
  },
  sky: {
    accent: "bg-sky-500",
    button: "bg-[#1487B8] hover:bg-[#10749F]",
    header: "border-[#10749F] bg-[#1487B8] dark:border-[#0D5E80] dark:bg-[#10749F]",
    topic: "border-sky-200 bg-sky-50 text-sky-700 dark:border-sky-500/30 dark:bg-sky-500/10 dark:text-sky-300",
  },
  violet: {
    accent: "bg-violet-500",
    button: "bg-[#7657C8] hover:bg-[#6349AD]",
    header: "border-[#6349AD] bg-[#7657C8] dark:border-[#4F3A8B] dark:bg-[#6349AD]",
    topic: "border-violet-200 bg-violet-50 text-violet-700 dark:border-violet-500/30 dark:bg-violet-500/10 dark:text-violet-300",
  },
};

const formatJson = (payload: Record<string, PayloadValue>) =>
  JSON.stringify({ ...payload, timestamp: new Date().toISOString() }, null, 2);

const now = () =>
  new Date().toLocaleTimeString("en-US", {
    hour12: false,
  });

export default function MqttPublisherPage() {
  const clientRef = useRef<MqttClient | null>(null);
  const [host, setHost] = useState("localhost");
  const [port, setPort] = useState("9001");
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [payloads, setPayloads] = useState<Record<string, string>>(() =>
    [...processTopics, ...printTopics].reduce<Record<string, string>>(
      (values, topic) => {
        values[topic.id] = formatJson(topic.payload);
        return values;
      },
      {}
    )
  );
  const [issueSelections, setIssueSelections] = useState<Record<string, string[]>>(
    () =>
      processTopics.reduce<Record<string, string[]>>((values, topic) => {
        if (topic.hasIssuePicker) {
          values[topic.id] = topic.defaultIssues ?? [];
        }
        return values;
      }, {})
  );
  const [logs, setLogs] = useState<ConsoleLog[]>([
    {
      id: 1,
      message: "Ready. Connect to a WebSocket MQTT broker to publish payloads.",
      tone: "data",
      time: now(),
    },
  ]);
  const [feedback, setFeedback] = useState<Record<string, string>>({});
  const [subscriptions, setSubscriptions] = useState<SubscriptionState>({});
  const [receivedMessages, setReceivedMessages] = useState<
    Record<string, ReceivedMessage[]>
  >({});

  const brokerUrl = useMemo(() => `ws://${host}:${port}/mqtt`, [host, port]);

  const addLog = (message: string, tone: ConsoleLog["tone"] = "info") => {
    setLogs((currentLogs) => [
      ...currentLogs.slice(-99),
      {
        id: Date.now() + Math.random(),
        message,
        tone,
        time: now(),
      },
    ]);
  };

  const clearLogs = () => {
    setLogs([
      {
        id: Date.now(),
        message: "Console cleared.",
        tone: "data",
        time: now(),
      },
    ]);
  };

  const disconnectMqtt = () => {
    clientRef.current?.end(true);
    clientRef.current = null;
    setIsConnected(false);
    setIsConnecting(false);
    setSubscriptions({});
  };

  const connectMqtt = async () => {
    disconnectMqtt();
    setIsConnecting(true);
    addLog(`Connecting to ${brokerUrl}...`, "info");

    try {
      const mqtt = await import("mqtt");
      const client = mqtt.connect(brokerUrl, {
        clean: true,
        clientId: `trss_dashboard_${Math.random().toString(16).slice(2, 8)}`,
        connectTimeout: 15000,
        keepalive: 60,
        reconnectPeriod: 5000,
      });

      clientRef.current = client;

      client.on("connect", () => {
        setIsConnected(true);
        setIsConnecting(false);
        addLog("Connected.", "success");
      });

      client.on("message", (topic, message) => {
        const payload = message.toString();
        addLog(`Received from ${topic}`, "subscribe");
        setReceivedMessages((current) => {
          const match = subscribeTopics.find((item) => item.topic === topic);
          if (!match) {
            return current;
          }

          const nextMessage = {
            id: Date.now() + Math.random(),
            payload: formatReceivedPayload(payload),
            time: now(),
            topic,
          };

          return {
            ...current,
            [match.id]: [nextMessage, ...(current[match.id] ?? [])].slice(0, 20),
          };
        });
        setSubscriptions((current) => {
          const match = Object.entries(current).find(
            ([, subscription]) => subscription.topic === topic && subscription.active
          );

          if (!match) {
            return current;
          }

          const [id, subscription] = match;
          return {
            ...current,
            [id]: {
              ...subscription,
              count: subscription.count + 1,
            },
          };
        });
      });

      client.on("error", (error) => {
        addLog(`Error: ${error.message}`, "error");
        setIsConnecting(false);
      });

      client.on("close", () => {
        setIsConnected(false);
        setIsConnecting(false);
      });
    } catch (error) {
      addLog(error instanceof Error ? error.message : "MQTT client failed to load.", "error");
      setIsConnecting(false);
    }
  };

  const toggleSubscribe = (id: string, topic: string) => {
    const client = clientRef.current;
    const active = subscriptions[id]?.active;

    if (!client || !isConnected) {
      addLog("Broker is not connected.", "error");
      return;
    }

    if (active) {
      client.unsubscribe(topic, () => {
        setSubscriptions((current) => ({
          ...current,
          [id]: {
            active: false,
            count: current[id]?.count ?? 0,
            topic,
          },
        }));
        addLog(`Unsubscribed from ${topic}`, "warn");
      });
      return;
    }

    client.subscribe(topic, { qos: 1 }, (error) => {
      if (error) {
        addLog(`Subscribe failed: ${error.message}`, "error");
        return;
      }

      setSubscriptions((current) => ({
        ...current,
        [id]: {
          active: true,
          count: current[id]?.count ?? 0,
          topic,
        },
      }));
      addLog(`Subscribed to ${topic}`, "success");
    });
  };

  const publishMessage = (topic: PublisherTopic) => {
    const client = clientRef.current;

    if (!client || !isConnected) {
      addLog("Broker is not connected.", "error");
      return;
    }

    try {
      const parsed = JSON.parse(payloads[topic.id]) as Record<string, PayloadValue>;
      parsed.timestamp = new Date().toISOString();
      const payload = JSON.stringify(parsed, null, 2);
      setPayloads((current) => ({ ...current, [topic.id]: payload }));

      client.publish(topic.topic, JSON.stringify(parsed), { qos: 0 }, (error) => {
        if (error) {
          addLog(`Publish failed to ${topic.topic}: ${error.message}`, "error");
          setFeedback((current) => ({ ...current, [topic.id]: "Failed" }));
          return;
        }

        addLog(`Published to ${topic.topic}`, "publish");
        setFeedback((current) => ({ ...current, [topic.id]: "Published" }));
        window.setTimeout(() => {
          setFeedback((current) => ({ ...current, [topic.id]: "" }));
        }, 2400);
      });
    } catch {
      addLog(`${topic.label}: invalid JSON payload.`, "error");
      setFeedback((current) => ({ ...current, [topic.id]: "Invalid JSON" }));
    }
  };

  const updateIssueSelection = (topic: PublisherTopic, selectedIssues: string[]) => {
    setIssueSelections((current) => ({ ...current, [topic.id]: selectedIssues }));

    try {
      const parsed = JSON.parse(payloads[topic.id]) as Record<string, PayloadValue>;
      const data =
        parsed.data && typeof parsed.data === "object" && !Array.isArray(parsed.data)
          ? parsed.data
          : {};
      parsed.data = {
        ...data,
        issue_numbers: selectedIssues,
      };
      parsed.timestamp = new Date().toISOString();
      setPayloads((current) => ({
        ...current,
        [topic.id]: JSON.stringify(parsed, null, 2),
      }));
    } catch {
      setFeedback((current) => ({
        ...current,
        [topic.id]: "Fix JSON before changing issues",
      }));
    }
  };

  useEffect(() => () => disconnectMqtt(), []);

  return (
    <div className="mx-4 mb-8 grid max-w-[1600px] grid-cols-1 gap-6 xl:mx-auto xl:grid-cols-12">
      <div className="space-y-5 xl:col-span-8">
        <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-theme-xs dark:border-white/[0.05] dark:bg-white/[0.03]">
          <div className="flex flex-col gap-4 border-b border-gray-100 pb-5 dark:border-white/[0.06] lg:flex-row lg:items-start lg:justify-between">
            <div>
              <h2 className="text-xl font-semibold text-gray-800 dark:text-white/90">
                MQTT Publisher Testing
              </h2>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                Publish process and print payloads through a WebSocket MQTT broker.
              </p>
            </div>
            <ConnectionBadge connected={isConnected} connecting={isConnecting} />
          </div>

          <div className="mt-5 grid grid-cols-1 gap-4 lg:grid-cols-4">
            <label className="lg:col-span-2">
              <span className="mb-1 block text-xs font-medium text-gray-600 dark:text-gray-400">
                Host / IP
              </span>
              <input
                className="h-10 w-full rounded-lg border border-gray-300 bg-transparent px-3 font-mono text-sm text-gray-800 outline-none focus:border-brand-300 focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
                onChange={(event) => setHost(event.target.value)}
                value={host}
              />
            </label>
            <label>
              <span className="mb-1 block text-xs font-medium text-gray-600 dark:text-gray-400">
                Port WebSocket
              </span>
              <input
                className="h-10 w-full rounded-lg border border-gray-300 bg-transparent px-3 font-mono text-sm text-gray-800 outline-none focus:border-brand-300 focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
                onChange={(event) => setPort(event.target.value)}
                type="number"
                value={port}
              />
            </label>
            <div>
              <span className="mb-1 block text-xs font-medium text-gray-600 dark:text-gray-400">
                Broker URL
              </span>
              <div className="flex h-10 items-center rounded-lg border border-gray-200 bg-gray-50 px-3 font-mono text-xs text-gray-600 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-300">
                {brokerUrl}
              </div>
            </div>
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-2">
            <button
              className="h-10 rounded-lg bg-brand-500 px-4 text-sm font-semibold text-white transition-colors hover:bg-brand-600 disabled:cursor-not-allowed disabled:opacity-50"
              disabled={isConnected || isConnecting}
              onClick={connectMqtt}
              type="button"
            >
              {isConnecting ? "Connecting..." : "Connect"}
            </button>
            <button
              className="h-10 rounded-lg border border-gray-300 bg-white px-4 text-sm font-semibold text-gray-700 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300 dark:hover:bg-gray-800"
              disabled={!isConnected && !isConnecting}
              onClick={disconnectMqtt}
              type="button"
            >
              Disconnect
            </button>
          </div>
        </section>

        <section className="rounded-xl border border-gray-200 bg-white shadow-theme-xs dark:border-white/[0.05] dark:bg-white/[0.03]">
          <div className="flex items-center justify-between border-b border-gray-100 px-5 py-3 dark:border-white/[0.06]">
            <h2 className="text-sm font-semibold text-gray-800 dark:text-white/90">
              Console
            </h2>
            <button
              className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs font-semibold text-gray-600 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300 dark:hover:bg-gray-800"
              onClick={clearLogs}
              type="button"
            >
              Clear
            </button>
          </div>
          <div className="h-44 overflow-y-auto bg-gray-50 px-4 py-3 font-mono text-xs dark:bg-gray-950">
            {logs.map((log) => (
              <div className={consoleTextClass(log.tone)} key={log.id}>
                [{log.time}] {log.message}
              </div>
            ))}
          </div>
        </section>

        <section className="space-y-5">
          <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
            <PublisherCard
              connected={isConnected}
              feedback={feedback[processTopics[0].id]}
              issueSelections={issueSelections[processTopics[0].id] ?? []}
              onIssueSelectionChange={(selected) =>
                updateIssueSelection(processTopics[0], selected)
              }
              onPayloadChange={(value) =>
                setPayloads((current) => ({ ...current, [processTopics[0].id]: value }))
              }
              onPublish={() => publishMessage(processTopics[0])}
              payload={payloads[processTopics[0].id]}
              topic={processTopics[0]}
            />
            <SubscribeCard
              connected={isConnected}
              messages={receivedMessages[subscribeTopics[0].id] ?? []}
              onClear={() =>
                setReceivedMessages((current) => ({ ...current, [subscribeTopics[0].id]: [] }))
              }
              onToggle={() =>
                toggleSubscribe(subscribeTopics[0].id, subscribeTopics[0].topic)
              }
              state={subscriptions[subscribeTopics[0].id]}
              topic={subscribeTopics[0]}
            />
          </div>

          {processTopics.slice(1, 3).map((topic) => (
            <PublisherCard
              connected={isConnected}
              feedback={feedback[topic.id]}
              key={topic.id}
              onPayloadChange={(value) =>
                setPayloads((current) => ({ ...current, [topic.id]: value }))
              }
              onPublish={() => publishMessage(topic)}
              payload={payloads[topic.id]}
              topic={topic}
            />
          ))}

          <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
            <PublisherCard
              connected={isConnected}
              feedback={feedback[processTopics[3].id]}
              issueSelections={issueSelections[processTopics[3].id] ?? []}
              onIssueSelectionChange={(selected) =>
                updateIssueSelection(processTopics[3], selected)
              }
              onPayloadChange={(value) =>
                setPayloads((current) => ({ ...current, [processTopics[3].id]: value }))
              }
              onPublish={() => publishMessage(processTopics[3])}
              payload={payloads[processTopics[3].id]}
              topic={processTopics[3]}
            />
            <SubscribeCard
              connected={isConnected}
              messages={receivedMessages[subscribeTopics[1].id] ?? []}
              onClear={() =>
                setReceivedMessages((current) => ({ ...current, [subscribeTopics[1].id]: [] }))
              }
              onToggle={() =>
                toggleSubscribe(subscribeTopics[1].id, subscribeTopics[1].topic)
              }
              state={subscriptions[subscribeTopics[1].id]}
              topic={subscribeTopics[1]}
            />
          </div>

          {processTopics.slice(4).map((topic) => (
            <PublisherCard
              connected={isConnected}
              feedback={feedback[topic.id]}
              key={topic.id}
              onPayloadChange={(value) =>
                setPayloads((current) => ({ ...current, [topic.id]: value }))
              }
              onPublish={() => publishMessage(topic)}
              payload={payloads[topic.id]}
              topic={topic}
            />
          ))}

          <div className="border-t border-gray-200 pt-5 dark:border-gray-800">
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-gray-700 dark:text-gray-300">
              Print Request Topics
            </h2>
            <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
              {printTopics.map((topic) => (
                <PublisherCard
                  connected={isConnected}
                  feedback={feedback[topic.id]}
                  key={topic.id}
                  onPayloadChange={(value) =>
                    setPayloads((current) => ({ ...current, [topic.id]: value }))
                  }
                  onPublish={() => publishMessage(topic)}
                  payload={payloads[topic.id]}
                  topic={topic}
                />
              ))}
            </div>
          </div>
        </section>
      </div>

      <aside className="xl:col-span-4">
        <div className="sticky top-24 rounded-xl border border-gray-200 bg-white shadow-theme-md dark:border-white/[0.05] dark:bg-white/[0.03]">
          <SubscribeCard
            connected={isConnected}
            isLarge
            messages={receivedMessages[subscribeTopics[2].id] ?? []}
            onClear={() =>
              setReceivedMessages((current) => ({ ...current, [subscribeTopics[2].id]: [] }))
            }
            onToggle={() =>
              toggleSubscribe(subscribeTopics[2].id, subscribeTopics[2].topic)
            }
            state={subscriptions[subscribeTopics[2].id]}
            topic={subscribeTopics[2]}
          />
        </div>
      </aside>
    </div>
  );
}

function PublisherCard({
  connected,
  feedback,
  issueSelections = [],
  onIssueSelectionChange,
  onPayloadChange,
  onPublish,
  payload,
  topic,
}: {
  connected: boolean;
  feedback?: string;
  issueSelections?: string[];
  onIssueSelectionChange?: (selected: string[]) => void;
  onPayloadChange: (value: string) => void;
  onPublish: () => void;
  payload: string;
  topic: PublisherTopic;
}) {
  const tone = toneClass[topic.tone];

  return (
    <article className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-theme-xs dark:border-white/[0.05] dark:bg-white/[0.03]">
      <header className={`border-b px-4 py-3 ${tone.header}`}>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="size-2 rounded-full bg-white/90" />
            <h3 className="text-sm font-semibold text-white">
              {topic.label}
            </h3>
          </div>
          <span className="rounded-md border border-white/30 bg-white/15 px-2 py-1 font-mono text-[11px] text-white">
            {topic.topic}
          </span>
        </div>
      </header>

      {topic.hasIssuePicker && onIssueSelectionChange && (
        <div className="border-b border-gray-100 px-4 py-3 dark:border-white/[0.06]">
          <div className="mb-2 flex items-center justify-between gap-3">
            <span className="text-xs font-medium text-gray-600 dark:text-gray-400">
              Issue Numbers
            </span>
            <div className="flex items-center gap-2 text-xs">
              <button
                className="font-semibold text-brand-600 hover:text-brand-700 dark:text-brand-300"
                onClick={() => onIssueSelectionChange(allIssueNumbers)}
                type="button"
              >
                Pilih Semua
              </button>
              <span className="text-gray-300 dark:text-gray-700">|</span>
              <button
                className="font-semibold text-gray-500 hover:text-gray-700 dark:text-gray-400"
                onClick={() => onIssueSelectionChange([])}
                type="button"
              >
                Reset
              </button>
            </div>
          </div>
          <div className="grid max-h-32 grid-cols-2 gap-2 overflow-y-auto rounded-lg border border-gray-200 bg-gray-50 p-3 dark:border-gray-800 dark:bg-gray-900 sm:grid-cols-3">
            {allIssueNumbers.map((issueNumber) => (
              <label
                className="flex cursor-pointer items-center gap-2 font-mono text-xs text-gray-700 dark:text-gray-300"
                key={issueNumber}
              >
                <input
                  checked={issueSelections.includes(issueNumber)}
                  className="size-4 rounded border-gray-300 text-brand-500 focus:ring-brand-500/20 dark:border-gray-700 dark:bg-gray-900"
                  onChange={(event) => {
                    const selected = event.target.checked
                      ? [...issueSelections, issueNumber]
                      : issueSelections.filter((item) => item !== issueNumber);
                    onIssueSelectionChange(selected);
                  }}
                  type="checkbox"
                />
                {issueNumber}
              </label>
            ))}
          </div>
        </div>
      )}

      <div className="p-4">
        <label className="mb-1 block text-xs font-medium text-gray-600 dark:text-gray-400">
          Payload
        </label>
        <textarea
          className="min-h-36 w-full resize-y rounded-lg border border-gray-200 bg-gray-50 p-3 font-mono text-xs leading-5 text-emerald-700 outline-none focus:border-brand-300 focus:ring-3 focus:ring-brand-500/10 dark:border-gray-800 dark:bg-gray-950 dark:text-emerald-300"
          onChange={(event) => onPayloadChange(event.target.value)}
          rows={topic.hasIssuePicker ? 9 : 7}
          value={payload}
        />
        <div className="mt-3 flex items-center gap-3">
          <button
            className={`h-9 rounded-lg px-4 text-xs font-semibold text-white transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${tone.button}`}
            disabled={!connected}
            onClick={onPublish}
            type="button"
          >
            Publish
          </button>
          {feedback && (
            <span
              className={`text-xs font-semibold ${
                feedback === "Published"
                  ? "text-success-600 dark:text-success-400"
                  : "text-error-600 dark:text-error-400"
              }`}
            >
              {feedback}
            </span>
          )}
        </div>
      </div>
    </article>
  );
}

function SubscribeCard({
  connected,
  isLarge = false,
  messages,
  onClear,
  onToggle,
  state,
  topic,
}: {
  connected: boolean;
  isLarge?: boolean;
  messages: ReceivedMessage[];
  onClear: () => void;
  onToggle: () => void;
  state?: { active: boolean; count: number; topic: string };
  topic: (typeof subscribeTopics)[number];
}) {
  const tone = toneClass[topic.tone];
  const isActive = Boolean(state?.active);

  return (
    <article className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-theme-xs dark:border-white/[0.05] dark:bg-white/[0.03]">
      <header className={`border-b px-4 py-3 ${tone.header}`}>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className={`size-2 rounded-full ${isActive ? "bg-success-300" : "bg-white/90"}`} />
            <h3 className="text-sm font-semibold text-white">
              {topic.label}
            </h3>
          </div>
          <span className="rounded-md border border-white/30 bg-white/15 px-2 py-1 font-mono text-[11px] text-white">
            {topic.topic}
          </span>
        </div>
      </header>
      <div className="flex flex-wrap items-center gap-2 border-b border-gray-100 bg-gray-50/60 px-4 py-3 dark:border-white/[0.06] dark:bg-gray-950/40">
        <button
          className={`h-9 rounded-lg px-4 text-xs font-semibold text-white transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
            isActive ? "bg-error-500 hover:bg-error-600" : tone.button
          }`}
          disabled={!connected}
          onClick={onToggle}
          type="button"
        >
          {isActive ? "Unsubscribe" : "Subscribe"}
        </button>
        <button
          className="h-9 rounded-lg border border-gray-300 bg-white px-3 text-xs font-semibold text-gray-600 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300 dark:hover:bg-gray-800"
          onClick={onClear}
          type="button"
        >
          Clear
        </button>
        <span className="ml-auto font-mono text-xs text-gray-500 dark:text-gray-400">
          {state?.count ? `${state.count} message` : ""}
        </span>
      </div>
      <div className="p-4">
        <div
          className={`overflow-y-auto rounded-lg border border-gray-200 bg-gray-50 p-3 font-mono text-xs text-gray-700 dark:border-gray-800 dark:bg-gray-950 dark:text-gray-300 ${
            isLarge ? "h-[calc(100vh-300px)] min-h-[360px]" : "h-48"
          }`}
        >
          {messages.length === 0 ? (
            <div className="py-6 text-center font-sans text-sm text-gray-500 dark:text-gray-500">
              Waiting for MQTT messages.
            </div>
          ) : (
            <div className="space-y-3">
              {messages.map((message) => (
                <div
                  className="rounded-lg border border-gray-200 bg-white p-3 dark:border-gray-800 dark:bg-black/30"
                  key={message.id}
                >
                  <div className="mb-2 flex items-center justify-between gap-3 border-b border-gray-200 pb-2 dark:border-gray-800">
                    <span className="truncate text-[11px] text-sky-600 dark:text-sky-300">
                      {message.topic}
                    </span>
                    <span className="shrink-0 text-[11px] text-gray-500 dark:text-gray-500">
                      {message.time}
                    </span>
                  </div>
                  <pre className="whitespace-pre-wrap text-[11px] leading-5 text-gray-700 dark:text-gray-300">
                    {message.payload}
                  </pre>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </article>
  );
}

function ConnectionBadge({
  connected,
  connecting,
}: {
  connected: boolean;
  connecting: boolean;
}) {
  const label = connecting ? "Connecting" : connected ? "Connected" : "Disconnected";

  return (
    <span
      className={`inline-flex h-9 items-center gap-2 rounded-full border px-3 text-xs font-semibold ${
        connected
          ? "border-success-200 bg-success-50 text-success-700 dark:border-success-500/30 dark:bg-success-500/10 dark:text-success-300"
          : connecting
            ? "border-warning-200 bg-warning-50 text-warning-700 dark:border-warning-500/30 dark:bg-warning-500/10 dark:text-warning-300"
            : "border-error-200 bg-error-50 text-error-700 dark:border-error-500/30 dark:bg-error-500/10 dark:text-error-300"
      }`}
    >
      <span
        className={`size-2 rounded-full ${
          connected ? "bg-success-500" : connecting ? "bg-warning-500" : "bg-error-500"
        }`}
      />
      {label}
    </span>
  );
}

function consoleTextClass(tone: ConsoleLog["tone"]) {
  const classes = {
    data: "text-gray-500 dark:text-gray-500",
    error: "text-error-600 dark:text-error-400",
    info: "text-sky-600 dark:text-sky-400",
    publish: "text-violet-600 dark:text-violet-300",
    subscribe: "text-teal-600 dark:text-teal-300",
    success: "text-success-600 dark:text-success-400",
    warn: "text-warning-600 dark:text-warning-400",
  };

  return classes[tone];
}

function formatReceivedPayload(payload: string) {
  try {
    return JSON.stringify(JSON.parse(payload), null, 2);
  } catch {
    return payload;
  }
}
