import { Metadata } from "next";
import { redirect } from "next/navigation";

export const metadata: Metadata = {
  title: "Stock In Rework History | PT TRSS",
  description: "Stock in rework history",
};

export default function StockInReworkHistoryPage() {
  redirect("/stock-in-rework?tab=history");
}
