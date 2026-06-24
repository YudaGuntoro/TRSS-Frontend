"use client";

import {
  AuthUser,
  getAuthUserFromToken,
  getAuthToken,
  hasPermission,
  Permission,
  notifyAuthChanged,
} from "@/utils/auth";
import {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useMemo,
  useSyncExternalStore,
} from "react";

type AuthContextValue = {
  user: AuthUser | null;
  isReady: boolean;
  can: (permission: Permission) => boolean;
  refreshAuth: () => void;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

const subscribeToAuth = (onStoreChange: () => void) => {
  window.addEventListener("auth-changed", onStoreChange);
  window.addEventListener("storage", onStoreChange);

  return () => {
    window.removeEventListener("auth-changed", onStoreChange);
    window.removeEventListener("storage", onStoreChange);
  };
};

export function AuthProvider({ children }: { children: ReactNode }) {
  const token = useSyncExternalStore<string | null | undefined>(
    subscribeToAuth,
    getAuthToken,
    () => undefined
  );
  const isReady = token !== undefined;
  const user = useMemo<AuthUser | null>(
    () => (isReady ? getAuthUserFromToken(token ?? null) : null),
    [isReady, token]
  );

  const refreshAuth = useCallback(() => {
    notifyAuthChanged();
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      isReady,
      can: (permission) => hasPermission(user?.role, permission),
      refreshAuth,
    }),
    [isReady, refreshAuth, user]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }

  return context;
};
