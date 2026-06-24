"use client";

import CreateButton from "@/components/common/CreateButton";
import DataTable, { DataTableColumn } from "@/components/common/DataTable";
import { ConfirmModal } from "@/components/ui/modal";
import { useToast } from "@/context/ToastContext";
import { useAppConfigs } from "@/hooks/useAppConfigs";
import { PencilIcon, TrashBinIcon } from "@/icons";
import AppConfigService, {
  AppConfig,
} from "@/services/AppConfigService";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import AppConfigModal from "./AppConfigModal";

const dateFormatter = new Intl.DateTimeFormat("en-GB", {
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  month: "short",
  year: "numeric",
});

const formatDate = (value?: string) => {
  if (!value) {
    return "-";
  }

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "-" : dateFormatter.format(date);
};

const getErrorMessage = (error: unknown, fallback: string) =>
  error instanceof Error ? error.message : fallback;

const baseColumns: DataTableColumn<AppConfig>[] = [
  {
    key: "key",
    header: "Key",
    className: "min-w-64",
    render: (value) => (
      <code className="rounded-md bg-gray-100 px-2 py-1 text-xs font-semibold text-gray-700 dark:bg-white/[0.06] dark:text-gray-300">
        {typeof value === "string" ? value : "-"}
      </code>
    ),
  },
  {
    key: "value",
    header: "Value",
    className: "min-w-64 max-w-md",
    render: (value) => (
      <div
        className="line-clamp-2 break-all text-gray-800 dark:text-white/90"
        title={typeof value === "string" ? value : ""}
      >
        {typeof value === "string" ? value : "-"}
      </div>
    ),
  },
  {
    key: "description",
    header: "Description",
    className: "min-w-72 max-w-lg",
    render: (value) => (
      <div className="line-clamp-2">
        {typeof value === "string" && value ? value : "-"}
      </div>
    ),
  },
  {
    key: "updatedAt",
    header: "Last Updated",
    className: "min-w-40",
    render: (value, row) =>
      formatDate(typeof value === "string" ? value : row.createdAt),
  },
];

export default function AppConfigTable() {
  const toast = useToast();
  const lastErrorRef = useRef<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedConfig, setSelectedConfig] = useState<AppConfig | null>(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [configToDelete, setConfigToDelete] = useState<AppConfig | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const {
    data,
    error,
    isLoading,
    pagination,
    query,
    refetch,
    setLimit,
    setPage,
    setSearch,
  } = useAppConfigs({
    limit: 10,
    page: 1,
  });

  useEffect(() => {
    if (!error || lastErrorRef.current === error) {
      return;
    }

    lastErrorRef.current = error;
    toast.error({
      title: "Failed to load app configurations",
      message: error,
    });
  }, [error, toast]);

  const handleCreate = () => {
    setSelectedConfig(null);
    setIsModalOpen(true);
  };

  const handleUpdate = useCallback((appConfig: AppConfig) => {
    setSelectedConfig(appConfig);
    setIsModalOpen(true);
  }, []);

  const handleDelete = useCallback((appConfig: AppConfig) => {
    setConfigToDelete(appConfig);
    setIsDeleteModalOpen(true);
  }, []);

  const confirmDelete = async () => {
    if (!configToDelete) {
      return;
    }

    setIsDeleting(true);

    try {
      await AppConfigService.deleteAppConfig(configToDelete.id);
      toast.success({
        title: "Success",
        message: "App configuration deleted successfully.",
      });
      setIsDeleteModalOpen(false);
      setConfigToDelete(null);
      refetch();
    } catch (deleteError: unknown) {
      toast.error({
        title: "Error",
        message: getErrorMessage(
          deleteError,
          "Failed to delete app configuration."
        ),
      });
    } finally {
      setIsDeleting(false);
    }
  };

  const columns = useMemo<DataTableColumn<AppConfig>[]>(
    () => [
      ...baseColumns,
      {
        key: "action",
        header: "Action",
        align: "center",
        className: "min-w-28",
        render: (_, row) => (
          <div className="flex items-center justify-center gap-3">
            <button
              className="text-warning-500 transition-colors hover:text-warning-600 dark:text-warning-400 dark:hover:text-warning-500"
              onClick={() => handleUpdate(row)}
              title="Edit configuration"
              type="button"
            >
              <PencilIcon className="size-5 fill-current" />
            </button>
            <button
              className="text-error-500 transition-colors hover:text-error-600 dark:text-error-400 dark:hover:text-error-500"
              onClick={() => handleDelete(row)}
              title="Delete configuration"
              type="button"
            >
              <TrashBinIcon className="size-5 fill-current" />
            </button>
          </div>
        ),
      },
    ],
    [handleDelete, handleUpdate]
  );

  return (
    <>
      <DataTable
        actions={
          <CreateButton onClick={handleCreate}>
            Create Configuration
          </CreateButton>
        }
        columns={columns}
        data={data}
        emptyMessage="No app configurations found"
        error={error}
        isLoading={isLoading}
        minWidth="1040px"
        onLimitChange={setLimit}
        onPageChange={setPage}
        onSearchChange={setSearch}
        pagination={pagination}
        rowKey="id"
        searchPlaceholder="Search key or description"
        searchValue={query.search}
      />

      <AppConfigModal
        appConfig={selectedConfig}
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={refetch}
      />

      <ConfirmModal
        confirmText="Delete"
        isDestructive
        isLoading={isDeleting}
        isOpen={isDeleteModalOpen}
        message={`Are you sure you want to delete configuration "${configToDelete?.key}"?`}
        onClose={() => !isDeleting && setIsDeleteModalOpen(false)}
        onConfirm={confirmDelete}
        title="Delete App Configuration"
      />
    </>
  );
}
