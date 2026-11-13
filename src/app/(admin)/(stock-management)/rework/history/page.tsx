import type { Metadata } from "next";
import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import StockInReworkHistoryTable from "@/components/stock-rework/StockInReworkHistoryTable";

export const metadata: Metadata = {
  title: "History Rework | PT TRSS",
  description: "Riwayat hasil validasi rework per issue number",
};

export default function ReworkHistoryPage() {
  return (
    <div>
      <PageBreadcrumb pageTitle="History Rework" />
      <div className="mb-5 text-sm text-gray-500 dark:text-gray-400">
        <p>Hasil validasi rework per issue number, termasuk data yang masih pending.</p>
      </div>
      <StockInReworkHistoryTable includePending />
    </div>
  );
}
