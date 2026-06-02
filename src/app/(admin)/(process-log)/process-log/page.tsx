import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import ProcessLogTable from "@/components/process-log/ProcessLogTable";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Process Log | PT TRSS",
  description: "Process log history",
};

export default function ProcessLogPage() {
  return (
    <div>
      <PageBreadcrumb pageTitle="Process Log" />
      <ProcessLogTable />
    </div>
  );
}
