import ProcessLogDetailView from "@/components/process-log/ProcessLogDetailView";
import type { Metadata } from "next";
import { notFound } from "next/navigation";

export const metadata: Metadata = {
  title: "Process Detail | PT TRSS",
  description: "Process log traceability detail",
};

export default async function ProcessLogDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const processLogIdentifier = decodeURIComponent(id).trim();

  if (!processLogIdentifier) {
    notFound();
  }

  return <ProcessLogDetailView identifier={processLogIdentifier} />;
}
