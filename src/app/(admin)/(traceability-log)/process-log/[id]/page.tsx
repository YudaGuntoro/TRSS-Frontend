import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import ProcessLogDetailView from "@/components/process-log/ProcessLogDetailView";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Process Log Detail | PT TRSS",
  description: "Process log details and parameters",
};

export default async function ProcessLogDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  return (
    <div>
      <PageBreadcrumb pageTitle="Process Log Detail" />
      <ProcessLogDetailView key={id} serialNumber={id} />
    </div>
  );
}
