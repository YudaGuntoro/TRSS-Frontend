"use client";

import Badge from "@/components/ui/badge/Badge";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/context/ToastContext";
import { RefreshIcon } from "@/icons";
import AppConfigService, { AppConfig } from "@/services/AppConfigService";
import { PERMISSIONS } from "@/utils/auth";
import { useCallback, useEffect, useMemo, useState } from "react";

type FieldInputType = "text" | "select" | "boolean";

type SelectOption = {
  label: string;
  value: string;
};

type PrinterFieldDefinition = {
  key: string;
  label: string;
  description: string;
  type: FieldInputType;
  defaultValue: string;
  placeholder?: string;
  options?: SelectOption[];
};

type PrinterGroupDefinition = {
  id: string;
  title: string;
  subtitle: string;
  badgeLabel: string;
  badgeColor: "primary" | "info" | "success" | "light";
  fields: PrinterFieldDefinition[];
};

type PrinterFieldState = {
  key: string;
  existingId: number | null;
  value: string;
  description: string;
  isDirty: boolean;
  label: string;
  type: FieldInputType;
  placeholder?: string;
  options?: SelectOption[];
};

const PRINTER_GROUPS: PrinterGroupDefinition[] = [
  {
    id: "clinching",
    title: "Printer Clinching & Label",
    subtitle:
      "Konfigurasi printer Zebra untuk label Clinching serta ukuran QR code pada label.",
    badgeLabel: "Clinching",
    badgeColor: "primary",
    fields: [
      {
        key: "PRINTER_IP_CLINCHING",
        label: "IP Address Printer Clinching",
        description: "Alamat IP printer Zebra jaringan untuk Clinching.",
        type: "text",
        defaultValue: "",
        placeholder: "Contoh: 192.168.1.101",
      },
      {
        key: "PRINTER_PORT_CLINCHING",
        label: "Port Printer Clinching",
        description: "Port TCP jaringan printer Zebra (umumnya 9100).",
        type: "text",
        defaultValue: "9100",
        placeholder: "9100",
      },
      {
        key: "QR_CODE_SIZE_LABEL_CLINCHING",
        label: "Ukuran QR Label Clinching",
        description: "Ukuran QR code pada label ZPL Clinching (LARGE / SMALL).",
        type: "select",
        defaultValue: "LARGE",
        options: [
          { label: "LARGE (Besar)", value: "LARGE" },
          { label: "SMALL (Kecil)", value: "SMALL" },
        ],
      },
    ],
  },
  {
    id: "mfan",
    title: "Printer M-Fan Assy",
    subtitle:
      "Konfigurasi printer Zebra dan mode test print untuk lini M-Fan Assy.",
    badgeLabel: "M-Fan Assy",
    badgeColor: "info",
    fields: [
      {
        key: "PRINTER_IP_M_FAN_ASSY",
        label: "IP Address Printer M-Fan Assy",
        description: "Alamat IP printer Zebra jaringan untuk M-Fan Assy.",
        type: "text",
        defaultValue: "",
        placeholder: "Contoh: 192.168.1.102",
      },
      {
        key: "PRINTER_PORT_M_FAN_ASSY",
        label: "Port Printer M-Fan Assy",
        description: "Port TCP jaringan printer Zebra (umumnya 9100).",
        type: "text",
        defaultValue: "9100",
        placeholder: "9100",
      },
      {
        key: "PRINTER_TEST_MODE_MFAN_ASSY",
        label: "Mode Test Print M-Fan Assy",
        description:
          "Jika aktif (true), cetak M-Fan Assy diarahkan ke mode test print.",
        type: "boolean",
        defaultValue: "false",
      },
    ],
  },
  {
    id: "stock_in",
    title: "Printer Stock In",
    subtitle: "Konfigurasi printer Windows driver untuk label Stock In.",
    badgeLabel: "Stock In",
    badgeColor: "success",
    fields: [
      {
        key: "PRINTER_NAME_STOCK_IN",
        label: "Nama Printer Stock In (Windows)",
        description:
          "Nama printer Windows yang digunakan saat mencetak label Stock In.",
        type: "text",
        defaultValue: "",
        placeholder: "Contoh: Printer-StockIn",
      },
    ],
  },
];

const PREDEFINED_KEYS = new Set(
  PRINTER_GROUPS.flatMap((group) =>
    group.fields.map((field) => field.key.toUpperCase())
  )
);

const EXCLUDED_PRINTER_KEYS = new Set([
  "PRINTER_NAME_CLINCHING",
  "PRINTER_NAME_M_FAN_ASSY",
  "PRINTER_NAME_MFAN_ASSY",
]);

const ADDITIONAL_KEY_PREFIXES = ["PRINTER_", "QR_", "IS_TEST_PRINT_"];

const getErrorMessage = (error: unknown, fallback: string) =>
  error instanceof Error ? error.message : fallback;

const parseBooleanString = (value: string) => {
  const normalized = value.trim().toLowerCase();
  return (
    normalized === "true" ||
    normalized === "1" ||
    normalized === "yes" ||
    normalized === "on"
  );
};

const formatDynamicLabel = (key: string) =>
  key
    .toLowerCase()
    .split("_")
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");

const buildFieldMap = (
  configs: AppConfig[] = []
): {
  states: Record<string, PrinterFieldState>;
  extraKeys: string[];
} => {
  const byKey = new Map<string, AppConfig>();
  configs.forEach((item) => {
    byKey.set(item.key.toUpperCase(), item);
  });

  const states: Record<string, PrinterFieldState> = {};

  for (const group of PRINTER_GROUPS) {
    for (const field of group.fields) {
      const existing = byKey.get(field.key.toUpperCase());
      let resolvedValue = existing?.value ?? field.defaultValue;

      if (field.type === "boolean") {
        resolvedValue = parseBooleanString(resolvedValue) ? "true" : "false";
      } else if (field.type === "select" && resolvedValue.trim()) {
        resolvedValue = resolvedValue.trim().toUpperCase();
      }

      states[field.key] = {
        key: field.key,
        existingId: existing?.id ?? null,
        value: resolvedValue,
        description: existing?.description?.trim() || field.description,
        isDirty: false,
        label: field.label,
        type: field.type,
        placeholder: field.placeholder,
        options: field.options,
      };
    }
  }

  const extraKeys: string[] = [];
  for (const item of configs) {
    const upperKey = item.key.toUpperCase();
    const isAdditionalPrinterKey =
      !PREDEFINED_KEYS.has(upperKey) &&
      !EXCLUDED_PRINTER_KEYS.has(upperKey) &&
      ADDITIONAL_KEY_PREFIXES.some((prefix) => upperKey.startsWith(prefix));

    if (isAdditionalPrinterKey) {
      extraKeys.push(item.key);
      states[item.key] = {
        key: item.key,
        existingId: item.id,
        value: item.value ?? "",
        description:
          item.description?.trim() || "Konfigurasi printer dari App Config.",
        isDirty: false,
        label: formatDynamicLabel(item.key),
        type: "text",
        placeholder: "Masukkan nilai konfigurasi",
      };
    }
  }

  extraKeys.sort((a, b) => a.localeCompare(b));
  return { states, extraKeys };
};

export default function PrinterConfigView() {
  const toast = useToast();
  const { can } = useAuth();
  const canCreate = can(PERMISSIONS.APP_CONFIGURATION_CREATE);
  const canEdit = can(PERMISSIONS.APP_CONFIGURATION_EDIT);

  const [fieldStates, setFieldStates] = useState<
    Record<string, PrinterFieldState>
  >(() => buildFieldMap().states);
  const [extraKeys, setExtraKeys] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const [isSavingAll, setIsSavingAll] = useState(false);

  const fetchAllConfigs = useCallback(
    async (signal?: AbortSignal) => {
      setIsLoading(true);
      setLoadError(null);
      try {
        const firstPage = await AppConfigService.getAppConfigs(
          { page: 1, limit: 100 },
          { signal }
        );
        if (signal?.aborted) return;

        const allConfigs: AppConfig[] = [...(firstPage.data ?? [])];
        const totalPage = firstPage.pagination?.totalPage ?? 1;

        for (let page = 2; page <= totalPage; page += 1) {
          const nextPage = await AppConfigService.getAppConfigs(
            { page, limit: 100 },
            { signal }
          );
          if (signal?.aborted) return;
          if (nextPage.data) {
            allConfigs.push(...nextPage.data);
          }
        }

        const built = buildFieldMap(allConfigs);
        setFieldStates(built.states);
        setExtraKeys(built.extraKeys);
      } catch (err: unknown) {
        if (err instanceof DOMException && err.name === "AbortError") {
          return;
        }
        const message = getErrorMessage(
          err,
          "Gagal memuat konfigurasi printer dari App Config."
        );
        setLoadError(message);
        toast.error({
          title: "Gagal Memuat Konfigurasi",
          message,
        });
      } finally {
        if (!signal?.aborted) {
          setIsLoading(false);
        }
      }
    },
    [toast]
  );

  useEffect(() => {
    const controller = new AbortController();
    fetchAllConfigs(controller.signal);
    return () => controller.abort();
  }, [fetchAllConfigs]);

  const groupsToRender = useMemo(() => {
    const groups = PRINTER_GROUPS.map((group) => ({
      ...group,
      keys: group.fields.map((field) => field.key),
    }));

    if (extraKeys.length > 0) {
      groups.push({
        id: "other_printer",
        title: "Pengaturan Printer Lainnya",
        subtitle:
          "Key konfigurasi printer atau QR tambahan yang ditemukan di App Config.",
        badgeLabel: "Lainnya",
        badgeColor: "light",
        fields: [],
        keys: extraKeys,
      });
    }

    return groups;
  }, [extraKeys]);

  const allKeys = useMemo(
    () => groupsToRender.flatMap((group) => group.keys),
    [groupsToRender]
  );

  const canSaveField = useCallback(
    (state: PrinterFieldState | undefined) => {
      if (!state) return false;
      const allowed = state.existingId !== null ? canEdit : canCreate;
      return allowed && (state.isDirty || (state.existingId === null && state.value.trim() !== ""));
    },
    [canCreate, canEdit]
  );

  const pendingSaveKeys = useMemo(
    () => allKeys.filter((key) => canSaveField(fieldStates[key])),
    [allKeys, canSaveField, fieldStates]
  );

  const handleValueChange = (key: string, nextValue: string) => {
    setFieldStates((prev) => {
      const current = prev[key];
      if (!current) return prev;
      return {
        ...prev,
        [key]: {
          ...current,
          value: nextValue,
          isDirty: true,
        },
      };
    });
  };

  const persistField = async (state: PrinterFieldState): Promise<AppConfig> => {
    const trimmedValue = state.value.trim();

    if (state.existingId !== null) {
      const res = await AppConfigService.updateAppConfig(state.existingId, {
        value: trimmedValue,
        description: state.description || undefined,
      });
      return res.data;
    }

    const res = await AppConfigService.createAppConfig({
      key: state.key,
      value: trimmedValue,
      description: state.description || undefined,
    });
    return res.data;
  };

  const handleSaveSingle = async (key: string) => {
    const state = fieldStates[key];
    if (!state) return;

    const allowed = state.existingId !== null ? canEdit : canCreate;
    if (!allowed) {
      toast.error({
        title: "Akses Ditolak",
        message: "Anda tidak memiliki izin untuk menyimpan konfigurasi ini.",
      });
      return;
    }

    setSavingKey(key);
    try {
      const saved = await persistField(state);
      setFieldStates((prev) => ({
        ...prev,
        [key]: {
          ...prev[key],
          existingId: saved.id,
          value:
            prev[key].type === "boolean"
              ? parseBooleanString(saved.value)
                ? "true"
                : "false"
              : saved.value,
          isDirty: false,
        },
      }));
      toast.success({
        title: "Tersimpan",
        message: `${state.label} (${state.key}) berhasil disimpan.`,
      });
    } catch (err: unknown) {
      toast.error({
        title: "Gagal Menyimpan",
        message: getErrorMessage(
          err,
          `Gagal menyimpan pengaturan ${state.key}.`
        ),
      });
    } finally {
      setSavingKey(null);
    }
  };

  const handleSaveAll = async () => {
    if (pendingSaveKeys.length === 0) {
      toast.info({
        title: "Sudah Tersimpan",
        message: "Tidak ada perubahan yang perlu disimpan.",
      });
      return;
    }

    setIsSavingAll(true);
    let successCount = 0;
    const failedKeys: string[] = [];

    for (const key of pendingSaveKeys) {
      const current = fieldStates[key];
      if (!current) continue;

      try {
        const saved = await persistField(current);
        successCount += 1;
        setFieldStates((prev) => ({
          ...prev,
          [key]: {
            ...prev[key],
            existingId: saved.id,
            value:
              prev[key].type === "boolean"
                ? parseBooleanString(saved.value)
                  ? "true"
                  : "false"
                : saved.value,
            isDirty: false,
          },
        }));
      } catch {
        failedKeys.push(key);
      }
    }

    setIsSavingAll(false);

    if (failedKeys.length === 0) {
      toast.success({
        title: "Semua Tersimpan",
        message: `${successCount} pengaturan printer berhasil disimpan.`,
      });
    } else {
      toast.error({
        title: "Sebagian Gagal",
        message: `${successCount} berhasil, gagal pada: ${failedKeys.join(", ")}.`,
      });
    }
  };

  const canSaveAny = canCreate || canEdit;

  return (
    <div className="space-y-5">
      {/* Header Bar */}
      <div className="flex flex-col justify-between gap-4 rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03] sm:flex-row sm:items-center">
        <div>
          <h3 className="text-base font-semibold text-gray-800 dark:text-white/90">
            Pengaturan Printer & Label
          </h3>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Kelola konfigurasi nama printer, alamat IP, port jaringan, dan
            ukuran QR code label secara langsung dari App Config.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={() => fetchAllConfigs()}
            disabled={isLoading || isSavingAll || savingKey !== null}
            className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300 dark:hover:bg-gray-800"
          >
            <RefreshIcon className={`size-4 ${isLoading ? "animate-spin" : ""}`} />
            Refresh
          </button>

          {canSaveAny && (
            <button
              type="button"
              onClick={handleSaveAll}
              disabled={
                isLoading ||
                isSavingAll ||
                savingKey !== null ||
                pendingSaveKeys.length === 0
              }
              className="rounded-lg bg-brand-500 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-brand-600 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isSavingAll ? "Menyimpan..." : "Simpan Semua"}
            </button>
          )}
        </div>
      </div>

      {loadError && (
        <div className="rounded-xl border border-error-200 bg-error-50 p-4 text-sm text-error-700 dark:border-error-500/30 dark:bg-error-500/10 dark:text-error-400">
          {loadError}
        </div>
      )}

      {isLoading ? (
        <div className="space-y-5">
          {PRINTER_GROUPS.map((group) => (
            <div
              key={group.id}
              className="h-56 animate-pulse rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-white/[0.03]"
            />
          ))}
        </div>
      ) : (
        <div className="space-y-5">
          {groupsToRender.map((group) => {
            const savedCount = group.keys.filter((key) => {
              const st = fieldStates[key];
              return st && st.existingId !== null && !st.isDirty;
            }).length;

            return (
              <div
                key={group.id}
                className="overflow-hidden rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03]"
              >
                {/* Group Card Header */}
                <div className="flex flex-col justify-between gap-2 border-b border-gray-100 bg-gray-50/70 px-6 py-4 dark:border-gray-800 dark:bg-white/[0.02] sm:flex-row sm:items-center">
                  <div>
                    <div className="flex flex-wrap items-center gap-2.5">
                      <Badge color={group.badgeColor} size="sm">
                        {group.badgeLabel}
                      </Badge>
                      <h4 className="text-base font-semibold text-gray-800 dark:text-white/90">
                        {group.title}
                      </h4>
                    </div>
                    <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                      {group.subtitle}
                    </p>
                  </div>
                  <span className="text-xs font-medium text-gray-500 dark:text-gray-400">
                    {savedCount} / {group.keys.length} Tersimpan
                  </span>
                </div>

                {/* Group Field Rows */}
                <div className="divide-y divide-gray-100 dark:divide-gray-800">
                  {group.keys.map((key) => {
                    const state = fieldStates[key];
                    if (!state) return null;

                    const allowed =
                      state.existingId !== null ? canEdit : canCreate;
                    const isSavingThis = savingKey === key;
                    const canSaveThis = canSaveField(state);
                    const isSaved = state.existingId !== null && !state.isDirty;
                    const isBooleanOn = parseBooleanString(state.value);

                    const selectOptions =
                      state.type === "select"
                        ? [
                            ...(state.options ?? []),
                            ...(state.value &&
                            !(state.options ?? []).some(
                              (opt) => opt.value === state.value
                            )
                              ? [{ label: state.value, value: state.value }]
                              : []),
                          ]
                        : [];

                    return (
                      <div
                        key={key}
                        className="grid grid-cols-1 items-center gap-4 px-6 py-4 transition-colors hover:bg-gray-50/50 dark:hover:bg-white/[0.01] lg:grid-cols-12"
                      >
                        {/* Left: Label, Key, Description */}
                        <div className="space-y-1 lg:col-span-5">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="text-sm font-medium text-gray-800 dark:text-white/90">
                              {state.label}
                            </span>
                            <code className="rounded bg-gray-100 px-1.5 py-0.5 font-mono text-[11px] text-gray-600 dark:bg-white/[0.06] dark:text-gray-400">
                              {state.key}
                            </code>
                          </div>
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            {state.description}
                          </p>
                        </div>

                        {/* Middle: Input Control */}
                        <div className="lg:col-span-5">
                          {state.type === "boolean" ? (
                            <label className="inline-flex cursor-pointer items-center gap-3 select-none">
                              <button
                                type="button"
                                role="switch"
                                aria-checked={isBooleanOn}
                                disabled={!allowed}
                                onClick={() =>
                                  handleValueChange(
                                    key,
                                    isBooleanOn ? "false" : "true"
                                  )
                                }
                                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none disabled:cursor-not-allowed disabled:opacity-50 ${
                                  isBooleanOn
                                    ? "bg-brand-500"
                                    : "bg-gray-300 dark:bg-gray-700"
                                }`}
                              >
                                <span
                                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow transition duration-200 ${
                                    isBooleanOn
                                      ? "translate-x-5"
                                      : "translate-x-0"
                                  }`}
                                />
                              </button>
                              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                {isBooleanOn ? "Aktif (true)" : "Nonaktif (false)"}
                              </span>
                            </label>
                          ) : state.type === "select" ? (
                            <select
                              value={state.value}
                              onChange={(e) =>
                                handleValueChange(key, e.target.value)
                              }
                              disabled={!allowed}
                              className="h-10.5 w-full rounded-lg border border-gray-300 bg-transparent px-3 text-sm text-gray-800 outline-none focus:border-brand-300 focus:ring-3 focus:ring-brand-500/10 disabled:cursor-not-allowed disabled:bg-gray-100 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 dark:disabled:bg-gray-800"
                            >
                              {selectOptions.map((opt) => (
                                <option key={opt.value} value={opt.value}>
                                  {opt.label}
                                </option>
                              ))}
                            </select>
                          ) : (
                            <input
                              type="text"
                              value={state.value}
                              onChange={(e) =>
                                handleValueChange(key, e.target.value)
                              }
                              disabled={!allowed}
                              placeholder={state.placeholder ?? "Masukkan value"}
                              className="h-10.5 w-full rounded-lg border border-gray-300 bg-transparent px-3 text-sm text-gray-800 outline-none placeholder:text-gray-400 focus:border-brand-300 focus:ring-3 focus:ring-brand-500/10 disabled:cursor-not-allowed disabled:bg-gray-100 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 dark:disabled:bg-gray-800"
                            />
                          )}
                        </div>

                        {/* Right: Save Button & Status */}
                        <div className="flex items-center justify-between gap-3 lg:col-span-2 lg:flex-col lg:items-end lg:justify-center">
                          {allowed && (
                            <button
                              type="button"
                              onClick={() => handleSaveSingle(key)}
                              disabled={
                                !canSaveThis || isSavingThis || isSavingAll
                              }
                              className="rounded-lg bg-brand-500 px-4 py-2 text-xs font-medium text-white transition-colors hover:bg-brand-600 disabled:cursor-not-allowed disabled:bg-gray-200 disabled:text-gray-400 dark:disabled:bg-gray-800 dark:disabled:text-gray-500 lg:w-full"
                            >
                              {isSavingThis ? "Menyimpan..." : "Simpan"}
                            </button>
                          )}
                          <span
                            className={`text-[11px] font-medium ${
                              isSaved
                                ? "text-success-600 dark:text-success-400"
                                : "text-warning-600 dark:text-warning-400"
                            }`}
                          >
                            {isSaved ? "Tersimpan" : "Belum disimpan"}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
