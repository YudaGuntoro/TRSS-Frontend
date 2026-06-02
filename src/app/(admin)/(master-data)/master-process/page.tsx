import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import ProcessTable from "@/components/master-data/ProcessTable";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Processes | PT TRSS",
  description: "Process master data",
};

export default function ProcessPage() {
  return (
    <div>
      <PageBreadcrumb pageTitle="Processes" />
      <ProcessTable />
    </div>
  );
}
