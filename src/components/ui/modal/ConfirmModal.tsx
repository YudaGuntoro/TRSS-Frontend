import React from "react";
import { Modal } from "./index";
import { AlertIcon } from "@/icons";

interface ConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  isDestructive?: boolean;
  isLoading?: boolean;
}

export const ConfirmModal: React.FC<ConfirmModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = "Confirm",
  cancelText = "Cancel",
  isDestructive = false,
  isLoading = false,
}) => {
  return (
    <Modal isOpen={isOpen} onClose={onClose} className="max-w-[400px] p-6" showCloseButton={false}>
      <div className="flex flex-col items-center justify-center text-center gap-4">
        <div
          className={`flex h-12 w-12 items-center justify-center rounded-full ${
            isDestructive
              ? "bg-error-100 text-error-600 dark:bg-error-500/20 dark:text-error-500"
              : "bg-warning-100 text-warning-600 dark:bg-warning-500/20 dark:text-warning-500"
          }`}
        >
          <AlertIcon className="h-6 w-6 fill-current" />
        </div>
        <div>
          <h3 className="mb-2 text-xl font-bold text-gray-800 dark:text-white/90">
            {title}
          </h3>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {message}
          </p>
        </div>
        <div className="mt-4 flex w-full justify-center gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={isLoading}
            className="flex-1 rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800 transition-colors"
          >
            {cancelText}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isLoading}
            className={`flex-1 rounded-lg px-4 py-2 text-sm font-medium text-white transition-colors disabled:opacity-50 ${
              isDestructive
                ? "bg-error-500 hover:bg-error-600 focus:ring-error-500/50"
                : "bg-brand-500 hover:bg-brand-600 focus:ring-brand-500/50"
            }`}
          >
            {isLoading ? "Loading..." : confirmText}
          </button>
        </div>
      </div>
    </Modal>
  );
};
