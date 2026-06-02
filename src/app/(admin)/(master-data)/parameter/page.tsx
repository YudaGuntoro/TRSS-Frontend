import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import ParameterTable from "@/components/master-data/ParameterTable";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Parameters | PT TRSS",
  description: "Parameter master data",
};

export default function ParameterPage() {
  return (
    <div>
      <PageBreadcrumb pageTitle="Parameters" />
      <ParameterTable />
    </div>
  );
}
