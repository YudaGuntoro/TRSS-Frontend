import React from "react";
import {
  BoxCubeIcon,
  DocsIcon,
  DownloadIcon,
  GridIcon,
  ListIcon,
  PlugInIcon,
  RefreshIcon,
  TimeIcon,
  UserIcon,
} from "../icons/index";
import { Permission, PERMISSIONS } from "@/utils/auth";

export type NavSubItem = {
  name: string;
  path: string;
  permission: Permission;
  pro?: boolean;
  new?: boolean;
};

export type NavItem = {
  name: string;
  icon: React.ReactNode;
  iconClassName?: string;
  path?: string;
  permission?: Permission;
  subItems?: NavSubItem[];
};

export const navItems: NavItem[] = [
  {
    icon: <GridIcon />,
    iconClassName: "text-sky-500 dark:text-sky-400",
    name: "Overview",
    path: "/",
    permission: PERMISSIONS.DASHBOARD_VIEW,
  },
  {
    icon: <BoxCubeIcon />,
    iconClassName: "text-violet-500 dark:text-violet-400",
    name: "Master Data",
    subItems: [
      {
        name: "Parameter",
        path: "/parameter",
        permission: PERMISSIONS.MASTER_DATA_MANAGE,
      },
      {
        name: "Part",
        path: "/master-part",
        permission: PERMISSIONS.PARTS_MANAGE,
      },
      {
        name: "Process",
        path: "/master-process",
        permission: PERMISSIONS.MASTER_DATA_MANAGE,
      },
    ],
  },
  {
    icon: <DownloadIcon />,
    iconClassName: "text-blue-500 dark:text-blue-400",
    name: "Stock In",
    path: "/stock-in",
    permission: PERMISSIONS.STOCK_IN_VIEW,
  },
  {
    icon: <RefreshIcon />,
    iconClassName: "text-amber-500 dark:text-amber-400",
    name: "Stock In Rework",
    path: "/stock-in-rework",
    permission: PERMISSIONS.STOCK_IN_VIEW,
  },
  {
    icon: <TimeIcon />,
    iconClassName: "text-cyan-500 dark:text-cyan-400",
    name: "Traceability Log",
    path: "/traceability-log",
    permission: PERMISSIONS.PROCESS_LOGS_VIEW,
  },
  {
    icon: <ListIcon />,
    iconClassName: "text-sky-500 dark:text-sky-400",
    name: "Process Log",
    path: "/process-log",
    permission: PERMISSIONS.PROCESS_LOGS_VIEW,
  },
  {
    icon: <DocsIcon />,
    iconClassName: "text-orange-500 dark:text-orange-400",
    name: "Print History",
    path: "/print-history",
    permission: PERMISSIONS.PRINT_HISTORY_VIEW,
  },
  {
    icon: <ListIcon />,
    iconClassName: "text-indigo-500 dark:text-indigo-400",
    name: "Logs",
    subItems: [
      {
        name: "System",
        path: "/logs/system",
        permission: PERMISSIONS.SYSTEM_LOGS_VIEW,
      },
      {
        name: "MQTT",
        path: "/logs/mqtt",
        permission: PERMISSIONS.MQTT_LOGS_VIEW,
      },
    ],
  },
  {
    icon: <UserIcon />,
    iconClassName: "text-rose-500 dark:text-rose-400",
    name: "User",
    path: "/user",
    permission: PERMISSIONS.USERS_MANAGE,
  },
  {
    icon: <PlugInIcon />,
    iconClassName: "text-purple-500 dark:text-purple-400",
    name: "App Configuration",
    path: "/app-configuration",
    permission: PERMISSIONS.APP_CONFIGURATION_MANAGE,
  },
];
