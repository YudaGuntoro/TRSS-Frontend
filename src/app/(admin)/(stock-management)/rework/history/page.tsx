import type { Metadata } from "next";
import Link from "next/link";
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
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3 text-sm text-gray-500 dark:text-gray-400">
        <p>Hasil validasi rework per issue number, termasuk data yang masih pending.</p>
        <Link
          href="/stock-in-rework"
          className="inline-flex shrink-0 items-center justify-center rounded-lg bg-brand-500 px-4 py-3 text-sm font-medium text-white shadow-theme-xs transition hover:bg-brand-600 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500"
        >
          Kelola Disposition
        </Link>
      </div>
      <StockInReworkHistoryTable includePending />
    </div>
  );
}
