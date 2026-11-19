import PrinterConfigView from "@/components/app-configuration/PrinterConfigView";
import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Printer & Label Configuration | PT TRSS",
  description: "Printer and label settings stored in App Config",
};

export default function PrinterConfigPage() {
  return (
    <div>
      <PageBreadcrumb pageTitle="Printer & Label Configuration" />
      <PrinterConfigView />
    </div>
  );
}
