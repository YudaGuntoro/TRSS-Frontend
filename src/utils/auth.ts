export const ROLES = {
  ADMIN: "admin",
  USER: "user",
  GUEST: "guest",
} as const;

export type UserRole = (typeof ROLES)[keyof typeof ROLES];

export const PERMISSIONS = {
  ADMIN_ACCESS: "admin.access",
  DASHBOARD_VIEW: "dashboard.view",
  MASTER_DATA_MANAGE: "master-data.manage",
  PARTS_MANAGE: "parts.manage",
  STOCK_IN_VIEW: "stock-in.view",
  STOCK_IN_CREATE: "stock-in.create",
  STOCK_IN_EDIT: "stock-in.edit",
  STOCK_IN_DELETE: "stock-in.delete",
  USERS_MANAGE: "users.manage",
  APP_CONFIGURATION_MANAGE: "app-configuration.manage",
  PROCESS_LOGS_VIEW: "process-logs.view",
} as const;

export type Permission = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];

export type AuthUser = {
  username: string;
  role: UserRole;
};

const AUTH_COOKIE_NAMES = ["token", "accessToken", "authToken"];
const USERNAME_CLAIM_KEYS = [
  "username",
  "unique_name",
  "preferred_username",
  "name",
  "http://schemas.xmlsoap.org/ws/2005/05/identity/claims/name",
  "sub",
];
const ROLE_CLAIM_KEYS = [
  "role",
  "roles",
  "http://schemas.microsoft.com/ws/2008/06/identity/claims/role",
];

const ROLE_PERMISSIONS: Record<UserRole, ReadonlySet<Permission>> = {
  [ROLES.ADMIN]: new Set(Object.values(PERMISSIONS)),
  [ROLES.USER]: new Set([
    PERMISSIONS.DASHBOARD_VIEW,
    PERMISSIONS.PARTS_MANAGE,
    PERMISSIONS.STOCK_IN_VIEW,
    PERMISSIONS.STOCK_IN_CREATE,
    PERMISSIONS.STOCK_IN_EDIT,
    PERMISSIONS.PROCESS_LOGS_VIEW,
  ]),
  [ROLES.GUEST]: new Set([
    PERMISSIONS.DASHBOARD_VIEW,
    PERMISSIONS.STOCK_IN_VIEW,
    PERMISSIONS.PROCESS_LOGS_VIEW,
  ]),
};

const isUserRole = (role: string): role is UserRole =>
  Object.values(ROLES).includes(role as UserRole);

const getCookie = (name: string) => {
  if (typeof document === "undefined") {
    return null;
  }

  const cookie = document.cookie
    .split("; ")
    .find((item) => item.startsWith(`${name}=`));

  return cookie ? decodeURIComponent(cookie.split("=")[1]) : null;
};

export const getAuthToken = () => {
  for (const cookieName of AUTH_COOKIE_NAMES) {
    const token = getCookie(cookieName);

    if (token) {
      return token;
    }
  }

  return null;
};

const decodeJwtPayload = (token: string) => {
  try {
    const payload = token.split(".")[1];

    if (!payload) {
      return null;
    }

    const normalizedPayload = payload
      .replace(/-/g, "+")
      .replace(/_/g, "/")
      .padEnd(Math.ceil(payload.length / 4) * 4, "=");

    return JSON.parse(atob(normalizedPayload)) as Record<string, unknown>;
  } catch {
    return null;
  }
};

const getStringClaim = (
  claims: Record<string, unknown>,
  keys: string[]
) => {
  for (const key of keys) {
    const value = claims[key];

    if (typeof value === "string" && value) {
      return value;
    }

    if (Array.isArray(value) && typeof value[0] === "string") {
      return value[0];
    }
  }

  return "";
};

export const getAuthUserFromToken = (token: string | null): AuthUser | null => {
  if (!token) {
    return null;
  }

  const claims = decodeJwtPayload(token);

  if (!claims) {
    return null;
  }

  const expiresAt =
    typeof claims.exp === "number" ? claims.exp * 1000 : Number.POSITIVE_INFINITY;

  if (expiresAt <= Date.now()) {
    return null;
  }

  const role = getStringClaim(claims, ROLE_CLAIM_KEYS).toLowerCase();

  if (!isUserRole(role)) {
    return null;
  }

  const storedUsername =
    typeof window === "undefined"
      ? ""
      : localStorage.getItem("authUsername") ?? "";

  return {
    role,
    username:
      getStringClaim(claims, USERNAME_CLAIM_KEYS) || storedUsername || "User",
  };
};

export const getAuthUser = (): AuthUser | null =>
  getAuthUserFromToken(getAuthToken());

export const hasPermission = (
  role: UserRole | null | undefined,
  permission: Permission
) => Boolean(role && ROLE_PERMISSIONS[role]?.has(permission));

export const clearAuthSession = () => {
  if (typeof document === "undefined") {
    return;
  }

  AUTH_COOKIE_NAMES.forEach((cookieName) => {
    document.cookie = `${cookieName}=; path=/; max-age=0; SameSite=Lax`;
  });
  localStorage.removeItem("authUsername");
  window.dispatchEvent(new Event("auth-changed"));
};

export const notifyAuthChanged = () => {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event("auth-changed"));
  }
};

export const getRequiredPermission = (pathname: string): Permission => {
  if (pathname === "/") {
    return PERMISSIONS.DASHBOARD_VIEW;
  }

  if (
    pathname.startsWith("/parameter") ||
    pathname.startsWith("/master-process") ||
    pathname.startsWith("/master-printer")
  ) {
    return PERMISSIONS.MASTER_DATA_MANAGE;
  }

  if (pathname.startsWith("/master-part")) {
    return PERMISSIONS.PARTS_MANAGE;
  }

  if (pathname.startsWith("/stock-in")) {
    return PERMISSIONS.STOCK_IN_VIEW;
  }

  if (pathname.startsWith("/user")) {
    return PERMISSIONS.USERS_MANAGE;
  }

  if (pathname.startsWith("/app-configuration")) {
    return PERMISSIONS.APP_CONFIGURATION_MANAGE;
  }

  if (pathname.startsWith("/process-log")) {
    return PERMISSIONS.PROCESS_LOGS_VIEW;
  }

  return PERMISSIONS.ADMIN_ACCESS;
};
