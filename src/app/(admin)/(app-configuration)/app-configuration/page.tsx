import AppConfigTable from "@/components/app-configuration/AppConfigTable";
import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "App Configuration | PT TRSS",
  description: "Application configuration management",
};

export default function AppConfigurationPage() {
  return (
    <div>
      <PageBreadcrumb pageTitle="App Configuration" />
      <AppConfigTable />
    </div>
  );
}
