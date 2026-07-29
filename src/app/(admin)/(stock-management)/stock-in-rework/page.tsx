import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import StockInReworkTabs from "@/components/stock-rework/StockInReworkTabs";
import { Metadata } from "next";
import { Suspense } from "react";

export const metadata: Metadata = {
  title: "Stock In Rework | PT TRSS",
  description: "Stock in rework management",
};

export default function StockInReworkPage() {
  return (
    <div>
      <PageBreadcrumb pageTitle="Stock In Rework" />
      <Suspense fallback={null}>
        <StockInReworkTabs />
      </Suspense>
    </div>
  );
}
