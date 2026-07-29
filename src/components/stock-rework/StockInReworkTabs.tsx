"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import StockInReworkHistoryTable from "./StockInReworkHistoryTable";
import StockInReworkTable from "./StockInReworkTable";

type StockInReworkTab = "process" | "history";

const tabs: Array<{ label: string; value: StockInReworkTab }> = [
  { label: "Process", value: "process" },
  { label: "History", value: "history" },
];

export default function StockInReworkTabs() {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const activeTab: StockInReworkTab =
    searchParams.get("tab") === "history" ? "history" : "process";

  const handleTabChange = (nextTab: StockInReworkTab) => {
    const params = new URLSearchParams(searchParams.toString());

    if (nextTab === "history") {
      params.set("tab", "history");
    } else {
      params.delete("tab");
    }

    const query = params.toString();
    router.replace(query ? `${pathname}?${query}` : pathname, {
      scroll: false,
    });
  };

  return (
    <>
      <div className="mx-4 mt-4 inline-flex rounded-lg border border-gray-200 bg-gray-50 p-1 dark:border-white/[0.08] dark:bg-white/[0.04]">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.value;

          return (
            <button
              className={`h-9 rounded-md px-4 text-sm font-semibold transition-colors ${
                isActive
                  ? "bg-white text-brand-600 shadow-theme-xs dark:bg-gray-900 dark:text-brand-300"
                  : "text-gray-600 hover:text-gray-800 dark:text-gray-400 dark:hover:text-white/90"
              }`}
              key={tab.value}
              onClick={() => handleTabChange(tab.value)}
              type="button"
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {activeTab === "history" ? (
        <StockInReworkHistoryTable />
      ) : (
        <StockInReworkTable />
      )}
    </>
  );
}
