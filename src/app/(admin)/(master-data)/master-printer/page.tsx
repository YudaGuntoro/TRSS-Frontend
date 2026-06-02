import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import PrinterTable from "@/components/master-data/PrinterTable";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Printers | PT TRSS",
  description: "Printer master data",
};

export default function PrinterPage() {
  return (
    <div>
      <PageBreadcrumb pageTitle="Printers" />
      <PrinterTable />
    </div>
  );
}
