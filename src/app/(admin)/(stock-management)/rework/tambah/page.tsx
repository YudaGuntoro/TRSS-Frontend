import type { Metadata } from "next";
import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import ReworkCreateForm from "@/components/stock-rework/ReworkCreateForm";

export const metadata: Metadata = {
  title: "Tambah Rework | PT TRSS",
  description: "Scan QR dan validasi status issue number rework",
};

export default function ReworkCreatePage() {
  return (
    <div>
      <PageBreadcrumb pageTitle="Tambah Rework" />
      <ReworkCreateForm />
    </div>
  );
}
