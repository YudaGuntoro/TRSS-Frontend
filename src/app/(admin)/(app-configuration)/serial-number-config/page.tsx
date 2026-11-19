import SerialNumberConfigView from "@/components/app-configuration/SerialNumberConfigView";
import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Serial Number Configuration | PT TRSS",
  description: "Serial number sequence settings stored in App Config",
};

export default function SerialNumberConfigPage() {
  return (
    <div>
      <PageBreadcrumb pageTitle="Serial Number Configuration" />
      <SerialNumberConfigView />
    </div>
  );
}
