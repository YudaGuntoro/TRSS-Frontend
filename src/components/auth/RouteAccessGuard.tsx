"use client";

import PageLoader from "@/components/common/PageLoader";
import { useAuth } from "@/context/AuthContext";
import {
  AUTH_OPTIONAL_PERMISSIONS,
  getRequiredPermission,
} from "@/utils/auth";
import { usePathname, useRouter } from "next/navigation";
import { ReactNode, useEffect } from "react";

export default function RouteAccessGuard({ children }: { children: ReactNode }) {
  const { can, isReady, user } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const requiredPermission = getRequiredPermission(pathname);
  const isLoginRequired = !AUTH_OPTIONAL_PERMISSIONS.has(requiredPermission);
  const isAllowed = can(requiredPermission);

  useEffect(() => {
    if (!isReady) {
      return;
    }

    if (isLoginRequired && !user) {
      router.replace("/login");
      return;
    }

    if (!isAllowed) {
      router.replace("/");
    }
  }, [isAllowed, isLoginRequired, isReady, router, user]);

  if (!isReady || !isAllowed) {
    return <PageLoader />;
  }

  return children;
}
