import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import DataSummaryTable from "@/components/data-summary/DataSummaryTable";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Data Summary | PT TRSS",
  description: "Traceability data summary",
};

export default function DataSummaryPage() {
  return (
    <div>
      <PageBreadcrumb pageTitle="Data Summary" />
      <DataSummaryTable />
    </div>
  );
}
