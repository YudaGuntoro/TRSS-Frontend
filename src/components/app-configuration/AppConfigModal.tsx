"use client";

import { Modal } from "@/components/ui/modal";
import { useToast } from "@/context/ToastContext";
import AppConfigService, {
  AppConfig,
  CreateAppConfigPayload,
  UpdateAppConfigPayload,
} from "@/services/AppConfigService";
import { useEffect, useState } from "react";

type AppConfigModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  appConfig: AppConfig | null;
};

type AppConfigFormData = {
  key: string;
  value: string;
  description: string;
};

const initialFormData: AppConfigFormData = {
  key: "",
  value: "",
  description: "",
};

const normalizeKey = (value: string) =>
  value
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9_]+/g, "_")
    .replace(/^_+|_+$/g, "");

const getErrorMessage = (error: unknown, fallback: string) =>
  error instanceof Error ? error.message : fallback;

export default function AppConfigModal({
  isOpen,
  onClose,
  onSuccess,
  appConfig,
}: AppConfigModalProps) {
  const toast = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] =
    useState<AppConfigFormData>(initialFormData);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    if (appConfig) {
      setFormData({
        key: appConfig.key,
        value: appConfig.value,
        description: appConfig.description ?? "",
      });
      return;
    }

    setFormData(initialFormData);
  }, [appConfig, isOpen]);

  const handleChange = (
    event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = event.target;
    setFormData((current) => ({ ...current, [name]: value }));
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const value = formData.value.trim();
    const description = formData.description.trim() || undefined;

    if (!value) {
      toast.error({
        title: "Validation Error",
        message: "Value is required.",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      if (appConfig) {
        const payload: UpdateAppConfigPayload = { value, description };
        await AppConfigService.updateAppConfig(appConfig.id, payload);
        toast.success({
          title: "Success",
          message: "App configuration updated successfully.",
        });
      } else {
        const key = normalizeKey(formData.key);

        if (!key) {
          toast.error({
            title: "Validation Error",
            message: "Key is required.",
          });
          return;
        }

        const payload: CreateAppConfigPayload = {
          key,
          value,
          description,
        };
        await AppConfigService.createAppConfig(payload);
        toast.success({
          title: "Success",
          message: "App configuration created successfully.",
        });
      }

      onSuccess();
      onClose();
    } catch (error: unknown) {
      toast.error({
        title: "Error",
        message: getErrorMessage(
          error,
          `Failed to ${appConfig ? "update" : "create"} app configuration.`
        ),
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} className="max-w-[600px] p-6">
      <div className="pr-12">
        <h3 className="text-xl font-semibold text-gray-800 dark:text-white/90">
          {appConfig
            ? "Update App Configuration"
            : "Create App Configuration"}
        </h3>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          {appConfig
            ? "Key cannot be changed after the configuration is created."
            : "Use a unique uppercase key to identify this setting."}
        </p>
      </div>

      <form className="mt-6 flex flex-col gap-5" onSubmit={handleSubmit}>
        <div>
          <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
            Key
          </label>
          <input
            className="h-11 w-full rounded-lg border border-gray-300 bg-transparent px-3 py-2 font-mono text-sm text-gray-800 outline-none placeholder:font-sans placeholder:text-gray-400 focus:border-brand-300 focus:ring-3 focus:ring-brand-500/10 disabled:cursor-not-allowed disabled:bg-gray-100 disabled:text-gray-500 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 dark:disabled:bg-gray-800"
            disabled={Boolean(appConfig)}
            name="key"
            onChange={handleChange}
            placeholder="EXAMPLE_CONFIGURATION_KEY"
            required
            type="text"
            value={formData.key}
          />
          {!appConfig && (
            <p className="mt-1.5 text-xs text-gray-500 dark:text-gray-400">
              Spaces and symbols are automatically converted to underscores.
            </p>
          )}
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
            Value
          </label>
          <textarea
            className="min-h-28 w-full resize-y rounded-lg border border-gray-300 bg-transparent px-3 py-2 text-sm text-gray-800 outline-none placeholder:text-gray-400 focus:border-brand-300 focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
            name="value"
            onChange={handleChange}
            placeholder="Enter configuration value"
            required
            rows={4}
            value={formData.value}
          />
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
            Description
          </label>
          <textarea
            className="min-h-24 w-full resize-y rounded-lg border border-gray-300 bg-transparent px-3 py-2 text-sm text-gray-800 outline-none placeholder:text-gray-400 focus:border-brand-300 focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
            name="description"
            onChange={handleChange}
            placeholder="Explain what this configuration controls"
            rows={3}
            value={formData.description}
          />
        </div>

        <div className="mt-2 flex justify-end gap-3">
          <button
            className="rounded-lg border border-gray-300 px-4 py-2.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 disabled:opacity-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
            disabled={isSubmitting}
            onClick={onClose}
            type="button"
          >
            Cancel
          </button>
          <button
            className="rounded-lg bg-brand-500 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-brand-600 disabled:cursor-not-allowed disabled:opacity-50"
            disabled={isSubmitting}
            type="submit"
          >
            {isSubmitting ? "Saving..." : "Save Configuration"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
