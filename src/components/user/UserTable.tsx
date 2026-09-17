"use client";

import { formatShortDateTime as formatDate } from "@/utils/formatDateTime";
import { useCallback, useEffect, useRef, useState } from "react";
import Badge from "@/components/ui/badge/Badge";
import CreateButton from "@/components/common/CreateButton";
import { ConfirmModal } from "@/components/ui/modal";
import { useToast } from "@/context/ToastContext";
import { PencilIcon, TrashBinIcon } from "@/icons";
import { useUsers } from "@/hooks/useUsers";
import UserService, { User } from "@/services/UserService";
import UserModal from "./UserModal";
import { useAuth } from "@/context/AuthContext";
import { PERMISSIONS, ROLE_OPTIONS } from "@/utils/auth";


const getErrorMessage = (error: unknown, fallback: string) =>
  error instanceof Error ? error.message : fallback;

const getInitials = (name: string) => {
  const initials = name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0])
    .join("");

  return initials.toUpperCase() || "U";
};

const formatRole = (role: string) => {
  const option = ROLE_OPTIONS.find((item) => item.value === role);

  if (option) {
    return option.label;
  }

  return role || "-";
};

const getPageNumbers = (currentPage: number, totalPage: number) => {
  const pageNumbers: number[] = [];
  const start = Math.max(1, currentPage - 1);
  const end = Math.min(totalPage, currentPage + 1);

  for (let page = start; page <= end; page += 1) {
    pageNumbers.push(page);
  }

  return pageNumbers;
};

export default function UserTable() {
  const toast = useToast();
  const { can } = useAuth();
  const canCreate = can(PERMISSIONS.USERS_CREATE);
  const canEdit = can(PERMISSIONS.USERS_EDIT);
  const canDelete = can(PERMISSIONS.USERS_DELETE);
  const lastErrorRef = useRef<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState<User | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const {
    data,
    error,
    isLoading,
    pagination,
    query,
    refetch,
    setIsActive,
    setLimit,
    setPage,
    setSearch,
  } = useUsers({
    limit: 10,
    page: 1,
  });
  const currentPage = pagination?.page ?? query.page;
  const currentLimit = pagination?.limit ?? query.limit;
  const totalPage = pagination?.totalPage ?? 1;
  const total = pagination?.total ?? data.length;
  const firstItem = data.length > 0 ? (currentPage - 1) * currentLimit + 1 : 0;
  const lastItem = data.length > 0 ? firstItem + data.length - 1 : 0;
  const pageNumbers = getPageNumbers(currentPage, totalPage);

  useEffect(() => {
    if (!error || lastErrorRef.current === error) {
      return;
    }

    lastErrorRef.current = error;
    toast.error({
      message: error,
      title: "Failed to load users",
    });
  }, [error, toast]);

  const handleCreate = () => {
    setSelectedUser(null);
    setIsModalOpen(true);
  };

  const handleUpdate = useCallback((user: User) => {
    setSelectedUser(user);
    setIsModalOpen(true);
  }, []);

  const handleDeleteClick = useCallback((user: User) => {
    setUserToDelete(user);
    setIsDeleteModalOpen(true);
  }, []);

  const closeDeleteModal = () => {
    if (!isDeleting) {
      setIsDeleteModalOpen(false);
    }
  };

  const confirmDelete = async () => {
    if (!userToDelete) {
      return;
    }

    setIsDeleting(true);
    try {
      await UserService.deleteUser(userToDelete.id);
      toast.success({
        title: "Success",
        message: "User deleted successfully",
      });
      refetch();
      setIsDeleteModalOpen(false);
      setUserToDelete(null);
    } catch (error: unknown) {
      toast.error({
        title: "Error",
        message: getErrorMessage(error, "Failed to delete user"),
      });
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <>
      <div className="mx-3 my-4 overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-white/[0.05] dark:bg-white/[0.03] sm:mx-4">
        <div className="border-b border-gray-100 px-4 py-4 dark:border-white/[0.05] sm:px-5">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:flex lg:flex-wrap lg:items-center">
              <label className="flex min-w-0 items-center gap-2 text-sm text-gray-700 dark:text-gray-300 sm:col-span-2 lg:col-span-1">
                <span className="shrink-0">Show</span>
                <select
                  className="h-10 w-24 rounded-lg border border-gray-300 bg-transparent px-3 py-2 text-sm text-gray-800 outline-none focus:border-brand-300 focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
                  onChange={(event) => setLimit(Number(event.target.value))}
                  value={currentLimit}
                >
                  {[10, 25, 50, 100].map((limit) => (
                    <option key={limit} value={limit}>
                      {limit}
                    </option>
                  ))}
                </select>
                <span className="shrink-0">entries</span>
              </label>

            <select
              className="h-10 w-full rounded-lg border border-gray-300 bg-transparent px-3 py-2 text-sm font-medium text-gray-800 outline-none focus:border-brand-300 focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 lg:w-auto"
              value={
                query.isActive === undefined || query.isActive === null
                  ? "all"
                  : String(query.isActive)
              }
              onChange={(event) => {
                const value = event.target.value;
                setIsActive(value === "all" ? null : value === "true");
              }}
            >
              <option value="all">All Status</option>
              <option value="true">Active</option>
              <option value="false">Inactive</option>
            </select>

            {canCreate && (
              <div className="lg:col-span-1">
                <CreateButton onClick={handleCreate}>Create User</CreateButton>
              </div>
            )}
          </div>

            <label className="flex min-w-0 flex-col gap-1.5 text-sm text-gray-700 dark:text-gray-300 sm:flex-row sm:items-center sm:gap-2">
              <span className="shrink-0">Search</span>
              <input
                className="h-10 w-full rounded-lg border border-gray-300 bg-transparent px-3 py-2 text-sm text-gray-800 outline-none placeholder:text-gray-400 focus:border-brand-300 focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 lg:w-72"
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search users"
                value={query.search}
              />
            </label>
          </div>
        </div>

        <div className="space-y-3 p-3 md:hidden">
          {isLoading &&
            data.length === 0 &&
            Array.from({ length: 4 }).map((_, index) => (
              <div
                className="h-32 animate-pulse rounded-lg bg-gray-100 dark:bg-white/[0.05]"
                key={index}
              />
            ))}

          {!isLoading &&
            !error &&
            data.map((user) => (
              <UserMobileCard
                canDelete={canDelete}
                canEdit={canEdit}
                key={user.id}
                onDelete={() => handleDeleteClick(user)}
                onEdit={() => handleUpdate(user)}
                user={user}
              />
            ))}

          {!isLoading && error && (
            <div className="rounded-lg border border-error-100 bg-error-50 px-4 py-10 text-center text-sm text-error-600 dark:border-error-500/30 dark:bg-error-500/10 dark:text-error-300">
              {error}
            </div>
          )}

          {!isLoading && !error && data.length === 0 && (
            <div className="rounded-lg border border-gray-100 bg-gray-50 px-4 py-10 text-center text-sm text-gray-500 dark:border-gray-800 dark:bg-gray-900/50 dark:text-gray-400">
              No users found
            </div>
          )}
        </div>

        <div className="hidden overflow-x-auto md:block">
          <table className="min-w-[840px] w-full text-left text-xs">
            <thead className="bg-[#6D8AF3] text-[11px] font-semibold uppercase text-white">
              <tr>
                <th className="px-5 py-3">User</th>
                <th className="px-5 py-3">Role</th>
                <th className="px-5 py-3">Status</th>
                <th className="px-5 py-3 whitespace-nowrap">Created At</th>
                {(canEdit || canDelete) && (
                  <th className="px-5 py-3 text-center">Action</th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-white/[0.05]">
              {isLoading &&
                data.length === 0 &&
                Array.from({ length: currentLimit }).map((_, rowIndex) => (
                  <tr key={`loading-${rowIndex}`}>
                    {Array.from({ length: canEdit || canDelete ? 5 : 4 }).map(
                      (_, cellIndex) => (
                        <td className="px-5 py-4" key={cellIndex}>
                          <div className="h-4 w-full animate-pulse rounded bg-gray-100 dark:bg-white/[0.05]" />
                        </td>
                      )
                    )}
                  </tr>
                ))}

              {!isLoading && error && (
                <tr>
                  <td
                    className="px-5 py-8 text-center text-sm text-error-600 dark:text-error-400"
                    colSpan={canEdit || canDelete ? 5 : 4}
                  >
                    {error}
                  </td>
                </tr>
              )}

              {!isLoading && !error && data.length === 0 && (
                <tr>
                  <td
                    className="px-5 py-8 text-center text-sm text-gray-500 dark:text-gray-400"
                    colSpan={canEdit || canDelete ? 5 : 4}
                  >
                    No users found
                  </td>
                </tr>
              )}

              {!isLoading &&
                !error &&
                data.map((user) => (
                  <tr
                    className="hover:bg-gray-50/70 dark:hover:bg-white/[0.03]"
                    key={user.id}
                  >
                    <td className="px-5 py-4">
                      <UserIdentity user={user} />
                    </td>
                    <td className="px-5 py-4">
                      <RoleBadge role={user.role} />
                    </td>
                    <td className="px-5 py-4">
                      <ActiveBadge active={user.isActive} />
                    </td>
                    <td className="whitespace-nowrap px-5 py-4 text-gray-700 dark:text-gray-300">
                      {formatDate(user.createdAt)}
                    </td>
                    {(canEdit || canDelete) && (
                      <td className="px-5 py-4">
                        <RowActions
                          canDelete={canDelete}
                          canEdit={canEdit}
                          onDelete={() => handleDeleteClick(user)}
                          onEdit={() => handleUpdate(user)}
                        />
                      </td>
                    )}
                  </tr>
                ))}
            </tbody>
          </table>
        </div>

        <footer className="flex flex-col gap-3 border-t border-gray-100 px-4 py-4 text-sm text-gray-500 dark:border-white/[0.05] dark:text-gray-400 sm:px-5 lg:flex-row lg:items-center lg:justify-between">
          <span className="text-center sm:text-left">
            Showing {firstItem} to {lastItem} of {total} entries
          </span>

          <div className="flex flex-wrap items-center justify-center gap-2 sm:justify-start">
            <button
              className="h-10 rounded-lg border border-gray-300 px-3 font-medium text-gray-700 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-700 dark:text-gray-300"
              disabled={currentPage <= 1 || isLoading}
              onClick={() => setPage(currentPage - 1)}
              type="button"
            >
              Prev
            </button>

            {pageNumbers.map((page) => (
              <button
                className={`h-10 min-w-10 rounded-lg border px-3 text-sm font-medium ${
                  page === currentPage
                    ? "border-brand-500 bg-brand-500 text-white"
                    : "border-gray-300 text-gray-700 dark:border-gray-700 dark:text-gray-300"
                }`}
                disabled={isLoading}
                key={page}
                onClick={() => setPage(page)}
                type="button"
              >
                {page}
              </button>
            ))}

            <button
              className="h-10 rounded-lg border border-gray-300 px-3 font-medium text-gray-700 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-700 dark:text-gray-300"
              disabled={currentPage >= totalPage || isLoading}
              onClick={() => setPage(currentPage + 1)}
              type="button"
            >
              Next
            </button>

            <button
              className="hidden h-10 rounded-lg border border-gray-300 px-3 font-medium text-gray-700 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-700 dark:text-gray-300 sm:inline-flex sm:items-center"
              disabled={currentPage >= totalPage || isLoading}
              onClick={() => setPage(totalPage)}
              type="button"
            >
              Last Page
            </button>
          </div>
        </footer>
      </div>

      {(canCreate || canEdit) && (
        <UserModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          onSuccess={refetch}
          user={selectedUser}
        />
      )}

      {canDelete && (
        <ConfirmModal
          isOpen={isDeleteModalOpen}
          onClose={closeDeleteModal}
          onConfirm={confirmDelete}
          title="Delete User"
          message={`Are you sure you want to delete user "${userToDelete?.name}"?`}
          confirmText="Delete"
          isDestructive={true}
          isLoading={isDeleting}
        />
      )}
    </>
  );
}

function UserMobileCard({
  canDelete,
  canEdit,
  onDelete,
  onEdit,
  user,
}: {
  canDelete: boolean;
  canEdit: boolean;
  onDelete: () => void;
  onEdit: () => void;
  user: User;
}) {
  return (
    <article className="rounded-lg border border-gray-200 bg-white p-3 shadow-xs dark:border-gray-800 dark:bg-gray-950">
      <div className="flex items-start justify-between gap-3">
        <UserIdentity user={user} />
        {(canEdit || canDelete) && (
          <RowActions
            canDelete={canDelete}
            canEdit={canEdit}
            onDelete={onDelete}
            onEdit={onEdit}
          />
        )}
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-gray-100 pt-3 dark:border-gray-800">
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] font-semibold uppercase text-gray-400">
            Role
          </span>
          <RoleBadge role={user.role} />
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] font-semibold uppercase text-gray-400">
            Status
          </span>
          <ActiveBadge active={user.isActive} />
        </div>
        <div className="flex min-w-0 basis-full items-center gap-1.5 sm:basis-auto">
          <span className="shrink-0 text-[10px] font-semibold uppercase text-gray-400">
            Created
          </span>
          <span className="truncate font-mono text-xs font-semibold text-gray-800 dark:text-gray-200">
            {formatDate(user.createdAt)}
          </span>
        </div>
      </div>
    </article>
  );
}

function UserIdentity({ user }: { user: User }) {
  return (
    <div className="flex min-w-0 items-center gap-3">
      <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-brand-50 text-sm font-semibold text-brand-600 dark:bg-brand-500/15 dark:text-brand-300">
        {getInitials(user.name || user.username)}
      </div>
      <div className="min-w-0">
        <div className="truncate font-medium text-gray-800 dark:text-white/90">
          {user.name || "-"}
        </div>
        <div className="truncate text-theme-xs text-gray-500 dark:text-gray-400">
          @{user.username}
        </div>
      </div>
    </div>
  );
}

function RoleBadge({ role }: { role: string }) {
  return (
    <Badge color="info" size="sm">
      {formatRole(role)}
    </Badge>
  );
}

function ActiveBadge({ active }: { active: boolean }) {
  return (
    <Badge color={active ? "success" : "error"} size="sm">
      {active ? "Active" : "Inactive"}
    </Badge>
  );
}

function RowActions({
  canDelete,
  canEdit,
  onDelete,
  onEdit,
}: {
  canDelete: boolean;
  canEdit: boolean;
  onDelete: () => void;
  onEdit: () => void;
}) {
  return (
    <div className="flex shrink-0 items-center justify-center gap-3">
      {canEdit && (
        <button
          onClick={onEdit}
          className="text-warning-500 transition-colors hover:text-warning-600 dark:text-warning-400 dark:hover:text-warning-500"
          title="Edit"
          type="button"
        >
          <PencilIcon className="h-5 w-5 fill-current" />
        </button>
      )}
      {canDelete && (
        <button
          onClick={onDelete}
          className="text-error-500 transition-colors hover:text-error-600 dark:text-error-400 dark:hover:text-error-500"
          title="Delete"
          type="button"
        >
          <TrashBinIcon className="h-5 w-5 fill-current" />
        </button>
      )}
    </div>
  );
}
