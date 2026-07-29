import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import StockInReworkHistoryTable from "@/components/stock-rework/StockInReworkHistoryTable";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Stock In Rework History | PT TRSS",
  description: "Stock in rework history",
};

export default function StockInReworkHistoryPage() {
  return (
    <div>
      <PageBreadcrumb pageTitle="Stock In Rework History" />
      <StockInReworkHistoryTable />
    </div>
  );
}
