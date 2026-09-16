export const ROLES = {
  SUPERADMIN: "superadmin",
  ADMIN: "admin",
  OPERATOR: "operator",
  GUEST: "guest",
} as const;

export type UserRole = (typeof ROLES)[keyof typeof ROLES];

export const PERMISSIONS = {
  ALL: "*",
  ADMIN_ACCESS: "admin.access",
  DASHBOARD_VIEW: "dashboard.view",
  PART_VIEW: "part.view",
  PART_CREATE: "part.create",
  PART_EDIT: "part.edit",
  PART_DELETE: "part.delete",
  PARAMETER_VIEW: "parameter.view",
  PARAMETER_CREATE: "parameter.create",
  PARAMETER_EDIT: "parameter.edit",
  PARAMETER_DELETE: "parameter.delete",
  PROCESS_VIEW: "process.view",
  PROCESS_CREATE: "process.create",
  PROCESS_EDIT: "process.edit",
  PROCESS_DELETE: "process.delete",
  STOCK_IN_VIEW: "stock-in.view",
  STOCK_IN_CREATE: "stock-in.create",
  STOCK_IN_EDIT: "stock-in.edit",
  STOCK_IN_DELETE: "stock-in.delete",
  STOCK_IN_REWORK_VIEW: "stock-in-rework.view",
  STOCK_IN_REWORK_CREATE: "stock-in-rework.create",
  STOCK_IN_REWORK_DISPOSITION: "stock-in-rework.disposition",
  TRACEABILITY_LOG_VIEW: "traceability-log.view",
  TRACEABILITY_LOG_DETAIL: "traceability-log.detail",
  PROCESS_LOG_VIEW: "process-log.view",
  PROCESS_LOG_DETAIL: "process-log.detail",
  PRINT_HISTORY_VIEW: "print-history.view",
  PRINT_HISTORY_REPRINT: "print-history.reprint",
  USERS_VIEW: "users.view",
  USERS_CREATE: "users.create",
  USERS_EDIT: "users.edit",
  USERS_DELETE: "users.delete",
  APP_CONFIGURATION_VIEW: "app-configuration.view",
  APP_CONFIGURATION_CREATE: "app-configuration.create",
  APP_CONFIGURATION_EDIT: "app-configuration.edit",
  APP_CONFIGURATION_DELETE: "app-configuration.delete",
  MQTT_LOGS_VIEW: "mqtt-logs.view",
  SYSTEM_LOGS_VIEW: "system-logs.view",
} as const;

export type Permission = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];

export type AuthUser = {
  username: string;
  role: UserRole;
};

export const ROLE_OPTIONS: { label: string; value: UserRole }[] = [
  { label: "Super Admin", value: ROLES.SUPERADMIN },
  { label: "Admin", value: ROLES.ADMIN },
  { label: "Operator", value: ROLES.OPERATOR },
  { label: "Guest", value: ROLES.GUEST },
];

export const PERMISSION_LABELS: Record<Permission, string> = {
  [PERMISSIONS.ALL]: "All Access",
  [PERMISSIONS.ADMIN_ACCESS]: "Admin Access",
  [PERMISSIONS.DASHBOARD_VIEW]: "Dashboard",
  [PERMISSIONS.STOCK_IN_VIEW]: "Stock In View",
  [PERMISSIONS.STOCK_IN_CREATE]: "Stock In Create",
  [PERMISSIONS.STOCK_IN_EDIT]: "Stock In Edit",
  [PERMISSIONS.STOCK_IN_DELETE]: "Stock In Delete",
  [PERMISSIONS.PART_VIEW]: "Part View",
  [PERMISSIONS.PART_CREATE]: "Part Create",
  [PERMISSIONS.PART_EDIT]: "Part Edit",
  [PERMISSIONS.PART_DELETE]: "Part Delete",
  [PERMISSIONS.PARAMETER_VIEW]: "Parameter View",
  [PERMISSIONS.PARAMETER_CREATE]: "Parameter Create",
  [PERMISSIONS.PARAMETER_EDIT]: "Parameter Edit",
  [PERMISSIONS.PARAMETER_DELETE]: "Parameter Delete",
  [PERMISSIONS.PROCESS_VIEW]: "Process View",
  [PERMISSIONS.PROCESS_CREATE]: "Process Create",
  [PERMISSIONS.PROCESS_EDIT]: "Process Edit",
  [PERMISSIONS.PROCESS_DELETE]: "Process Delete",
  [PERMISSIONS.STOCK_IN_REWORK_VIEW]: "Stock In Rework View",
  [PERMISSIONS.STOCK_IN_REWORK_CREATE]: "Stock In Rework Create",
  [PERMISSIONS.STOCK_IN_REWORK_DISPOSITION]: "Stock In Rework Disposition",
  [PERMISSIONS.TRACEABILITY_LOG_VIEW]: "Traceability Logs View",
  [PERMISSIONS.TRACEABILITY_LOG_DETAIL]: "Traceability Logs Detail",
  [PERMISSIONS.PROCESS_LOG_VIEW]: "Process Logs View",
  [PERMISSIONS.PROCESS_LOG_DETAIL]: "Process Logs Detail",
  [PERMISSIONS.PRINT_HISTORY_VIEW]: "Print History List",
  [PERMISSIONS.PRINT_HISTORY_REPRINT]: "Print History Re Print",
  [PERMISSIONS.USERS_VIEW]: "User Lists",
  [PERMISSIONS.USERS_CREATE]: "User Create",
  [PERMISSIONS.USERS_EDIT]: "User Edit",
  [PERMISSIONS.USERS_DELETE]: "User Delete",
  [PERMISSIONS.APP_CONFIGURATION_VIEW]: "App Configuration View",
  [PERMISSIONS.APP_CONFIGURATION_CREATE]: "App Configuration Create",
  [PERMISSIONS.APP_CONFIGURATION_EDIT]: "App Configuration Edit",
  [PERMISSIONS.APP_CONFIGURATION_DELETE]: "App Configuration Delete",
  [PERMISSIONS.MQTT_LOGS_VIEW]: "MQTT Log View",
  [PERMISSIONS.SYSTEM_LOGS_VIEW]: "Log View",
};

export const ALL_ROLE_PERMISSIONS: Permission[] = [
  PERMISSIONS.DASHBOARD_VIEW,
  PERMISSIONS.STOCK_IN_VIEW,
  PERMISSIONS.STOCK_IN_CREATE,
  PERMISSIONS.STOCK_IN_EDIT,
  PERMISSIONS.STOCK_IN_DELETE,
  PERMISSIONS.PART_VIEW,
  PERMISSIONS.PART_CREATE,
  PERMISSIONS.PART_EDIT,
  PERMISSIONS.PART_DELETE,
  PERMISSIONS.PARAMETER_VIEW,
  PERMISSIONS.PARAMETER_CREATE,
  PERMISSIONS.PARAMETER_EDIT,
  PERMISSIONS.PARAMETER_DELETE,
  PERMISSIONS.PROCESS_VIEW,
  PERMISSIONS.PROCESS_CREATE,
  PERMISSIONS.PROCESS_EDIT,
  PERMISSIONS.PROCESS_DELETE,
  PERMISSIONS.STOCK_IN_REWORK_VIEW,
  PERMISSIONS.STOCK_IN_REWORK_CREATE,
  PERMISSIONS.STOCK_IN_REWORK_DISPOSITION,
  PERMISSIONS.TRACEABILITY_LOG_VIEW,
  PERMISSIONS.TRACEABILITY_LOG_DETAIL,
  PERMISSIONS.PROCESS_LOG_VIEW,
  PERMISSIONS.PROCESS_LOG_DETAIL,
  PERMISSIONS.PRINT_HISTORY_VIEW,
  PERMISSIONS.PRINT_HISTORY_REPRINT,
  PERMISSIONS.USERS_VIEW,
  PERMISSIONS.USERS_CREATE,
  PERMISSIONS.USERS_EDIT,
  PERMISSIONS.USERS_DELETE,
  PERMISSIONS.SYSTEM_LOGS_VIEW,
  PERMISSIONS.APP_CONFIGURATION_VIEW,
  PERMISSIONS.APP_CONFIGURATION_CREATE,
  PERMISSIONS.APP_CONFIGURATION_EDIT,
  PERMISSIONS.APP_CONFIGURATION_DELETE,
];

const AUTH_COOKIE_NAMES = ["token", "accessToken", "authToken"];
const AUTH_STORAGE_KEYS = ["token", "accessToken", "authToken", "jwt"];
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
  [ROLES.SUPERADMIN]: new Set([PERMISSIONS.ALL]),
  [ROLES.ADMIN]: new Set([
    PERMISSIONS.DASHBOARD_VIEW,
    PERMISSIONS.STOCK_IN_VIEW,
    PERMISSIONS.STOCK_IN_CREATE,
    PERMISSIONS.STOCK_IN_EDIT,
    PERMISSIONS.STOCK_IN_DELETE,
    PERMISSIONS.STOCK_IN_REWORK_VIEW,
    PERMISSIONS.STOCK_IN_REWORK_CREATE,
    PERMISSIONS.STOCK_IN_REWORK_DISPOSITION,
    PERMISSIONS.TRACEABILITY_LOG_VIEW,
    PERMISSIONS.TRACEABILITY_LOG_DETAIL,
    PERMISSIONS.PROCESS_LOG_VIEW,
    PERMISSIONS.PROCESS_LOG_DETAIL,
    PERMISSIONS.PRINT_HISTORY_VIEW,
    PERMISSIONS.PRINT_HISTORY_REPRINT,
    PERMISSIONS.USERS_VIEW,
    PERMISSIONS.USERS_CREATE,
    PERMISSIONS.USERS_EDIT,
    PERMISSIONS.USERS_DELETE,
    PERMISSIONS.PART_VIEW,
  ]),
  [ROLES.OPERATOR]: new Set([
    PERMISSIONS.DASHBOARD_VIEW,
    PERMISSIONS.STOCK_IN_CREATE,
    PERMISSIONS.STOCK_IN_VIEW,
    PERMISSIONS.STOCK_IN_REWORK_VIEW,
    PERMISSIONS.TRACEABILITY_LOG_VIEW,
    PERMISSIONS.TRACEABILITY_LOG_DETAIL,
    PERMISSIONS.PROCESS_LOG_VIEW,
    PERMISSIONS.PROCESS_LOG_DETAIL,
  ]),
  [ROLES.GUEST]: new Set([
    PERMISSIONS.DASHBOARD_VIEW,
    PERMISSIONS.STOCK_IN_VIEW,
    PERMISSIONS.STOCK_IN_REWORK_VIEW,
    PERMISSIONS.TRACEABILITY_LOG_VIEW,
    PERMISSIONS.TRACEABILITY_LOG_DETAIL,
    PERMISSIONS.PROCESS_LOG_VIEW,
    PERMISSIONS.PROCESS_LOG_DETAIL,
  ]),
};

export const getRolePermissions = (role: UserRole | string | null | undefined) => {
  const normalizedRole =
    typeof role === "string" ? normalizeRole(role) : role ?? null;
  const effectiveRole = getEffectiveRole(normalizedRole);
  const permissions = ROLE_PERMISSIONS[effectiveRole];

  if (permissions.has(PERMISSIONS.ALL)) {
    return ALL_ROLE_PERMISSIONS;
  }

  return ALL_ROLE_PERMISSIONS.filter((permission) =>
    permissions.has(permission)
  );
};

const LEGACY_ROLE_ALIASES: Record<string, UserRole> = {
  user: ROLES.OPERATOR,
};

export const normalizeRole = (role: string) => {
  const normalizedRole = role.toLowerCase();

  if (isUserRole(normalizedRole)) {
    return normalizedRole;
  }

  return LEGACY_ROLE_ALIASES[normalizedRole] ?? null;
};

export const AUTH_OPTIONAL_PERMISSIONS = new Set<Permission>([
  PERMISSIONS.DASHBOARD_VIEW,
  PERMISSIONS.STOCK_IN_VIEW,
  PERMISSIONS.STOCK_IN_REWORK_VIEW,
  PERMISSIONS.TRACEABILITY_LOG_VIEW,
  PERMISSIONS.TRACEABILITY_LOG_DETAIL,
  PERMISSIONS.PROCESS_LOG_VIEW,
  PERMISSIONS.PROCESS_LOG_DETAIL,
]);

export const getEffectiveRole = (role: UserRole | null | undefined) =>
  role ?? ROLES.GUEST;

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

export const isAuthTokenExpired = (token: string | null) => {
  if (!token) {
    return false;
  }

  const claims = decodeJwtPayload(token);

  if (!claims || typeof claims.exp !== "number") {
    return false;
  }

  return claims.exp * 1000 <= Date.now();
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

  const role = normalizeRole(getStringClaim(claims, ROLE_CLAIM_KEYS));

  if (!role) {
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
) => {
  const effectiveRole = getEffectiveRole(role);
  const permissions = ROLE_PERMISSIONS[effectiveRole];

  return Boolean(
    permissions?.has(PERMISSIONS.ALL) || permissions?.has(permission)
  );
};

export const clearAuthSession = () => {
  if (typeof document === "undefined") {
    return;
  }

  AUTH_COOKIE_NAMES.forEach((cookieName) => {
    document.cookie = `${cookieName}=; path=/; max-age=0; SameSite=Lax`;
    document.cookie = `${cookieName}=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax`;
  });
  AUTH_STORAGE_KEYS.forEach((storageKey) => {
    localStorage.removeItem(storageKey);
    sessionStorage.removeItem(storageKey);
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
  if (pathname === "/logs/system" || pathname.startsWith("/logs/system/")) {
    return PERMISSIONS.SYSTEM_LOGS_VIEW;
  }

  if (pathname === "/logs/mqtt" || pathname.startsWith("/logs/mqtt/")) {
    return PERMISSIONS.MQTT_LOGS_VIEW;
  }

  if (pathname === "/") {
    return PERMISSIONS.DASHBOARD_VIEW;
  }

  if (
    pathname.startsWith("/parameter") ||
    pathname.startsWith("/master-process")
  ) {
    return pathname.startsWith("/parameter")
      ? PERMISSIONS.PARAMETER_VIEW
      : PERMISSIONS.PROCESS_VIEW;
  }

  if (pathname.startsWith("/master-part")) {
    return PERMISSIONS.PART_VIEW;
  }

  if (pathname.startsWith("/stock-in")) {
    return pathname.startsWith("/stock-in-rework")
      ? PERMISSIONS.STOCK_IN_REWORK_VIEW
      : PERMISSIONS.STOCK_IN_VIEW;
  }

  if (pathname.startsWith("/user")) {
    return PERMISSIONS.USERS_VIEW;
  }

  if (pathname.startsWith("/app-configuration")) {
    return PERMISSIONS.APP_CONFIGURATION_VIEW;
  }

  if (
    pathname.startsWith("/traceability-log") ||
    pathname.startsWith("/data-summary")
  ) {
    return PERMISSIONS.TRACEABILITY_LOG_VIEW;
  }

  if (pathname.startsWith("/process-log")) {
    return PERMISSIONS.PROCESS_LOG_VIEW;
  }

  if (pathname.startsWith("/print-history")) {
    return PERMISSIONS.PRINT_HISTORY_VIEW;
  }

  return PERMISSIONS.ADMIN_ACCESS;
};
