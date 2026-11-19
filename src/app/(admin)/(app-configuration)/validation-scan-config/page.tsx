import ValidationScanConfigView from "@/components/app-configuration/ValidationScanConfigView";
import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Validation Scan Config | PT TRSS",
  description: "Dynamic validation scan status 2 message configuration",
};

export default function ValidationScanConfigPage() {
  return (
    <div>
      <PageBreadcrumb pageTitle="Validation Scan Config" />
      <ValidationScanConfigView />
    </div>
  );
}
