"use client";

import Badge from "@/components/ui/badge/Badge";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/context/ToastContext";
import AppConfigService, { AppConfig } from "@/services/AppConfigService";
import { PERMISSIONS } from "@/utils/auth";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

type ValidationScanTypeId =
  | "JUMPING"
  | "PROCESS_NG"
  | "SERIAL_NOT_FOUND"
  | "SERIAL_EMPTY"
  | "PAIR_NOT_FOUND";

type ValidationScanConfigValue = {
  message: string;
  message_detail: string;
  include_last_process: boolean;
  default_last_process: string;
};

type ValidationScanTypeDefinition = {
  id: ValidationScanTypeId;
  configKey: string;
  badgeLabel: string;
  badgeColor: "warning" | "error" | "info" | "dark" | "primary";
  shortDesc: string;
  configDesc: string;
  defaults: ValidationScanConfigValue;
};

type ValidationScanTypeState = {
  existingId: number | null;
  isDirty: boolean;
  form: ValidationScanConfigValue;
};

const MESSAGE_TOKENS = ["{process}", "{serial_number}"] as const;
const DETAIL_TOKENS = ["{process}", "{parameters}", "{serial_number}"] as const;

const SAMPLE_VALUES = {
  serial_number: "PVRA2601010001",
  process: "CLINCHING_SHORT_SIDE",
  parameters: "SHORT_SIDE_CLINCH_1, SHORT_SIDE_CLINCH_2",
  line: "clinching",
  last_process: "CLINCHING_SHORT_SIDE",
};

const VALIDATION_SCAN_TYPES: ValidationScanTypeDefinition[] = [
  {
    id: "JUMPING",
    configKey: "VALIDATION_SCAN_TYPE_JUMPING",
    badgeLabel: "Jumping",
    badgeColor: "warning",
    shortDesc: "Proses atau parameter sebelumnya belum lengkap.",
    configDesc:
      "Konfigurasi payload MQTT status 2 untuk tipe error JUMPING pada validation scan.",
    defaults: {
      message: "Jumping proses {process}",
      message_detail:
        "Data proses {process} ({parameters}) untuk serial number {serial_number} belum lengkap.",
      include_last_process: true,
      default_last_process: "",
    },
  },
  {
    id: "PROCESS_NG",
    configKey: "VALIDATION_SCAN_TYPE_PROCESS_NG",
    badgeLabel: "Proses NG",
    badgeColor: "error",
    shortDesc: "Ada parameter proses sebelumnya yang berstatus NG.",
    configDesc:
      "Konfigurasi payload MQTT status 2 untuk tipe error PROCESS_NG pada validation scan.",
    defaults: {
      message: "Tidak bisa lanjut, proses {process} NG",
      message_detail:
        "Data proses {process} ({parameters}) untuk serial number {serial_number} tidak OK (NG).",
      include_last_process: true,
      default_last_process: "",
    },
  },
  {
    id: "SERIAL_NOT_FOUND",
    configKey: "VALIDATION_SCAN_TYPE_SERIAL_NOT_FOUND",
    badgeLabel: "SN Tidak Ditemukan",
    badgeColor: "info",
    shortDesc: "Serial number belum terdaftar atau belum ada riwayat proses.",
    configDesc:
      "Konfigurasi payload MQTT status 2 untuk tipe error SERIAL_NOT_FOUND pada validation scan.",
    defaults: {
      message: "Serial number {serial_number} tidak ditemukan",
      message_detail:
        "Serial number {serial_number} tidak ditemukan pada proses {process}.",
      include_last_process: false,
      default_last_process: "",
    },
  },
  {
    id: "SERIAL_EMPTY",
    configKey: "VALIDATION_SCAN_TYPE_SERIAL_EMPTY",
    badgeLabel: "SN Kosong",
    badgeColor: "dark",
    shortDesc: "Payload scan dikirim tanpa mengisi serial number.",
    configDesc:
      "Konfigurasi payload MQTT status 2 untuk tipe error SERIAL_EMPTY pada validation scan.",
    defaults: {
      message: "Serial number kosong pada proses {process}",
      message_detail: "Serial number untuk proses {process} wajib diisi.",
      include_last_process: false,
      default_last_process: "",
    },
  },
  {
    id: "PAIR_NOT_FOUND",
    configKey: "VALIDATION_SCAN_TYPE_PAIR_NOT_FOUND",
    badgeLabel: "Pasangan SN Belum Ada",
    badgeColor: "primary",
    shortDesc: "Pasangan serial number M-Fan belum terhubung di Final Inspection.",
    configDesc:
      "Konfigurasi payload MQTT status 2 untuk tipe error PAIR_NOT_FOUND pada validation scan final inspection.",
    defaults: {
      message: "Pasangan M-Fan untuk {serial_number} belum lengkap",
      message_detail:
        "Serial number M-Fan untuk {serial_number} pada proses {process} belum ada pada traceability log.",
      include_last_process: false,
      default_last_process: "",
    },
  },
];

const getErrorMessage = (error: unknown, fallback: string) =>
  error instanceof Error ? error.message : fallback;

const parseConfigValue = (
  rawValue: string | undefined,
  defaults: ValidationScanConfigValue
): ValidationScanConfigValue => {
  if (!rawValue || !rawValue.trim()) {
    return { ...defaults };
  }

  try {
    const parsed = JSON.parse(rawValue) as unknown;
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      const record = parsed as Record<string, unknown>;
      return {
        message:
          typeof record.message === "string"
            ? record.message
            : defaults.message,
        message_detail:
          typeof record.message_detail === "string"
            ? record.message_detail
            : defaults.message_detail,
        include_last_process:
          typeof record.include_last_process === "boolean"
            ? record.include_last_process
            : defaults.include_last_process,
        default_last_process:
          typeof record.default_last_process === "string"
            ? record.default_last_process
            : defaults.default_last_process,
      };
    }
  } catch {
    // Fallback below when existing value is plain text
  }

  return {
    ...defaults,
    message: rawValue.trim(),
  };
};

const createInitialState = (
  configs: AppConfig[] = []
): Record<ValidationScanTypeId, ValidationScanTypeState> => {
  const byKey = new Map<string, AppConfig>();
  configs.forEach((item) => {
    byKey.set(item.key.toUpperCase(), item);
  });

  const next = {} as Record<ValidationScanTypeId, ValidationScanTypeState>;
  for (const def of VALIDATION_SCAN_TYPES) {
    const existing = byKey.get(def.configKey.toUpperCase());
    next[def.id] = {
      existingId: existing?.id ?? null,
      isDirty: false,
      form: parseConfigValue(existing?.value, def.defaults),
    };
  }
  return next;
};

const renderPreview = (template: string) =>
  template.replace(
    /\{(serial_number|process|parameters|parameter|line)\}/g,
    (_, token) => {
      if (token === "serial_number") return SAMPLE_VALUES.serial_number;
      if (token === "process") return SAMPLE_VALUES.process;
      if (token === "parameters" || token === "parameter") {
        return SAMPLE_VALUES.parameters;
      }
      if (token === "line") return SAMPLE_VALUES.line;
      return "";
    }
  );

export default function ValidationScanConfigView() {
  const toast = useToast();
  const { can } = useAuth();
  const canCreate = can(PERMISSIONS.APP_CONFIGURATION_CREATE);
  const canEdit = can(PERMISSIONS.APP_CONFIGURATION_EDIT);

  const [configsState, setConfigsState] = useState<
    Record<ValidationScanTypeId, ValidationScanTypeState>
  >(() => createInitialState());
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [savingId, setSavingId] = useState<ValidationScanTypeId | null>(null);
  const [isSavingAll, setIsSavingAll] = useState(false);

  const messageInputRefs = useRef<
    Partial<Record<ValidationScanTypeId, HTMLInputElement | null>>
  >({});
  const detailTextareaRefs = useRef<
    Partial<Record<ValidationScanTypeId, HTMLTextAreaElement | null>>
  >({});

  const fetchConfigs = useCallback(
    async (signal?: AbortSignal) => {
      setIsLoading(true);
      setLoadError(null);
      try {
        const response = await AppConfigService.getAppConfigs(
          { page: 1, limit: 100, search: "VALIDATION_SCAN_TYPE_" },
          { signal }
        );
        if (signal?.aborted) return;
        setConfigsState(createInitialState(response.data ?? []));
      } catch (err: unknown) {
        if (err instanceof DOMException && err.name === "AbortError") {
          return;
        }
        const message = getErrorMessage(
          err,
          "Gagal memuat konfigurasi validation scan."
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
    fetchConfigs(controller.signal);
    return () => controller.abort();
  }, [fetchConfigs]);

  const pendingSaveCount = useMemo(
    () =>
      VALIDATION_SCAN_TYPES.filter((def) => {
        const item = configsState[def.id];
        return item.isDirty || item.existingId === null;
      }).length,
    [configsState]
  );

  const updateField = <K extends keyof ValidationScanConfigValue>(
    typeId: ValidationScanTypeId,
    field: K,
    value: ValidationScanConfigValue[K]
  ) => {
    setConfigsState((prev) => ({
      ...prev,
      [typeId]: {
        ...prev[typeId],
        isDirty: true,
        form: {
          ...prev[typeId].form,
          [field]: value,
        },
      },
    }));
  };

  const insertTokenAtCursor = (
    typeId: ValidationScanTypeId,
    field: "message" | "message_detail",
    token: string
  ) => {
    const inputEl =
      field === "message"
        ? messageInputRefs.current[typeId]
        : detailTextareaRefs.current[typeId];
    const currentText = configsState[typeId].form[field];

    if (!inputEl) {
      updateField(typeId, field, `${currentText}${token}`);
      return;
    }

    const start = inputEl.selectionStart ?? currentText.length;
    const end = inputEl.selectionEnd ?? currentText.length;
    const updated =
      currentText.slice(0, start) + token + currentText.slice(end);

    updateField(typeId, field, updated);

    requestAnimationFrame(() => {
      inputEl.focus();
      const cursor = start + token.length;
      inputEl.setSelectionRange(cursor, cursor);
    });
  };

  const persistTypeConfig = async (
    def: ValidationScanTypeDefinition,
    currentState: ValidationScanTypeState
  ): Promise<AppConfig> => {
    const serializedValue = JSON.stringify({
      message: currentState.form.message.trim(),
      message_detail: currentState.form.message_detail.trim(),
      include_last_process: currentState.form.include_last_process,
      default_last_process: currentState.form.default_last_process.trim(),
    });

    if (currentState.existingId !== null) {
      const res = await AppConfigService.updateAppConfig(
        currentState.existingId,
        {
          value: serializedValue,
          description: def.configDesc,
        }
      );
      return res.data;
    }

    const res = await AppConfigService.createAppConfig({
      key: def.configKey,
      value: serializedValue,
      description: def.configDesc,
    });
    return res.data;
  };

  const handleSaveSingle = async (def: ValidationScanTypeDefinition) => {
    const state = configsState[def.id];
    const canSave = state.existingId !== null ? canEdit : canCreate;
    if (!canSave) {
      toast.error({
        title: "Akses Ditolak",
        message: "Anda tidak memiliki izin untuk menyimpan konfigurasi ini.",
      });
      return;
    }

    setSavingId(def.id);
    try {
      const saved = await persistTypeConfig(def, state);
      setConfigsState((prev) => ({
        ...prev,
        [def.id]: {
          existingId: saved.id,
          isDirty: false,
          form: parseConfigValue(saved.value, def.defaults),
        },
      }));
      toast.success({
        title: "Tersimpan",
        message: `Pengaturan "${def.badgeLabel}" berhasil disimpan.`,
      });
    } catch (err: unknown) {
      toast.error({
        title: "Gagal Menyimpan",
        message: getErrorMessage(
          err,
          `Gagal menyimpan pengaturan "${def.badgeLabel}".`
        ),
      });
    } finally {
      setSavingId(null);
    }
  };

  const handleSaveAll = async () => {
    const targets = VALIDATION_SCAN_TYPES.filter((def) => {
      const state = configsState[def.id];
      const allowed = state.existingId !== null ? canEdit : canCreate;
      return allowed && (state.isDirty || state.existingId === null);
    });

    if (targets.length === 0) {
      toast.info({
        title: "Sudah Tersimpan",
        message: "Semua pengaturan validation scan sudah tersimpan.",
      });
      return;
    }

    setIsSavingAll(true);
    let successCount = 0;
    const failedLabels: string[] = [];

    for (const def of targets) {
      try {
        const saved = await persistTypeConfig(def, configsState[def.id]);
        successCount += 1;
        setConfigsState((prev) => ({
          ...prev,
          [def.id]: {
            existingId: saved.id,
            isDirty: false,
            form: parseConfigValue(saved.value, def.defaults),
          },
        }));
      } catch {
        failedLabels.push(def.badgeLabel);
      }
    }

    setIsSavingAll(false);

    if (failedLabels.length === 0) {
      toast.success({
        title: "Berhasil Disimpan",
        message: `${successCount} tipe pengaturan berhasil disimpan.`,
      });
    } else {
      toast.error({
        title: "Sebagian Gagal",
        message: `${successCount} berhasil, gagal pada: ${failedLabels.join(", ")}.`,
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
            Pengaturan Pesan Validation Scan (Status 2 / NG)
          </h3>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Variabel tersedia:{" "}
            <code className="rounded bg-gray-100 px-1.5 py-0.5 font-mono text-xs text-gray-700 dark:bg-white/[0.06] dark:text-gray-300">
              {"{process}"}
            </code>
            ,{" "}
            <code className="rounded bg-gray-100 px-1.5 py-0.5 font-mono text-xs text-gray-700 dark:bg-white/[0.06] dark:text-gray-300">
              {"{parameters}"}
            </code>{" "}
            (bisa lebih dari satu sesuai error), dan{" "}
            <code className="rounded bg-gray-100 px-1.5 py-0.5 font-mono text-xs text-gray-700 dark:bg-white/[0.06] dark:text-gray-300">
              {"{serial_number}"}
            </code>
            .
          </p>
        </div>

        {canSaveAny && (
          <div className="flex flex-wrap items-center gap-2.5">
            <button
              type="button"
              onClick={handleSaveAll}
              disabled={
                isLoading ||
                isSavingAll ||
                savingId !== null ||
                pendingSaveCount === 0
              }
              className="rounded-lg bg-brand-500 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-brand-600 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isSavingAll ? "Menyimpan..." : "Simpan Semua"}
            </button>
          </div>
        )}
      </div>

      {loadError && (
        <div className="rounded-xl border border-error-200 bg-error-50 p-4 text-sm text-error-700 dark:border-error-500/30 dark:bg-error-500/10 dark:text-error-400">
          {loadError}
        </div>
      )}

      {/* Main White Card Table */}
      <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03]">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[960px] divide-y divide-gray-200 text-left dark:divide-gray-800">
            <thead className="bg-gray-50 dark:bg-white/[0.02]">
              <tr>
                <th className="w-[22%] px-5 py-3.5 text-xs font-semibold uppercase tracking-wider text-gray-600 dark:text-gray-300">
                  Tipe Kondisi
                </th>
                <th className="w-[22%] px-5 py-3.5 text-xs font-semibold uppercase tracking-wider text-gray-600 dark:text-gray-300">
                  message (Pesan Utama)
                </th>
                <th className="w-[34%] px-5 py-3.5 text-xs font-semibold uppercase tracking-wider text-gray-600 dark:text-gray-300">
                  message_detail (Pesan Detail)
                </th>
                <th className="w-[12%] px-5 py-3.5 text-xs font-semibold uppercase tracking-wider text-gray-600 dark:text-gray-300">
                  last_process
                </th>
                <th className="w-[10%] px-5 py-3.5 text-center text-xs font-semibold uppercase tracking-wider text-gray-600 dark:text-gray-300">
                  Aksi
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
              {isLoading ? (
                VALIDATION_SCAN_TYPES.map((def) => (
                  <tr key={def.id}>
                    <td colSpan={5} className="px-5 py-6">
                      <div className="h-12 animate-pulse rounded-lg bg-gray-100 dark:bg-white/[0.04]" />
                    </td>
                  </tr>
                ))
              ) : (
                VALIDATION_SCAN_TYPES.map((def) => {
                  const itemState = configsState[def.id];
                  const { form, existingId, isDirty } = itemState;
                  const isSavingThis = savingId === def.id;
                  const canSaveThis = existingId !== null ? canEdit : canCreate;
                  const needsSave = isDirty || existingId === null;
                  const renderedMessage = renderPreview(form.message);
                  const renderedDetail = renderPreview(form.message_detail);

                  const renderTokenPills = (
                    tokens: readonly string[],
                    field: "message" | "message_detail"
                  ) =>
                    canSaveThis ? (
                      <div className="flex flex-wrap items-center gap-1.5">
                        {tokens.map((token) => (
                          <button
                            key={token}
                            type="button"
                            onClick={() =>
                              insertTokenAtCursor(def.id, field, token)
                            }
                            className="rounded-md border border-brand-200 bg-brand-50 px-2 py-0.5 font-mono text-[11px] font-medium text-brand-600 transition-colors hover:bg-brand-100 dark:border-brand-500/30 dark:bg-brand-500/10 dark:text-brand-400 dark:hover:bg-brand-500/20"
                          >
                            + {token}
                          </button>
                        ))}
                      </div>
                    ) : null;

                  return (
                    <tr
                      key={def.id}
                      className="align-top transition-colors hover:bg-gray-50/50 dark:hover:bg-white/[0.01]"
                    >
                      {/* 1. Tipe Kondisi */}
                      <td className="px-5 py-5">
                        <div className="space-y-2">
                          <Badge color={def.badgeColor} size="sm">
                            {def.badgeLabel}
                          </Badge>
                          <p className="text-xs leading-relaxed text-gray-500 dark:text-gray-400">
                            {def.shortDesc}
                          </p>
                        </div>
                      </td>

                      {/* 2. message (Pesan Utama) */}
                      <td className="px-5 py-5">
                        <div className="space-y-2">
                          <input
                            ref={(el) => {
                              messageInputRefs.current[def.id] = el;
                            }}
                            type="text"
                            value={form.message}
                            onChange={(e) =>
                              updateField(def.id, "message", e.target.value)
                            }
                            disabled={!canSaveThis}
                            placeholder="Masukkan pesan utama"
                            className="h-10 w-full rounded-lg border border-gray-300 bg-transparent px-3 text-sm text-gray-800 outline-none placeholder:text-gray-400 focus:border-brand-300 focus:ring-3 focus:ring-brand-500/10 disabled:cursor-not-allowed disabled:bg-gray-100 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 dark:disabled:bg-gray-800"
                          />
                          {renderTokenPills(MESSAGE_TOKENS, "message")}
                          <p className="text-xs leading-relaxed text-gray-500 dark:text-gray-400">
                            <span className="font-medium">Contoh:</span>{" "}
                            <span className="text-gray-700 dark:text-gray-300">
                              {renderedMessage || "-"}
                            </span>
                          </p>
                        </div>
                      </td>

                      {/* 3. message_detail (Pesan Detail) */}
                      <td className="px-5 py-5">
                        <div className="space-y-2">
                          <textarea
                            ref={(el) => {
                              detailTextareaRefs.current[def.id] = el;
                            }}
                            rows={2}
                            value={form.message_detail}
                            onChange={(e) =>
                              updateField(
                                def.id,
                                "message_detail",
                                e.target.value
                              )
                            }
                            disabled={!canSaveThis}
                            placeholder="Masukkan template pesan detail"
                            className="w-full resize-y rounded-lg border border-gray-300 bg-transparent px-3 py-2 text-sm text-gray-800 outline-none placeholder:text-gray-400 focus:border-brand-300 focus:ring-3 focus:ring-brand-500/10 disabled:cursor-not-allowed disabled:bg-gray-100 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 dark:disabled:bg-gray-800"
                          />

                          {renderTokenPills(DETAIL_TOKENS, "message_detail")}

                          <p className="text-xs leading-relaxed text-gray-500 dark:text-gray-400">
                            <span className="font-medium">Contoh:</span>{" "}
                            <span className="text-gray-700 dark:text-gray-300">
                              {renderedDetail || "-"}
                            </span>
                          </p>
                        </div>
                      </td>

                      {/* 4. last_process */}
                      <td className="px-5 py-5">
                        <div className="space-y-2">
                          <label className="inline-flex cursor-pointer items-center gap-2.5 select-none">
                            <button
                              type="button"
                              role="switch"
                              aria-checked={form.include_last_process}
                              disabled={!canSaveThis}
                              onClick={() =>
                                updateField(
                                  def.id,
                                  "include_last_process",
                                  !form.include_last_process
                                )
                              }
                              className={`relative inline-flex h-5.5 w-10 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none disabled:cursor-not-allowed disabled:opacity-50 ${
                                form.include_last_process
                                  ? "bg-brand-500"
                                  : "bg-gray-300 dark:bg-gray-700"
                              }`}
                            >
                              <span
                                className={`pointer-events-none inline-block h-4.5 w-4.5 transform rounded-full bg-white shadow transition duration-200 ${
                                  form.include_last_process
                                    ? "translate-x-4.5"
                                    : "translate-x-0"
                                }`}
                              />
                            </button>
                            <span className="text-xs font-medium text-gray-700 dark:text-gray-300">
                              {form.include_last_process
                                ? "Tampilkan"
                                : "Kosongkan"}
                            </span>
                          </label>
                          <p className="font-mono text-[11px] text-gray-500 dark:text-gray-400">
                            {form.include_last_process
                              ? `"${SAMPLE_VALUES.last_process}"`
                              : '""'}
                          </p>
                        </div>
                      </td>

                      {/* 5. Aksi */}
                      <td className="px-5 py-5 text-center">
                        <div className="flex flex-col items-center gap-2">
                          {canSaveThis && (
                            <button
                              type="button"
                              onClick={() => handleSaveSingle(def)}
                              disabled={
                                !needsSave || isSavingThis || isSavingAll
                              }
                              className="w-full rounded-lg bg-brand-500 px-3.5 py-2 text-xs font-medium text-white transition-colors hover:bg-brand-600 disabled:cursor-not-allowed disabled:bg-gray-200 disabled:text-gray-400 dark:disabled:bg-gray-800 dark:disabled:text-gray-500"
                            >
                              {isSavingThis ? "Menyimpan..." : "Simpan"}
                            </button>
                          )}
                          <span
                            className={`text-[11px] font-medium ${
                              needsSave
                                ? "text-warning-600 dark:text-warning-400"
                                : "text-success-600 dark:text-success-400"
                            }`}
                          >
                            {needsSave ? "Belum disimpan" : "Tersimpan"}
                          </span>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
