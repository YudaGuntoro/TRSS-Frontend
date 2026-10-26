import type { Metadata } from "next";
import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import StockInReport from "@/components/reports/StockInReport";

export const metadata: Metadata = {
  title: "Stock In Report | PT TRSS",
  description: "Stock in report by period and part",
};

export default function StockInReportPage() {
  return (
    <div>
      <PageBreadcrumb pageTitle="Stock In" parentTitle="Report" />
      <StockInReport />
    </div>
  );
}
