import type { Metadata } from "next";
import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import TraceabilityReport from "@/components/reports/TraceabilityReport";

export const metadata: Metadata = {
  title: "Traceability Report | PT TRSS",
  description: "Finished goods traceability by Clinching and M-Fan serial numbers",
};

export default function TraceabilityReportPage() {
  return (
    <div>
      <PageBreadcrumb pageTitle="Traceability" parentTitle="Report" />
      <TraceabilityReport />
    </div>
  );
}
