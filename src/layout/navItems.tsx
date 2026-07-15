import React from "react";
import {
  BoxCubeIcon,
  GridIcon,
  PageIcon,
  TableIcon,
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
  path?: string;
  permission?: Permission;
  subItems?: NavSubItem[];
};

export const navItems: NavItem[] = [
  {
    icon: <GridIcon />,
    name: "Overview",
    path: "/",
    permission: PERMISSIONS.DASHBOARD_VIEW,
  },
  {
    icon: <BoxCubeIcon />,
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
    icon: <TableIcon />,
    name: "Stock In",
    path: "/stock-in",
    permission: PERMISSIONS.STOCK_IN_VIEW,
  },
  {
    icon: <TableIcon />,
    name: "Stock In Rework",
    path: "/stock-in-rework",
    permission: PERMISSIONS.STOCK_IN_VIEW,
  },
  {
    icon: <TableIcon />,
    name: "Stock In Rework History",
    path: "/stock-in-rework-history",
    permission: PERMISSIONS.STOCK_IN_VIEW,
  },
  {
    icon: <UserIcon />,
    name: "User",
    path: "/user",
    permission: PERMISSIONS.USERS_MANAGE,
  },
  {
    icon: <PageIcon />,
    name: "App Configuration",
    path: "/app-configuration",
    permission: PERMISSIONS.APP_CONFIGURATION_MANAGE,
  },
  {
    icon: <TimeIcon />,
    name: "Process Log",
    path: "/process-log",
    permission: PERMISSIONS.PROCESS_LOGS_VIEW,
  },
];
