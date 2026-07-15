"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import { Modal } from "@/components/ui/modal";
import { useToast } from "@/context/ToastContext";
import SerialNumberService, {
  SerialNumber,
  SerialNumberIssue,
} from "@/services/SerialNumberService";
import StockInReworkService from "@/services/StockInReworkService";

type StockInReworkModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
};

type IssueFormRow = {
  id: string;
  issueNumber: string;
  partName?: string;
  partNumber?: string;
  note: string;
  status: boolean;
};

const inputClassName =
  "h-10 w-full rounded-lg border border-gray-300 bg-transparent px-3 py-2 text-sm text-gray-800 outline-none focus:border-brand-300 focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90";

const getErrorMessage = (error: unknown, fallback: string) =>
  error instanceof Error ? error.message : fallback;

const mapIssueRows = (issues: SerialNumberIssue[]): IssueFormRow[] =>
  issues.map((issue, index) => ({
    id: `${issue.id}-${issue.number || index}`,
    issueNumber: issue.number,
    partName: issue.partName,
    partNumber: issue.partNumber,
    note: "",
    status: true,
  }));

type SerialNumberSelectProps = {
  disabled?: boolean;
  isOpen: boolean;
  onSelect: (serialNumberCode: string) => void;
  value: string;
};

function SerialNumberSearchSelect({
  disabled = false,
  isOpen,
  onSelect,
  value,
}: SerialNumberSelectProps) {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [search, setSearch] = useState("");
  const [options, setOptions] = useState<SerialNumber[]>([]);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen || disabled) return;

    const controller = new AbortController();
    const timer = globalThis.setTimeout(() => {
      setIsLoading(true);
      setError(null);

      SerialNumberService.getSerialNumbers(
        {
          limit: 50,
          page: 1,
          search,
        },
        {
          signal: controller.signal,
        }
      )
        .then((result) => {
          setOptions(result.data);
        })
        .catch((fetchError: unknown) => {
          if (
            fetchError instanceof DOMException &&
            fetchError.name === "AbortError"
          ) {
            return;
          }

          setError(
            fetchError instanceof Error
              ? fetchError.message
              : "Failed to load serial numbers"
          );
        })
        .finally(() => {
          if (!controller.signal.aborted) {
            setIsLoading(false);
          }
        });
    }, 250);

    return () => {
      globalThis.clearTimeout(timer);
      controller.abort();
    };
  }, [disabled, isOpen, search]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        wrapperRef.current &&
        !wrapperRef.current.contains(event.target as Node)
      ) {
        setIsDropdownOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSelect = (serialNumberCode: string) => {
    setSearch(serialNumberCode);
    onSelect(serialNumberCode);
    setIsDropdownOpen(false);
  };

  return (
    <div ref={wrapperRef} className="relative">
      <input
        aria-controls="stock-in-rework-serial-options"
        aria-expanded={isDropdownOpen}
        aria-haspopup="listbox"
        autoComplete="off"
        autoFocus
        className={inputClassName}
        disabled={disabled}
        onChange={(event) => {
          setSearch(event.target.value);
          onSelect("");
          setIsDropdownOpen(true);
        }}
        onFocus={() => setIsDropdownOpen(true)}
        placeholder="Search serial number"
        ref={inputRef}
        role="combobox"
        type="text"
        value={search}
      />

      {isDropdownOpen && (
        <div className="absolute left-0 top-full z-999 mt-1 w-full overflow-hidden rounded-lg border border-gray-200 bg-white shadow-theme-lg dark:border-gray-700 dark:bg-gray-900">
          <div
            className="max-h-64 overflow-y-auto py-1"
            id="stock-in-rework-serial-options"
            role="listbox"
          >
            {isLoading && (
              <p className="px-3 py-3 text-sm text-gray-500 dark:text-gray-400">
                Loading serial numbers...
              </p>
            )}

            {!isLoading && error && (
              <p className="px-3 py-3 text-sm text-error-600 dark:text-error-400">
                {error}
              </p>
            )}

            {!isLoading && !error && options.length === 0 && (
              <p className="px-3 py-3 text-sm text-gray-500 dark:text-gray-400">
                No serial numbers found
              </p>
            )}

            {!isLoading &&
              !error &&
              options.map((option) => (
                <button
                  className={`flex w-full flex-col px-3 py-2 text-left text-sm transition-colors hover:bg-gray-50 dark:hover:bg-white/[0.04] ${
                    option.serialNumberCode === value
                      ? "bg-brand-50 text-brand-600 dark:bg-brand-500/10 dark:text-brand-300"
                      : "text-gray-700 dark:text-gray-300"
                  }`}
                  key={option.id}
                  onClick={() => handleSelect(option.serialNumberCode)}
                  aria-selected={option.serialNumberCode === value}
                  role="option"
                  type="button"
                >
                  <span className="font-medium">
                    {option.serialNumberCode}
                  </span>
                  {option.type && (
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      {option.type}
                    </span>
                  )}
                </button>
              ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default function StockInReworkModal({
  isOpen,
  onClose,
  onSuccess,
}: StockInReworkModalProps) {
  const toast = useToast();
  const [serialNumberCode, setSerialNumberCode] = useState("");
  const [selectedSerialNumber, setSelectedSerialNumber] =
    useState<SerialNumber | null>(null);
  const [issueRows, setIssueRows] = useState<IssueFormRow[]>([]);
  const [isLoadingIssues, setIsLoadingIssues] = useState(false);
  const [issueLoadError, setIssueLoadError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!isOpen) return;

    setSerialNumberCode("");
    setSelectedSerialNumber(null);
    setIssueRows([]);
    setIsLoadingIssues(false);
    setIssueLoadError(null);
    setIsSubmitting(false);
  }, [isOpen]);

  useEffect(() => {
    const normalizedSerialNumberCode = serialNumberCode.trim();

    if (!isOpen || !normalizedSerialNumberCode) {
      setSelectedSerialNumber(null);
      setIssueRows([]);
      setIsLoadingIssues(false);
      setIssueLoadError(null);
      return;
    }

    const controller = new AbortController();
    setSelectedSerialNumber(null);
    setIssueRows([]);
    setIsLoadingIssues(true);
    setIssueLoadError(null);

    SerialNumberService.getSerialNumberByCode(normalizedSerialNumberCode, {
      signal: controller.signal,
    })
      .then((result) => {
        setSelectedSerialNumber(result.data);
        setIssueRows(mapIssueRows(result.data.issues ?? []));
      })
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === "AbortError") {
          return;
        }

        setIssueLoadError(
          getErrorMessage(error, "Failed to load serial number detail")
        );
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setIsLoadingIssues(false);
        }
      });

    return () => controller.abort();
  }, [isOpen, serialNumberCode]);

  const handleIssueChange = (
    id: string,
    field: "note" | "status",
    value: string | boolean
  ) => {
    setIssueRows((current) =>
      current.map((row) =>
        row.id === id
          ? {
              ...row,
              [field]: value,
            }
          : row
      )
    );
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();

    const normalizedSerialNumberCode = serialNumberCode.trim();
    const normalizedIssueRows = issueRows.map((row) => ({
      issueNumber: row.issueNumber.trim(),
      note: row.note.trim(),
      status: row.status,
    }));

    if (!normalizedSerialNumberCode) {
      toast.error({
        title: "Error",
        message: "Serial number is required",
      });
      return;
    }

    if (isLoadingIssues) {
      toast.error({
        title: "Error",
        message: "Please wait until issue numbers are loaded",
      });
      return;
    }

    if (issueLoadError) {
      toast.error({
        title: "Error",
        message: issueLoadError,
      });
      return;
    }

    if (!selectedSerialNumber || normalizedIssueRows.length === 0) {
      toast.error({
        title: "Error",
        message: "Issue numbers are not available for the selected serial number",
      });
      return;
    }

    if (normalizedIssueRows.some((row) => !row.issueNumber)) {
      toast.error({
        title: "Error",
        message: "Issue number is required",
      });
      return;
    }

    setIsSubmitting(true);
    try {
      await StockInReworkService.createStockInRework({
        serialNumberCode: normalizedSerialNumberCode,
        issueNumbers: normalizedIssueRows.map((row) => ({
          issueNumber: row.issueNumber,
          note: row.note || undefined,
          status: row.status,
        })),
      });

      toast.success({
        title: "Success",
        message: "Stock in rework created successfully",
      });
      onSuccess();
      onClose();
    } catch (error: unknown) {
      toast.error({
        title: "Error",
        message: getErrorMessage(error, "Failed to create stock in rework"),
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} className="max-w-[760px] p-6">
      <h3 className="mb-4 text-xl font-semibold text-gray-800 dark:text-white/90">
        Create Stock In Rework
      </h3>

      <form onSubmit={handleSubmit} className="flex flex-col gap-5">
        <div>
          <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
            Serial Number
          </label>
          <SerialNumberSearchSelect
            disabled={isSubmitting}
            isOpen={isOpen}
            key={isOpen ? "serial-select-open" : "serial-select-closed"}
            onSelect={setSerialNumberCode}
            value={serialNumberCode}
          />
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between gap-3">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Issue Numbers
            </label>
            {selectedSerialNumber && (
              <span className="text-xs font-medium text-gray-500 dark:text-gray-400">
                {issueRows.length} issue{issueRows.length === 1 ? "" : "s"}
              </span>
            )}
          </div>

          {!serialNumberCode && (
            <div className="rounded-lg border border-dashed border-gray-300 px-4 py-5 text-sm text-gray-500 dark:border-gray-700 dark:text-gray-400">
              Select a serial number to load its issue numbers.
            </div>
          )}

          {serialNumberCode && isLoadingIssues && (
            <div className="rounded-lg border border-gray-200 px-4 py-5 text-sm text-gray-500 dark:border-gray-800 dark:text-gray-400">
              Loading issue numbers...
            </div>
          )}

          {serialNumberCode && !isLoadingIssues && issueLoadError && (
            <div className="rounded-lg border border-error-200 bg-error-50 px-4 py-5 text-sm text-error-700 dark:border-error-500/30 dark:bg-error-500/10 dark:text-error-400">
              {issueLoadError}
            </div>
          )}

          {serialNumberCode &&
            !isLoadingIssues &&
            !issueLoadError &&
            issueRows.length === 0 && (
              <div className="rounded-lg border border-dashed border-gray-300 px-4 py-5 text-sm text-gray-500 dark:border-gray-700 dark:text-gray-400">
                No issue numbers found for this serial number.
              </div>
            )}

          {issueRows.length > 0 && (
            <div className="space-y-3">
              {issueRows.map((row, index) => (
                <div
                  className="grid gap-3 rounded-lg border border-gray-200 p-3 dark:border-gray-800 md:grid-cols-[1.2fr_1.2fr_120px_1fr]"
                  key={row.id}
                >
                  <div>
                    <label className="mb-1.5 block text-xs font-medium text-gray-500 dark:text-gray-400">
                      Issue Number
                    </label>
                    <div className="flex h-10 items-center rounded-lg border border-gray-200 bg-gray-50 px-3 text-sm font-medium text-gray-800 dark:border-gray-800 dark:bg-gray-900/60 dark:text-white/90">
                      {row.issueNumber}
                    </div>
                  </div>

                  <div>
                    <label className="mb-1.5 block text-xs font-medium text-gray-500 dark:text-gray-400">
                      Part
                    </label>
                    <div className="flex h-10 items-center rounded-lg border border-gray-200 bg-gray-50 px-3 text-sm text-gray-700 dark:border-gray-800 dark:bg-gray-900/60 dark:text-gray-300">
                      <span className="truncate" title={row.partName ?? "-"}>
                        {row.partName || row.partNumber || "-"}
                      </span>
                    </div>
                  </div>

                  <div>
                    <label className="mb-1.5 block text-xs font-medium text-gray-500 dark:text-gray-400">
                      Status
                    </label>
                    <select
                      className={inputClassName}
                      disabled={isSubmitting}
                      onChange={(event) =>
                        handleIssueChange(
                          row.id,
                          "status",
                          event.target.value === "true"
                        )
                      }
                      value={String(row.status)}
                    >
                      <option value="true">OK</option>
                      <option value="false">NG</option>
                    </select>
                  </div>

                  <div>
                    <label className="mb-1.5 block text-xs font-medium text-gray-500 dark:text-gray-400">
                      Note
                    </label>
                    <input
                      className={inputClassName}
                      disabled={isSubmitting}
                      onChange={(event) =>
                        handleIssueChange(row.id, "note", event.target.value)
                      }
                      placeholder="Optional note"
                      type="text"
                      value={row.note}
                    />
                  </div>

                  <span className="sr-only">Issue row {index + 1}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="flex justify-end gap-3">
          <button
            className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
            disabled={isSubmitting}
            onClick={onClose}
            type="button"
          >
            Cancel
          </button>
          <button
            className="rounded-lg bg-brand-500 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-brand-600 focus:outline-none focus:ring-2 focus:ring-brand-500/50 disabled:opacity-50"
            disabled={isSubmitting}
            type="submit"
          >
            {isSubmitting ? "Saving..." : "Save"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
