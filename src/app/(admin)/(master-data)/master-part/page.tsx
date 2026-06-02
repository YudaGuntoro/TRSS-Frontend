import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import PartTable from "@/components/master-data/PartTable";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Parts | PT TRSS",
  description: "Part master data",
};

export default function PartPage() {
  return (
    <div>
      <PageBreadcrumb pageTitle="Parts" />
      <PartTable />
    </div>
  );
}
