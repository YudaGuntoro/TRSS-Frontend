import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import TraceabilityLogTable from "@/components/traceability-log/TraceabilityLogTable";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Traceability Log | PT TRSS",
  description: "Traceability log history",
};

export default function TraceabilityLogPage() {
  return (
    <div>
      <PageBreadcrumb pageTitle="Traceability Log" />
      <TraceabilityLogTable />
    </div>
  );
}
