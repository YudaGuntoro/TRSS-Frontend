import type { Metadata } from "next";
import React from "react";
import DashboardOverview from "@/components/dashboard/DashboardOverview";

export const metadata: Metadata = {
  title: "Dashboard | PT TRSS",
  description: "Production dashboard",
};

export default function Ecommerce() {
  return <DashboardOverview />;
}
