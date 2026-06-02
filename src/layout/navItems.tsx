import React from "react";
import {
  BoxCubeIcon,
  GridIcon,
  PageIcon,
  TableIcon,
  TimeIcon,
  UserIcon,
} from "../icons/index";

export type NavSubItem = {
  name: string;
  path: string;
  pro?: boolean;
  new?: boolean;
};

export type NavItem = {
  name: string;
  icon: React.ReactNode;
  path?: string;
  subItems?: NavSubItem[];
};

export const navItems: NavItem[] = [
  {
    icon: <GridIcon />,
    name: "Overview",
    path: "/",
  },
  {
    icon: <BoxCubeIcon />,
    name: "Master Data",
    subItems: [
      { name: "Parameter", path: "/parameter" },
      { name: "Part", path: "/master-part" },
      { name: "Printer", path: "/master-printer" },
      { name: "Process", path: "/master-process" },
    ],
  },
  {
    icon: <TableIcon />,
    name: "Stock In",
    path: "/stock-in",
  },
  {
    icon: <UserIcon />,
    name: "User",
    path: "/user",
  },
  {
    icon: <PageIcon />,
    name: "App Configuration",
    path: "/app-configuration",
  },
  {
    icon: <TimeIcon />,
    name: "Process Log",
    path: "/process-log",
  },
];
