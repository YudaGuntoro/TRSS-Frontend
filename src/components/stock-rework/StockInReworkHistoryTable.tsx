"use client";

import { formatShortDateTime as formatDate } from "@/utils/formatDateTime";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import DataTable, { DataTableColumn } from "@/components/common/DataTable";
import { ConfirmModal, Modal } from "@/components/ui/modal";
import { useToast } from "@/context/ToastContext";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { useStockInReworks } from "@/hooks/useStockInReworks";
import StockInReworkService, {
  StockInRework,
  StockInReworkDisposition,
  StockInReworkFinalDisposition,
} from "@/services/StockInReworkService";


const filterInputClassName =
  "h-10 w-[280px] max-w-full rounded-lg border border-gray-300 bg-transparent px-3 py-2 text-sm text-gray-800 outline-none focus:border-brand-300 focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90";

const filterSelectClassName =
  "h-10 rounded-lg border border-gray-300 bg-transparent px-3 py-2 text-sm text-gray-800 outline-none focus:border-brand-300 focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90";

const formatDisposition = (value?: string) =>
  value ? value.replaceAll("_", " ") : "-";

const getDispositionClassName = (value?: string) => {
  if (value === "STOCK_IN") {
    return "bg-success-50 text-success-700 dark:bg-success-500/15 dark:text-success-400";
  }

  if (value === "SCRAP") {
    return "bg-error-50 text-error-700 dark:bg-error-500/15 dark:text-error-400";
  }

  return "bg-warning-50 text-warning-600 dark:bg-warning-500/15 dark:text-warning-400";
};

const isFinalDisposition = (
  value?: StockInReworkDisposition | string | null
): value is StockInReworkFinalDisposition =>
  value === "STOCK_IN" || value === "SCRAP";

const DISPOSITION_OPTIONS: {
  value: StockInReworkFinalDisposition;
  label: string;
  description: string;
  activeClassName: string;
  badgeClassName: string;
}[] = [
  {
    value: "STOCK_IN",
    label: "Stock In",
    description: "Kembalikan item hasil rework ke Stock In",
    activeClassName:
      "border-success-500 bg-success-50/70 dark:border-success-400 dark:bg-success-500/10",
    badgeClassName:
      "bg-success-500 text-white",
  },
  {
    value: "SCRAP",
    label: "Scrap (Rusak)",
    description: "Tandai item sebagai barang rusak / Scrap",
    activeClassName:
      "border-error-500 bg-error-50/70 dark:border-error-400 dark:bg-error-500/10",
    badgeClassName:
      "bg-error-500 text-white",
  },
];

export default function StockInReworkHistoryTable({ includePending = false }: { includePending?: boolean }) {
  const toast = useToast();
  const lastErrorRef = useRef<string | null>(null);
  const [serialNumberSearch, setSerialNumberSearch] = useState("");
  const [selectedRow, setSelectedRow] = useState<StockInRework | null>(null);
  const [selectedDisposition, setSelectedDisposition] = useState<
    StockInReworkFinalDisposition | ""
  >("");
  const [isConfirming, setIsConfirming] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const debouncedSerialNumberSearch = useDebouncedValue(
    serialNumberSearch.trim(),
    500
  );

  const {
    data,
    error,
    isLoading,
    pagination,
    query,
    refetch,
    setLimit,
    setPage,
    setQuery,
  } = useStockInReworks({
    disposition: "",
    includeAllDispositions: !includePending,
    limit: 10,
    page: 1,
  });

  useEffect(() => {
    if (debouncedSerialNumberSearch === query.serialNumberCode) {
      return;
    }

    setQuery({ serialNumberCode: debouncedSerialNumberSearch });
  }, [debouncedSerialNumberSearch, query.serialNumberCode, setQuery]);

  useEffect(() => {
    if (!error || lastErrorRef.current === error) {
      return;
    }

    lastErrorRef.current = error;
    toast.error({
      message: error,
      title: "Failed to load stock in rework history",
    });
  }, [error, toast]);

  const handleOpenForwardModal = useCallback((row: StockInRework) => {
    setSelectedRow(row);
    setSelectedDisposition("");
    setIsConfirming(false);
  }, []);

  const handleCloseForwardModal = useCallback(() => {
    if (isSubmitting) {
      return;
    }

    setSelectedRow(null);
    setSelectedDisposition("");
    setIsConfirming(false);
  }, [isSubmitting]);

  const handleConfirmForward = useCallback(async () => {
    if (!selectedRow || !selectedDisposition || isSubmitting) {
      return;
    }

    setIsSubmitting(true);
    try {
      await StockInReworkService.updateStockInReworkDisposition(selectedRow.id, {
        disposition: selectedDisposition,
      });

      toast.success({
        title: "Berhasil",
        message:
          selectedDisposition === "STOCK_IN"
            ? "Data rework berhasil diteruskan ke Stock In"
            : "Data rework berhasil diteruskan ke Scrap (Rusak)",
      });
      setSelectedRow(null);
      setSelectedDisposition("");
      setIsConfirming(false);
      refetch();
    } catch (err: unknown) {
      toast.error({
        title: "Error",
        message:
          err instanceof Error
            ? err.message
            : "Gagal meneruskan data rework",
      });
    } finally {
      setIsSubmitting(false);
    }
  }, [isSubmitting, refetch, selectedDisposition, selectedRow, toast]);

  const columns = useMemo<DataTableColumn<StockInRework>[]>(
    () => [
      {
        key: "serialNumberCode",
        header: "Serial Number",
        width: "13%",
        render: (value) => (typeof value === "string" && value ? value : "-"),
      },
      {
        key: "issueNumberBefore",
        header: "Issue Before",
        width: "11%",
      },
      {
        key: "issueNumberAfter",
        header: "Issue After",
        width: "11%",
        render: (value, row) =>
          row.disposition === "SCRAP"
            ? "-"
            : typeof value === "string" && value
              ? value
              : "-",
      },
      {
        key: "count",
        header: "Jumlah Rework",
        accessor: (row) => row.count ?? row.qty,
        align: "right",
        width: "7%",
      },
      {
        key: "status",
        header: "Status",
        align: "center",
        width: "7%",
        render: (value) => {
          const isOk = Boolean(value);

          return (
            <span
              className={`inline-flex min-w-14 justify-center rounded-full px-2.5 py-1 text-xs font-semibold ${
                isOk
                  ? "bg-success-50 text-success-700 dark:bg-success-500/15 dark:text-success-400"
                  : "bg-error-50 text-error-700 dark:bg-error-500/15 dark:text-error-400"
              }`}
            >
              {isOk ? "OK" : "NG"}
            </span>
          );
        },
      },
      {
        key: "disposition",
        header: "Disposition",
        align: "center",
        width: "10%",
        render: (value) => {
          const disposition =
            typeof value === "string" && value ? value : undefined;

          return (
            <span
              className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${getDispositionClassName(
                disposition
              )}`}
            >
              {formatDisposition(disposition)}
            </span>
          );
        },
      },
      {
        key: "note",
        header: "Note",
        width: "10%",
        render: (value) => (typeof value === "string" && value ? value : "-"),
      },
      {
        key: "createdAt",
        header: "Created At",
        width: "10%",
        render: (value) => (typeof value === "string" ? formatDate(value) : "-"),
      },
      {
        key: "updatedAt",
        header: "Updated At",
        width: "10%",
        render: (value) => (typeof value === "string" ? formatDate(value) : "-"),
      },
      {
        key: "action",
        header: "Action",
        align: "center",
        width: "11%",
        render: (_value, row) => {
          const isFinal = isFinalDisposition(row.disposition);

          return (
            <button
              type="button"
              disabled={isFinal}
              onClick={() => handleOpenForwardModal(row)}
              className={`inline-flex items-center justify-center whitespace-nowrap rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
                isFinal
                  ? "cursor-not-allowed bg-gray-100 text-gray-400 dark:bg-gray-800 dark:text-gray-600"
                  : "bg-brand-500 text-white hover:bg-brand-600"
              }`}
            >
              {isFinal ? "Completed" : "Set Disposition"}
            </button>
          );
        },
      },
    ],
    [handleOpenForwardModal]
  );

  const historyData = useMemo(
    () => includePending ? data : data.filter((item) => isFinalDisposition(item.disposition)),
    [data, includePending]
  );

  const reworkIssueNumber = useMemo(() => {
    if (!selectedRow) {
      return "";
    }

    if (
      selectedRow.issueNumberAfter &&
      selectedRow.issueNumberAfter.toUpperCase().endsWith("-R")
    ) {
      return selectedRow.issueNumberAfter;
    }

    return `${selectedRow.issueNumberBefore}-R`;
  }, [selectedRow]);

  return (
    <>
      <DataTable
        title={includePending ? `Hasil Rework — ${pagination?.total ?? 0} Issue Number` : undefined}
        actions={
          <div className="flex flex-wrap items-center gap-3">
            <input
              className={filterInputClassName}
              onChange={(event) => setSerialNumberSearch(event.target.value)}
              aria-label="Cari serial number lengkap"
              placeholder="Cari serial number lengkap"
              type="text"
              value={serialNumberSearch}
            />

            <select
              className={filterSelectClassName}
              onChange={(event) =>
                setQuery({
                  disposition: event.target
                    .value as StockInReworkFinalDisposition | "ALL" | "",
                })
              }
              value={query.disposition}
            >
              {includePending && <option value="">Pending</option>}
              <option value={includePending ? "ALL" : ""}>All Dispositions</option>
              <option value="STOCK_IN">Stock In</option>
              <option value="SCRAP">Scrap</option>
            </select>
          </div>
        }
        columns={columns}
        data={historyData}
        emptyMessage="No stock in rework history found"
        error={error}
        isLoading={isLoading}
        minWidth="1280px"
        onLimitChange={setLimit}
        onPageChange={setPage}
        pagination={pagination}
        rowKey="id"
      />

      <Modal
        isOpen={Boolean(selectedRow) && !isConfirming}
        onClose={handleCloseForwardModal}
        className="max-w-[500px] max-h-[90vh] overflow-y-auto p-6"
        showCloseButton={!isSubmitting}
      >
        {selectedRow ? (
          <div className="space-y-5">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white/90">
                Teruskan Hasil Rework
              </h3>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                Pilih tujuan tindak lanjut untuk item hasil rework berikut.
              </p>
            </div>

            <div className="rounded-xl border border-gray-200 bg-gray-50 p-3.5 text-sm dark:border-gray-800 dark:bg-gray-800/50">
              <div className="grid grid-cols-2 gap-x-4 gap-y-2">
                <div>
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    Serial Number
                  </span>
                  <p className="font-medium text-gray-900 dark:text-white/90">
                    {selectedRow.serialNumberCode || "-"}
                  </p>
                </div>
                <div>
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    Jumlah Rework
                  </span>
                  <p className="font-medium text-gray-900 dark:text-white/90">
                    {selectedRow.count ?? selectedRow.qty}
                  </p>
                </div>
                <div>
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    Issue Number
                  </span>
                  <p className="font-medium text-gray-900 dark:text-white/90">
                    {selectedRow.issueNumberBefore || "-"}
                  </p>
                </div>
                <div>
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    Status
                  </span>
                  <div className="mt-0.5">
                    <span
                      className={`inline-flex min-w-12 justify-center rounded-full px-2 py-0.5 text-xs font-semibold ${
                        selectedRow.status
                          ? "bg-success-50 text-success-700 dark:bg-success-500/15 dark:text-success-400"
                          : "bg-error-50 text-error-700 dark:bg-error-500/15 dark:text-error-400"
                      }`}
                    >
                      {selectedRow.status ? "OK" : "NG"}
                    </span>
                  </div>
                </div>
                {selectedDisposition === "STOCK_IN" ? (
                  <div className="col-span-2">
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      Issue Baru (-R)
                    </span>
                    <p className="font-mono font-semibold text-success-700 dark:text-success-400">
                      {reworkIssueNumber}
                    </p>
                  </div>
                ) : null}
              </div>
            </div>

            <div className="space-y-2.5">
              <p className="text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">
                Pilih Tujuan
              </p>
              <div className="grid grid-cols-1 gap-3">
                {DISPOSITION_OPTIONS.map((option) => {
                  const isSelected = selectedDisposition === option.value;

                  return (
                    <button
                      key={option.value}
                      type="button"
                      disabled={isSubmitting}
                      onClick={() => {
                        setSelectedDisposition(option.value);
                        setIsConfirming(false);
                      }}
                      className={`flex w-full items-start justify-between rounded-xl border p-3.5 text-left transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${
                        isSelected
                          ? option.activeClassName
                          : "border-gray-200 bg-white hover:border-gray-300 dark:border-gray-800 dark:bg-gray-900 dark:hover:border-gray-700"
                      }`}
                    >
                      <div>
                        <p className="text-sm font-semibold text-gray-900 dark:text-white/90">
                          {option.label}
                        </p>
                        <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
                          {option.description}
                        </p>
                      </div>
                      <span
                        className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border text-xs font-bold ${
                          isSelected
                            ? `${option.badgeClassName} border-transparent`
                            : "border-gray-300 dark:border-gray-600"
                        }`}
                      >
                        {isSelected ? "✓" : null}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {selectedDisposition === "STOCK_IN" ? (
              <div className="rounded-xl border border-success-200 bg-success-50/70 p-3.5 text-xs text-success-800 dark:border-success-500/30 dark:bg-success-500/10 dark:text-success-300">
                <p className="font-semibold">Proses jika memilih Stock In:</p>
                <ul className="mt-1.5 list-disc space-y-1 pl-4">
                  <li>
                    Item diteruskan ke <strong>Stock In</strong> dengan Issue Number baru{" "}
                    <strong className="font-mono">{reworkIssueNumber}</strong>.
                  </li>
                  <li>
                    Membuat data Stock In baru dengan <strong>Supply Qty = 1</strong> &amp;{" "}
                    <strong>Receipt Qty = 1</strong> (atau menambah <strong>+1</strong> pada Supply &amp; Receipt Qty jika Issue{" "}
                    <span className="font-mono">{reworkIssueNumber}</span> sudah ada).
                  </li>
                  <li>
                    Sistem akan <strong>otomatis mencetak (auto-print)</strong> label Stock In{" "}
                    <span className="font-mono">{reworkIssueNumber}</span>.
                  </li>
                </ul>
              </div>
            ) : null}

            {selectedDisposition === "SCRAP" ? (
              <div className="rounded-xl border border-error-200 bg-error-50/70 p-3.5 text-xs text-error-800 dark:border-error-500/30 dark:bg-error-500/10 dark:text-error-300">
                <p className="font-semibold">Proses jika memilih Scrap (Rusak):</p>
                <ul className="mt-1.5 list-disc space-y-1 pl-4">
                  <li>
                    Item dengan Issue Number{" "}
                    <strong className="font-mono">{selectedRow.issueNumberBefore}</strong> akan ditandai sebagai{" "}
                    <strong>Scrap (Barang Rusak)</strong>.
                  </li>
                  <li>
                    <strong>Tidak</strong> membuat Issue Number <span className="font-mono">-R</span> dan{" "}
                    <strong>tidak</strong> menambah stok ke Stock In.
                  </li>
                  <li>
                    <strong>Tidak</strong> mencetak label.
                  </li>
                </ul>
              </div>
            ) : null}

            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                disabled={isSubmitting}
                onClick={handleCloseForwardModal}
                className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
              >
                Batal
              </button>
              <button
                type="button"
                disabled={!selectedDisposition || isSubmitting}
                onClick={() => setIsConfirming(true)}
                className="rounded-lg bg-brand-500 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-brand-600 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Teruskan
              </button>
            </div>
          </div>
        ) : null}
      </Modal>

      <ConfirmModal
        isOpen={Boolean(selectedRow) && isConfirming}
        onClose={() => {
          if (!isSubmitting) {
            setIsConfirming(false);
          }
        }}
        onConfirm={() => {
          void handleConfirmForward();
        }}
        title="Konfirmasi Tindakan"
        message={
          selectedRow
            ? `Apakah Anda yakin ingin meneruskan item ${selectedRow.serialNumberCode || selectedRow.issueNumberBefore} ke ${
                selectedDisposition === "STOCK_IN"
                  ? `Stock In (${reworkIssueNumber})`
                  : "Scrap (Rusak)"
              }? Disposisi yang sudah disimpan tidak dapat diubah kembali.`
            : ""
        }
        confirmText={
          selectedDisposition === "STOCK_IN"
            ? "Ya, Teruskan ke Stock In"
            : "Ya, Tandai Scrap"
        }
        cancelText="Kembali"
        isDestructive={selectedDisposition === "SCRAP"}
        isLoading={isSubmitting}
      />
    </>
  );
}
