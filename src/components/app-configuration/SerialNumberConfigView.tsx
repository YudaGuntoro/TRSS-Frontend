"use client";

import Badge from "@/components/ui/badge/Badge";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/context/ToastContext";
import { RefreshIcon } from "@/icons";
import AppConfigService, { AppConfig } from "@/services/AppConfigService";
import { PERMISSIONS } from "@/utils/auth";
import { useCallback, useEffect, useMemo, useState } from "react";

type SerialNumberFieldDefinition = {
  key: string;
  label: string;
  badgeLabel: string;
  badgeColor: "info" | "primary" | "light";
  description: string;
  placeholder: string;
  defaultValue: string;
  supportsPreview: boolean;
};

type SerialNumberFieldState = SerialNumberFieldDefinition & {
  existingId: number | null;
  value: string;
  isDirty: boolean;
};

const PREDEFINED_SERIAL_FIELDS: SerialNumberFieldDefinition[] = [
  {
    key: "START_SERIAL_NUMBER_CLINCHING",
    label: "Nomor Urut Awal Clinching (Database Kosong / Awal Tahun)",
    badgeLabel: "Tanpa Data Sebelumnya",
    badgeColor: "info",
    description:
      "Digunakan sebagai nomor urut pertama saat belum ada data serial number Clinching (PVRA) di database pada tahun berjalan.",
    placeholder: "Contoh: 1 atau PVRA000001",
    defaultValue: "1",
    supportsPreview: true,
  },
  {
    key: "START_SERIAL_NUMBER_CLINCHING_WITH_DATA",
    label: "Nomor Urut Awal Clinching (Saat Sudah Ada Data)",
    badgeLabel: "Sudah Ada Data",
    badgeColor: "primary",
    description:
      "Digunakan untuk melompati nomor urut jika nilai ini lebih besar dari sequence tertinggi yang sudah tercatat di database.",
    placeholder: "Contoh: 500 atau PVRA000500",
    defaultValue: "1",
    supportsPreview: true,
  },
];

const PREDEFINED_KEYS = new Set(
  PREDEFINED_SERIAL_FIELDS.map((field) => field.key.toUpperCase())
);

const getErrorMessage = (error: unknown, fallback: string) =>
  error instanceof Error ? error.message : fallback;

const formatDynamicLabel = (key: string) =>
  key
    .toLowerCase()
    .split("_")
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");

const parseSequenceNumber = (rawValue: string): number | null => {
  let trimmed = rawValue.trim();
  if (!trimmed) return null;

  if (/^pvra/i.test(trimmed)) {
    trimmed = trimmed.slice(4);
  } else if (/^cc/i.test(trimmed)) {
    trimmed = trimmed.slice(2);
  }

  if (!/^\d+$/.test(trimmed)) {
    return null;
  }

  const parsed = Number.parseInt(trimmed, 10);
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : null;
};

const formatSerialNumberPreview = (rawValue: string): string | null => {
  const seq = parseSequenceNumber(rawValue);
  return seq !== null ? `PVRA${String(seq).padStart(6, "0")}` : null;
};

const buildFieldMap = (
  configs: AppConfig[] = []
): {
  states: Record<string, SerialNumberFieldState>;
  extraKeys: string[];
} => {
  const byKey = new Map<string, AppConfig>();
  configs.forEach((item) => {
    byKey.set(item.key.toUpperCase(), item);
  });

  const states: Record<string, SerialNumberFieldState> = {};

  for (const field of PREDEFINED_SERIAL_FIELDS) {
    const existing = byKey.get(field.key.toUpperCase());
    states[field.key] = {
      ...field,
      existingId: existing?.id ?? null,
      value: existing?.value ?? field.defaultValue,
      description: existing?.description?.trim() || field.description,
      isDirty: false,
    };
  }

  const extraKeys: string[] = [];
  for (const item of configs) {
    const upperKey = item.key.toUpperCase();
    if (!PREDEFINED_KEYS.has(upperKey) && upperKey.includes("SERIAL_NUMBER")) {
      extraKeys.push(item.key);
      states[item.key] = {
        key: item.key,
        label: formatDynamicLabel(item.key),
        badgeLabel: "Lainnya",
        badgeColor: "light",
        description:
          item.description?.trim() ||
          "Konfigurasi serial number dari App Config.",
        placeholder: "Masukkan nilai konfigurasi",
        defaultValue: "",
        supportsPreview: upperKey.includes("CLINCHING"),
        existingId: item.id,
        value: item.value ?? "",
        isDirty: false,
      };
    }
  }

  extraKeys.sort((a, b) => a.localeCompare(b));
  return { states, extraKeys };
};

export default function SerialNumberConfigView() {
  const toast = useToast();
  const { can } = useAuth();
  const canCreate = can(PERMISSIONS.APP_CONFIGURATION_CREATE);
  const canEdit = can(PERMISSIONS.APP_CONFIGURATION_EDIT);

  const [fieldStates, setFieldStates] = useState<
    Record<string, SerialNumberFieldState>
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
          "Gagal memuat konfigurasi serial number dari App Config."
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

  const orderedKeys = useMemo(
    () => [...PREDEFINED_SERIAL_FIELDS.map((f) => f.key), ...extraKeys],
    [extraKeys]
  );

  const canSaveField = useCallback(
    (state: SerialNumberFieldState | undefined) => {
      if (!state) return false;
      const allowed = state.existingId !== null ? canEdit : canCreate;
      return (
        allowed &&
        (state.isDirty ||
          (state.existingId === null && state.value.trim() !== ""))
      );
    },
    [canCreate, canEdit]
  );

  const pendingSaveKeys = useMemo(
    () => orderedKeys.filter((key) => canSaveField(fieldStates[key])),
    [canSaveField, fieldStates, orderedKeys]
  );

  const savedCount = useMemo(
    () =>
      orderedKeys.filter((key) => {
        const st = fieldStates[key];
        return st && st.existingId !== null && !st.isDirty;
      }).length,
    [fieldStates, orderedKeys]
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

  const persistField = async (
    state: SerialNumberFieldState
  ): Promise<AppConfig> => {
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
          value: saved.value,
          isDirty: false,
        },
      }));
      toast.success({
        title: "Tersimpan",
        message: `Konfigurasi ${state.key} berhasil disimpan.`,
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
            value: saved.value,
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
        message: `${successCount} konfigurasi serial number berhasil disimpan.`,
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
            Pengaturan Nomor Urut Serial Number (Clinching)
          </h3>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Atur nilai awal sequence serial number Clinching (format{" "}
            <code className="rounded bg-gray-100 px-1.5 py-0.5 font-mono text-xs text-gray-700 dark:bg-white/[0.06] dark:text-gray-300">
              PVRA000001
            </code>
            ). Anda dapat memasukkan angka langsung atau dengan awalan{" "}
            <code className="rounded bg-gray-100 px-1.5 py-0.5 font-mono text-xs text-gray-700 dark:bg-white/[0.06] dark:text-gray-300">
              PVRA
            </code>
            .
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

      {/* Main White Card */}
      <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03]">
        <div className="flex flex-col justify-between gap-2 border-b border-gray-100 bg-gray-50/70 px-6 py-4 dark:border-gray-800 dark:bg-white/[0.02] sm:flex-row sm:items-center">
          <div>
            <h4 className="text-base font-semibold text-gray-800 dark:text-white/90">
              Start Sequence Serial Number
            </h4>
            <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
              Nilai disimpan ke App Config sebagai penentu sequence awal saat generate serial number Clinching.
            </p>
          </div>
          <span className="text-xs font-medium text-gray-500 dark:text-gray-400">
            {savedCount} / {orderedKeys.length} Tersimpan
          </span>
        </div>

        {isLoading ? (
          <div className="space-y-4 p-6">
            {PREDEFINED_SERIAL_FIELDS.map((field) => (
              <div
                key={field.key}
                className="h-20 animate-pulse rounded-xl bg-gray-100 dark:bg-white/[0.04]"
              />
            ))}
          </div>
        ) : (
          <div className="divide-y divide-gray-100 dark:divide-gray-800">
            {orderedKeys.map((key) => {
              const state = fieldStates[key];
              if (!state) return null;

              const allowed =
                state.existingId !== null ? canEdit : canCreate;
              const isSavingThis = savingKey === key;
              const canSaveThis = canSaveField(state);
              const isSaved = state.existingId !== null && !state.isDirty;
              const previewCode = state.supportsPreview
                ? formatSerialNumberPreview(state.value)
                : null;

              return (
                <div
                  key={key}
                  className="grid grid-cols-1 items-start gap-4 px-6 py-5 transition-colors hover:bg-gray-50/50 dark:hover:bg-white/[0.01] lg:grid-cols-12"
                >
                  {/* Left: Badge, Label, Key, Description */}
                  <div className="space-y-1.5 lg:col-span-5">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge color={state.badgeColor} size="sm">
                        {state.badgeLabel}
                      </Badge>
                      <code className="rounded bg-gray-100 px-1.5 py-0.5 font-mono text-[11px] text-gray-600 dark:bg-white/[0.06] dark:text-gray-400">
                        {state.key}
                      </code>
                    </div>
                    <div className="text-sm font-medium text-gray-800 dark:text-white/90">
                      {state.label}
                    </div>
                    <p className="text-xs leading-relaxed text-gray-500 dark:text-gray-400">
                      {state.description}
                    </p>
                  </div>

                  {/* Middle: Input + Live SN Preview */}
                  <div className="space-y-2 lg:col-span-5">
                    <input
                      type="text"
                      value={state.value}
                      onChange={(e) => handleValueChange(key, e.target.value)}
                      disabled={!allowed}
                      placeholder={state.placeholder}
                      className="h-10.5 w-full rounded-lg border border-gray-300 bg-transparent px-3 font-mono text-sm text-gray-800 outline-none placeholder:font-sans placeholder:text-gray-400 focus:border-brand-300 focus:ring-3 focus:ring-brand-500/10 disabled:cursor-not-allowed disabled:bg-gray-100 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 dark:disabled:bg-gray-800"
                    />

                    {state.supportsPreview && (
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {previewCode ? (
                          <>
                            Contoh SN yang dihasilkan:{" "}
                            <code className="rounded bg-success-50 px-1.5 py-0.5 font-mono font-semibold text-success-700 dark:bg-success-500/15 dark:text-success-400">
                              {previewCode}
                            </code>
                          </>
                        ) : (
                          <span className="text-warning-600 dark:text-warning-400">
                            Masukkan angka &gt; 0 atau format PVRA000001 (nilai tidak valid dianggap default awal).
                          </span>
                        )}
                      </p>
                    )}
                  </div>

                  {/* Right: Save Button & Status */}
                  <div className="flex items-center justify-between gap-3 lg:col-span-2 lg:flex-col lg:items-end lg:justify-center">
                    {allowed && (
                      <button
                        type="button"
                        onClick={() => handleSaveSingle(key)}
                        disabled={!canSaveThis || isSavingThis || isSavingAll}
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
        )}
      </div>
    </div>
  );
}
