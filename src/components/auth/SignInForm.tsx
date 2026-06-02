"use client";

import Input from "@/components/form/input/InputField";
import Label from "@/components/form/Label";
import { useToast } from "@/context/ToastContext";
import { EyeCloseIcon, EyeIcon, LockIcon, UserIcon } from "@/icons";
import AuthService from "@/services/AuthService";
import { ApiError } from "@/utils/api";
import Image from "next/image";
import { useRouter } from "next/navigation";
import React, { useState } from "react";

const AUTH_TOKEN_KEYS = ["token", "accessToken", "authToken", "jwt"];

const getTokenFromPayload = (payload: unknown): string | null => {
  if (!payload || typeof payload !== "object") {
    return null;
  }

  const record = payload as Record<string, unknown>;

  for (const key of AUTH_TOKEN_KEYS) {
    const value = record[key];

    if (typeof value === "string" && value) {
      return value;
    }
  }

  for (const key of ["data", "result"]) {
    const token = getTokenFromPayload(record[key]);

    if (token) {
      return token;
    }
  }

  return null;
};

const getTokenFromAuthorizationHeader = (header: string | null) => {
  if (!header) {
    return null;
  }

  return header.toLowerCase().startsWith("bearer ")
    ? header.slice(7).trim()
    : header;
};

const saveAuthToken = (token: string) => {
  document.cookie = `token=${encodeURIComponent(token)}; path=/; SameSite=Lax`;
};

const saveAuthUsername = (username: string) => {
  localStorage.setItem("authUsername", username);
};

const getLoginErrorMessage = (error: unknown) => {
  if (error instanceof ApiError) {
    return error.message;
  }

  if (error instanceof Error) {
    return error.message;
  }

  return "Login gagal. Silakan coba lagi.";
};

export default function SignInForm() {
  const router = useRouter();
  const toast = useToast();
  const [showPassword, setShowPassword] = useState(false);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!username.trim() || !password) {
      toast.error({
        message: "Username dan password wajib diisi.",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await AuthService.login({
        username: username.trim(),
        password,
      });
      const token =
        getTokenFromPayload(response.data) ??
        getTokenFromAuthorizationHeader(response.headers.get("authorization"));

      if (token) {
        saveAuthToken(token);
      }
      saveAuthUsername(username.trim());

      toast.success({
        message: "Login berhasil.",
      });
      router.replace("/");
      router.refresh();
    } catch (error) {
      toast.error({
        message: getLoginErrorMessage(error),
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="relative flex min-h-screen w-full items-center justify-center px-4 py-10 sm:px-6 lg:w-1/2 lg:px-10">
      <div className="relative w-full max-w-[500px]">
        <div className="mb-6 flex items-center gap-3 lg:hidden">
          <Image
            width={52}
            height={52}
            src="/images/logo/favicon.png"
            alt="TRSS Logo"
            className="size-[52px] object-contain"
            priority
          />
          <div>
            <p className="text-sm font-semibold text-gray-800 dark:text-white/90">
              PT TRSS
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Traceability Log System
            </p>
          </div>
        </div>

        <div className="rounded-lg border border-gray-200 bg-white/95 p-6 shadow-theme-xl backdrop-blur dark:border-white/[0.08] dark:bg-gray-900/90 sm:p-8">
          <div className="mb-8 text-center">
            <h1 className="mb-3 text-title-sm font-bold text-gray-900 dark:text-white/90 sm:text-title-md">
              Selamat Datang
            </h1>
            <p className="mx-auto max-w-sm text-sm leading-6 text-gray-500 dark:text-gray-400">
              Siahkan Login untuk mengakses dashboard PT.TRSS.
            </p>
          </div>

          <form onSubmit={handleSubmit}>
            <div className="space-y-6">
              <div>
                <Label>
                  Username <span className="text-error-500">*</span>{" "}
                </Label>
                <div className="relative">
                  <span className="pointer-events-none absolute left-4 top-1/2 z-10 -translate-y-1/2 text-gray-400 dark:text-gray-500">
                    <UserIcon className="size-5 fill-current" />
                  </span>
                  <Input
                    className="h-12 pl-12"
                    disabled={isSubmitting}
                    name="username"
                    onChange={(event) => setUsername(event.target.value)}
                    placeholder="Masukkan username"
                    type="text"
                  />
                </div>
              </div>
              <div>
                <Label>
                  Password <span className="text-error-500">*</span>{" "}
                </Label>
                <div className="relative">
                  <span className="pointer-events-none absolute left-4 top-1/2 z-10 -translate-y-1/2 text-gray-400 dark:text-gray-500">
                    <LockIcon className="size-5 fill-current" />
                  </span>
                  <Input
                    className="h-12 pl-12 pr-12"
                    disabled={isSubmitting}
                    name="password"
                    onChange={(event) => setPassword(event.target.value)}
                    placeholder="Masukkan password"
                    type={showPassword ? "text" : "password"}
                  />
                  <button
                    aria-label={showPassword ? "Hide password" : "Show password"}
                    className="absolute right-4 top-1/2 z-30 -translate-y-1/2 cursor-pointer disabled:cursor-not-allowed disabled:opacity-50"
                    disabled={isSubmitting}
                    onClick={() => setShowPassword(!showPassword)}
                    type="button"
                  >
                    {showPassword ? (
                      <EyeIcon className="fill-gray-500 dark:fill-gray-400" />
                    ) : (
                      <EyeCloseIcon className="fill-gray-500 dark:fill-gray-400" />
                    )}
                  </button>
                </div>
              </div>
              <div className="pt-1">
                <button
                  className="inline-flex h-12 w-full items-center justify-center rounded-lg bg-[#465FFF] px-4 text-sm font-semibold text-white shadow-theme-md transition-colors hover:bg-[#3641F5] focus:outline-none focus:ring-3 focus:ring-[#465FFF]/20 disabled:cursor-not-allowed disabled:opacity-60"
                  disabled={isSubmitting}
                  type="submit"
                >
                  {isSubmitting ? "Memproses..." : "Login"}
                </button>
              </div>
            </div>
          </form>
        </div>

        <p className="mt-6 text-center text-xs text-gray-500 dark:text-gray-500">
          Tokyo Radiator Selamat Sempurna
        </p>
      </div>
    </div>
  );
}
