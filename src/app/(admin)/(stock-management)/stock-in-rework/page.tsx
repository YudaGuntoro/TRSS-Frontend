import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import StockInReworkTable from "@/components/stock-rework/StockInReworkTable";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Stock In Rework | PT TRSS",
  description: "Stock in rework management",
};

export default function StockInReworkPage() {
  return (
    <div>
      <PageBreadcrumb pageTitle="Stock In Rework" />
      <StockInReworkTable />
    </div>
  );
}
