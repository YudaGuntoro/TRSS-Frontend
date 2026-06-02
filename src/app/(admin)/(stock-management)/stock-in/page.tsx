import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import StockInTable from "@/components/stock/StockInTable";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Stock In | PT TRSS",
  description: "Stock in management",
};

export default function StockInPage() {
  return (
    <div>
      <PageBreadcrumb pageTitle="Stock In" />
      <StockInTable />
    </div>
  );
}
