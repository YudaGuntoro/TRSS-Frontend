import TraceabilityLogDetailView from "@/components/traceability-log/TraceabilityLogDetailView";
import type { Metadata } from "next";
import { notFound } from "next/navigation";

export const metadata: Metadata = {
  title: "Traceability Detail | PT TRSS",
  description: "Traceability log detail",
};

export default async function TraceabilityLogDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const traceabilityLogIdentifier = decodeURIComponent(id).trim();

  if (!traceabilityLogIdentifier) {
    notFound();
  }

  return <TraceabilityLogDetailView identifier={traceabilityLogIdentifier} />;
}
