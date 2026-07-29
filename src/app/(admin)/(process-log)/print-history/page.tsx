import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import PrintHistoryTable from "@/components/print-history/PrintHistoryTable";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Print History | PT TRSS",
  description: "Print history",
};

export default function PrintHistoryPage() {
  return (
    <div>
      <PageBreadcrumb pageTitle="Print History" />
      <PrintHistoryTable />
    </div>
  );
}
