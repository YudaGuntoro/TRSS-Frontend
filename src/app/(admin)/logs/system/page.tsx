import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import SystemLogTable from "@/components/tables/SystemLogTable";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "System Logs | PT TRSS",
  description: "System Logs",
};

export default function SystemLogsPage() {
  return (
    <div>
      <PageBreadcrumb pageTitle="System Logs" />
      <SystemLogTable />
    </div>
  );
}
