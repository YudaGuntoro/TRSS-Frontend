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
  const processLogId = Number(id);

  if (!Number.isInteger(processLogId) || processLogId <= 0) {
    notFound();
  }

  return <ProcessLogDetailView id={processLogId} />;
}
