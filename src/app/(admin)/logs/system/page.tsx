import ComponentCard from "@/components/common/ComponentCard";
import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "System Logs | PT TRSS",
  description: "System Logs",
};

export default function SystemLogsPage() {
  return (
    <div>
      <PageBreadcrumb pageTitle="System Logs" />
      <ComponentCard title="System Logs">
        <p className="text-sm text-gray-500 dark:text-gray-400">
          System logs will be available here soon.
        </p>
      </ComponentCard>
    </div>
  );
}
