"use client";

import PageLoader from "@/components/common/PageLoader";
import { useAuth } from "@/context/AuthContext";
import { getRequiredPermission } from "@/utils/auth";
import { usePathname, useRouter } from "next/navigation";
import { ReactNode, useEffect } from "react";

export default function RouteAccessGuard({ children }: { children: ReactNode }) {
  const { can, isReady, user } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const isAllowed = Boolean(user && can(getRequiredPermission(pathname)));

  useEffect(() => {
    if (!isReady) {
      return;
    }

    if (!user) {
      router.replace("/login");
      return;
    }

    if (!isAllowed) {
      router.replace("/");
    }
  }, [isAllowed, isReady, router, user]);

  if (!isReady || !isAllowed) {
    return <PageLoader />;
  }

  return children;
}
