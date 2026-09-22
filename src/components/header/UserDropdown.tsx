"use client";

import Link from "next/link";
import React, { useState } from "react";
import { Dropdown } from "../ui/dropdown/Dropdown";
import { useAuth } from "@/context/AuthContext";
import { clearAuthSession } from "@/utils/auth";

const formatRole = (role: string) => {
  if (!role) {
    return "Role belum tersedia";
  }

  return role.charAt(0).toUpperCase() + role.slice(1);
};

export default function UserDropdown() {
  const [isOpen, setIsOpen] = useState(false);
  const { user } = useAuth();

  function toggleDropdown(e: React.MouseEvent<HTMLButtonElement, MouseEvent>) {
    e.stopPropagation();
    setIsOpen((prev) => !prev);
  }

  function closeDropdown() {
    setIsOpen(false);
  }

  const username = user?.username ?? "User";
  const userRole = user?.role ?? "";
  const initial = username.charAt(0).toUpperCase();

  const getRoleBadgeClasses = (role: string) => {
    switch (role.toLowerCase()) {
      case "superadmin":
      case "admin":
        return "bg-brand-50 text-brand-600 dark:bg-brand-500/15 dark:text-brand-400 border border-brand-200 dark:border-brand-800/40";
      case "operator":
        return "bg-emerald-50 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/40";
      default:
        return "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400 border border-gray-200 dark:border-gray-700";
    }
  };

  return (
    <div className="relative">
      <button
        aria-label="Open user menu"
        onClick={toggleDropdown}
        className="dropdown-toggle relative flex h-10 w-10 sm:h-11 sm:w-11 items-center justify-center rounded-full border border-gray-200 bg-white text-gray-600 transition-colors hover:bg-gray-100 hover:text-gray-800 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-white"
        type="button"
      >
        <span className="flex h-7 w-7 sm:h-8 sm:w-8 items-center justify-center rounded-full bg-brand-500/10 text-xs sm:text-sm font-semibold text-brand-600 dark:bg-brand-500/20 dark:text-brand-400">
          {initial}
        </span>
        <span className="absolute bottom-0.5 right-0.5 h-2.5 w-2.5 rounded-full border-2 border-white bg-emerald-500 dark:border-gray-900" />
      </button>

      <Dropdown
        isOpen={isOpen}
        onClose={closeDropdown}
        className="absolute right-0 mt-2.5 flex w-72 max-w-[calc(100vw-24px)] flex-col rounded-2xl border border-gray-200 bg-white p-3 shadow-xl dark:border-gray-800 dark:bg-gray-900"
      >
        {/* User Info Header */}
        <div className="flex items-center gap-3 border-b border-gray-100 p-2 pb-3 dark:border-gray-800">
          <div className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-tr from-brand-600 to-brand-400 text-sm font-bold text-white shadow-sm">
            {initial}
            <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full border-2 border-white bg-emerald-500 dark:border-gray-900" />
          </div>
          <div className="min-w-0 flex-1">
            <span className="block truncate text-sm font-semibold text-gray-800 dark:text-gray-200">
              {username}
            </span>
            <div className="mt-1 flex items-center gap-1.5">
              <span
                className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium ${getRoleBadgeClasses(
                  userRole
                )}`}
              >
                {formatRole(userRole)}
              </span>
            </div>
          </div>
        </div>

        {/* Menu Items */}
        <div className="mt-2 space-y-1">
          <Link
            href="/profile"
            onClick={closeDropdown}
            className="flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-medium text-gray-700 transition hover:bg-gray-100 hover:text-gray-900 dark:text-gray-300 dark:hover:bg-gray-800 dark:hover:text-white"
          >
            <svg
              className="h-4 w-4 text-gray-500 dark:text-gray-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth="1.75"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
              />
            </svg>
            <span>Profil Saya</span>
          </Link>

          <Link
            href="/login"
            onClick={() => {
              closeDropdown();
              clearAuthSession();
            }}
            className="flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-medium text-red-600 transition hover:bg-red-50 hover:text-red-700 dark:text-red-400 dark:hover:bg-red-950/30 dark:hover:text-red-300"
          >
            <svg
              className="h-4 w-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth="1.75"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
              />
            </svg>
            <span>Keluar (Sign Out)</span>
          </Link>
        </div>
      </Dropdown>
    </div>
  );
}
