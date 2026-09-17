"use client";

import { formatShortDateTime as formatDate } from "@/utils/formatDateTime";
import dynamic from "next/dynamic";
import type { ApexOptions } from "apexcharts";
import { useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { RefreshActionIcon } from "@/components/ui/icons/ActionIcons";
import { useTheme } from "@/context/ThemeContext";
import { useDashboard } from "@/hooks/useDashboard";
import {
  DashboardChartItem,
  DashboardPeriodSummary,
  DashboardRecentLog,
  DashboardStatsPeriod,
} from "@/services/DashboardService";

const Chart = dynamic(() => import("react-apexcharts"), { ssr: false });

const dashboardPanel =
  "rounded-lg border bg-white shadow-theme-sm dark:bg-[#22243a] dark:shadow-[0_18px_50px_rgba(5,8,24,0.22)]";
const dashboardSubPanel =
  "rounded-lg bg-gray-50 dark:bg-[#1b1d31]";
const mutedText = "text-gray-500 dark:text-[#8f93ad]";
const okText = "text-[#008a3d] dark:text-[#22c55e]";
const ngText = "text-[#d00000] dark:text-[#ff3b30]";

const overviewBorder = {
  amber: "border-gray-200 dark:border-[#35384f]",
  blue: "border-gray-200 dark:border-[#35384f]",
  pink: "border-gray-200 dark:border-[#35384f]",
  teal: "border-gray-200 dark:border-[#35384f]",
};

const getChartTheme = (isDark: boolean) => ({
  grid: isDark ? "#34374F" : "#E4E7EC",
  mode: isDark ? "dark" : "light",
  panel: isDark ? "#22243A" : "#FFFFFF",
  text: isDark ? "#AEB5D7" : "#667085",
  tooltip: isDark ? "dark" : "light",
} as const);

const formatNumber = (value?: number) =>
  new Intl.NumberFormat("en-US").format(value ?? 0);

const formatPercent = (value?: number) => `${(value ?? 0).toFixed(2)}%`;

const statsPeriodOptions: Array<{
  label: string;
  value: DashboardStatsPeriod;
}> = [
  { label: "Day", value: "day" },
  { label: "Week", value: "week" },
  { label: "Month", value: "month" },
  { label: "Year", value: "year" },
];

const getTotal = (items: DashboardChartItem[]) =>
  items.reduce((total, item) => total + item.value, 0);

const getRate = (value?: number, total?: number) => {
  if (!value || !total) {
    return 0;
  }

  return Math.min(100, Math.max(0, (value / total) * 100));
};

const summaryToneClasses = {
  blue: {
    border: overviewBorder.blue,
    label: "text-[#0868c7] dark:text-[#8bc9ff]",
    topBorder: "border-t-[#1488ff]",
  },
  pink: {
    border: overviewBorder.pink,
    label: "text-[#c21887] dark:text-[#ff9bde]",
    topBorder: "border-t-[#ff2fb3]",
  },
  teal: {
    border: overviewBorder.teal,
    label: "text-[#087866] dark:text-[#8ff5df]",
    topBorder: "border-t-[#4ceac6]",
  },
  amber: {
    border: overviewBorder.amber,
    label: "text-[#a46300] dark:text-[#ffd27a]",
    topBorder: "border-t-[#ffb31a]",
  },
};

function LoadingBlock({ className = "" }: { className?: string }) {
  return (
    <div
      className={`animate-pulse rounded-md bg-gray-100 dark:bg-[#30324a] ${className}`}
    />
  );
}

function SummaryCard({
  isLoading,
  label,
  summary,
  tone = "teal",
}: {
  isLoading: boolean;
  label: string;
  summary?: DashboardPeriodSummary;
  tone?: keyof typeof summaryToneClasses;
}) {
  const classes = summaryToneClasses[tone];
  const totalProduction = summary?.totalProduction ?? 0;
  const okRate = getRate(summary?.okCount, totalProduction);
  const ngRate = getRate(summary?.ngCount, totalProduction);

  return (
    <div
      className={`${dashboardPanel} overflow-hidden border-t-4 p-5 ${classes.border} ${classes.topBorder}`}
    >
      <div className="flex items-start">
        <div>
          <p className={`text-xs font-semibold uppercase ${classes.label}`}>
            {label}
          </p>
          {isLoading ? (
            <LoadingBlock className="mt-4 h-9 w-32" />
          ) : (
            <h3 className="mt-2 text-3xl font-semibold text-gray-900 dark:text-white">
              {formatNumber(totalProduction)}
            </h3>
          )}
        </div>
      </div>

      {isLoading ? (
        <div className="mt-6 grid grid-cols-3 gap-3">
          <LoadingBlock className="h-12" />
          <LoadingBlock className="h-12" />
          <LoadingBlock className="h-12" />
        </div>
      ) : (
        <div className="mt-6 grid grid-cols-3 gap-3">
          <div className={`${dashboardSubPanel} px-4 py-3.5`}>
            <p className={`text-sm font-medium ${mutedText}`}>OK</p>
            <p className={`mt-3 text-xl font-semibold ${okText}`}>
              {formatNumber(summary?.okCount)}
            </p>
          </div>
          <div className={`${dashboardSubPanel} px-4 py-3.5`}>
            <p className={`text-sm font-medium ${mutedText}`}>NG</p>
            <p className={`mt-3 text-xl font-semibold ${ngText}`}>
              {formatNumber(summary?.ngCount)}
            </p>
          </div>
          <div className={`${dashboardSubPanel} px-4 py-3.5`}>
            <p className={`text-sm font-medium ${mutedText}`}>Yield</p>
            <p className="mt-3 text-xl font-semibold text-gray-900 dark:text-white">
              {formatPercent(summary?.yieldRate)}
            </p>
          </div>
        </div>
      )}

      {!isLoading && (
        <div className="mt-5 space-y-2">
          <div className="h-1.5 overflow-hidden rounded-full bg-gray-100 dark:bg-[#171829]">
            <div
              className="h-full rounded-full bg-[#008a3d]"
              style={{ width: `${okRate}%` }}
            />
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-gray-100 dark:bg-[#171829]">
            <div
              className="h-full rounded-full bg-[#d00000]"
              style={{ width: `${ngRate}%` }}
            />
          </div>
        </div>
      )}
    </div>
  );
}

function ProductionTrendChart({
  data,
  isDark,
  isLoading,
  periodLabel,
}: {
  data: DashboardChartItem[];
  isDark: boolean;
  isLoading: boolean;
  periodLabel: string;
}) {
  const total = getTotal(data);
  const chartTheme = getChartTheme(isDark);
  const categories = data.map((item) => item.label);
  const seriesData = data.map((item) => item.value);
  const chartKey = `${categories.join("|")}:${seriesData.join("|")}`;
  const options: ApexOptions = {
    chart: {
      background: "transparent",
      fontFamily: "Outfit, sans-serif",
      foreColor: chartTheme.text,
      toolbar: { show: false },
      type: "line",
    },
    colors: ["#4CEAC6"],
    dataLabels: { enabled: false },
    grid: {
      borderColor: chartTheme.grid,
      strokeDashArray: 0,
      xaxis: { lines: { show: false } },
      yaxis: { lines: { show: true } },
    },
    markers: {
      colors: ["#4CEAC6"],
      size: 3,
      strokeColors: chartTheme.panel,
      strokeWidth: 2,
    },
    stroke: {
      curve: "smooth",
      width: 3,
    },
    theme: {
      mode: chartTheme.mode,
    },
    tooltip: {
      theme: chartTheme.tooltip,
      y: {
        formatter: (value: number) => `${value} units`,
      },
    },
    xaxis: {
      axisBorder: { color: chartTheme.grid },
      axisTicks: { color: chartTheme.grid },
      categories,
      labels: {
        hideOverlappingLabels: true,
        style: { colors: chartTheme.text, fontSize: "12px" },
      },
    },
    yaxis: {
      labels: {
        style: { colors: [chartTheme.text], fontSize: "12px" },
      },
      min: 0,
    },
  };

  return (
    <div className={`${dashboardPanel} ${overviewBorder.teal} p-5`}>
      <div className="mb-4 flex items-start justify-between gap-4">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Production Trend
          </h3>
          <p className={`mt-1 text-sm ${mutedText}`}>
            {periodLabel} production volume
          </p>
        </div>
        <div className="text-right">
          <p className={mutedText + " text-xs font-medium uppercase"}>
            Total
          </p>
          <p className="mt-1 text-xl font-semibold text-[#4ceac6]">
            {isLoading ? "-" : formatNumber(total)}
          </p>
        </div>
      </div>

      {isLoading ? (
        <LoadingBlock className="h-[310px]" />
      ) : (
        <div className="w-full">
          <Chart
            key={chartKey}
            height={310}
            options={options}
            series={[{ data: seriesData, name: "Production" }]}
            type="line"
            width="100%"
          />
        </div>
      )}
    </div>
  );
}

function QualityDistributionChart({
  data,
  isDark,
  isLoading,
  periodLabel,
}: {
  data: DashboardChartItem[];
  isDark: boolean;
  isLoading: boolean;
  periodLabel: string;
}) {
  const total = getTotal(data);
  const chartTheme = getChartTheme(isDark);
  const options: ApexOptions = {
    chart: {
      background: "transparent",
      fontFamily: "Outfit, sans-serif",
      foreColor: chartTheme.text,
      type: "donut",
    },
    colors: ["#1488FF", "#FF2FB3", "#4CEAC6", "#FFB31A"],
    dataLabels: {
      enabled: true,
      dropShadow: {
        blur: 2,
        color: "#111827",
        enabled: true,
        opacity: 0.45,
        top: 1,
      },
      style: {
        colors: ["#FFFFFF"],
        fontSize: "14px",
        fontWeight: 900,
      },
    },
    labels: data.map((item) => item.label),
    legend: {
      fontFamily: "Outfit",
      fontSize: "14px",
      fontWeight: 600,
      labels: {
        colors: chartTheme.text,
      },
      markers: {
        size: 6,
      },
      position: "right",
    },
    plotOptions: {
      pie: {
        donut: {
          size: "62%",
          labels: {
            show: true,
            name: {
              color: chartTheme.text,
            },
            total: {
              color: chartTheme.text,
              formatter: () => String(total),
              label: "Total",
              show: true,
            },
            value: {
              color: chartTheme.text,
            },
          },
        },
      },
    },
    stroke: {
      colors: [chartTheme.panel],
      width: 4,
    },
    theme: {
      mode: chartTheme.mode,
    },
    tooltip: {
      enabled: false,
    },
  };

  return (
    <div
      className={`${dashboardPanel} quality-distribution-chart ${overviewBorder.pink} p-5`}
    >
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
        Quality Distribution
      </h3>
      <p className={`mt-1 text-sm ${mutedText}`}>
        OK vs NG production result, {periodLabel.toLowerCase()}
      </p>

      {isLoading ? (
        <LoadingBlock className="mt-5 h-[260px]" />
      ) : data.length === 0 || total === 0 ? (
        <div className="mt-5 flex h-[260px] items-center justify-center rounded-md border border-dashed border-gray-300 bg-gray-50 text-sm text-gray-500 dark:border-[#3a3d58] dark:bg-[#1b1d31] dark:text-[#8f93ad]">
          No production data
        </div>
      ) : (
        <Chart
          height={260}
          options={options}
          series={data.map((item) => item.value)}
          type="donut"
        />
      )}
    </div>
  );
}

function TopPartsChart({
  data,
  isDark,
  isLoading,
  periodLabel,
}: {
  data: DashboardChartItem[];
  isDark: boolean;
  isLoading: boolean;
  periodLabel: string;
}) {
  const chartTheme = getChartTheme(isDark);
  const options: ApexOptions = {
    chart: {
      background: "transparent",
      fontFamily: "Outfit, sans-serif",
      foreColor: chartTheme.text,
      toolbar: { show: false },
      type: "bar",
    },
    colors: ["#69B7FF"],
    dataLabels: { enabled: false },
    grid: {
      borderColor: chartTheme.grid,
      xaxis: { lines: { show: true } },
      yaxis: { lines: { show: false } },
    },
    plotOptions: {
      bar: {
        borderRadius: 3,
        distributed: true,
        horizontal: true,
      },
    },
    theme: {
      mode: chartTheme.mode,
    },
    tooltip: {
      theme: chartTheme.tooltip,
      y: {
        formatter: (value: number) => `${value} units`,
      },
    },
    xaxis: {
      categories: data.map((item) => item.label),
      labels: {
        style: { colors: chartTheme.text, fontSize: "12px" },
      },
    },
    yaxis: {
      labels: {
        style: { colors: [chartTheme.text], fontSize: "12px" },
      },
    },
  };

  return (
    <div className={`${dashboardPanel} ${overviewBorder.blue} p-5`}>
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
        Top Parts Production
      </h3>
      <p className={`mt-1 text-sm ${mutedText}`}>
        Highest produced part numbers, {periodLabel.toLowerCase()}
      </p>

      {isLoading ? (
        <LoadingBlock className="mt-5 h-[260px]" />
      ) : data.length === 0 ? (
        <div className="mt-5 flex h-[260px] items-center justify-center rounded-md border border-dashed border-gray-300 bg-gray-50 text-sm text-gray-500 dark:border-[#3a3d58] dark:bg-[#1b1d31] dark:text-[#8f93ad]">
          No production data
        </div>
      ) : (
        <Chart
          height={260}
          options={options}
          series={[{ data: data.map((item) => item.value), name: "Production" }]}
          type="bar"
        />
      )}
    </div>
  );
}

function TotalQualityPanel({
  isLoading,
  summary,
}: {
  isLoading: boolean;
  summary?: DashboardPeriodSummary;
}) {
  return (
    <div className="grid h-full grid-cols-2 gap-3 sm:gap-4">
      <div className={`${dashboardPanel} ${overviewBorder.teal} p-4 sm:p-5`}>
        <div className="flex h-9 w-9 items-center justify-center rounded-md bg-[#008a3d]/10 text-[#008a3d] ring-1 ring-[#008a3d]/25 dark:text-[#22c55e] dark:ring-[#22c55e]/25 sm:h-11 sm:w-11">
          <svg
            aria-hidden="true"
            className="block size-4 sm:size-5"
            fill="none"
            viewBox="0 0 24 24"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M8 12.5l2.6 2.6L16.5 9"
              stroke="currentColor"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
            />
            <path
              d="M21 12a9 9 0 1 1-3.1-6.8"
              stroke="currentColor"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
            />
          </svg>
        </div>
        <p className={`mt-4 text-xs font-semibold sm:text-sm ${okText}`}>Total OK</p>
        <h3 className="mt-1.5 text-2xl font-semibold text-gray-900 dark:text-white sm:text-3xl">
          {isLoading ? "-" : formatNumber(summary?.okCount)}
        </h3>
      </div>

      <div className={`${dashboardPanel} ${overviewBorder.pink} p-4 sm:p-5`}>
        <div className="flex h-9 w-9 items-center justify-center rounded-md bg-[#d00000]/10 text-[#d00000] ring-1 ring-[#d00000]/25 dark:text-[#ff3b30] dark:ring-[#ff3b30]/25 sm:h-11 sm:w-11">
          <svg
            aria-hidden="true"
            className="block size-4 sm:size-5"
            fill="none"
            viewBox="0 0 24 24"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M12 8.25v5"
              stroke="currentColor"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
            />
            <path
              d="M12 17.25h.01"
              stroke="currentColor"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2.5"
            />
            <path
              d="M10.35 4.55 2.7 18a2 2 0 0 0 1.74 3h15.12a2 2 0 0 0 1.74-3L13.65 4.55a1.9 1.9 0 0 0-3.3 0Z"
              stroke="currentColor"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
            />
          </svg>
        </div>
        <p className={`mt-4 text-xs font-semibold sm:text-sm ${ngText}`}>Total NG</p>
        <h3 className="mt-1.5 text-2xl font-semibold text-gray-900 dark:text-white sm:text-3xl">
          {isLoading ? "-" : formatNumber(summary?.ngCount)}
        </h3>
      </div>

      <div className={`${dashboardPanel} ${overviewBorder.blue} col-span-2 p-4 sm:p-5`}>
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-[#0868c7] dark:text-[#8bc9ff]">
              Overall Yield Rate
            </p>
            <h3 className="mt-2 text-3xl font-semibold text-gray-900 dark:text-white sm:text-4xl">
              {isLoading ? "-" : formatPercent(summary?.yieldRate)}
            </h3>
          </div>
          <div className="flex h-10 w-10 items-center justify-center rounded-md bg-[#1488ff]/10 text-[#1488ff] ring-1 ring-[#1488ff]/20 dark:bg-[#1488ff]/12 dark:text-[#60b8ff] dark:ring-[#1488ff]/25 sm:h-11 sm:w-11">
            <svg
              aria-hidden="true"
              className="block size-5"
              fill="none"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M12 3v9h9"
                stroke="currentColor"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
              />
              <path
                d="M20.5 15.5A9 9 0 1 1 8.5 3.5"
                stroke="currentColor"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
              />
              <path
                d="M15 3.5A9 9 0 0 1 20.5 9H15V3.5Z"
                stroke="currentColor"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
              />
            </svg>
          </div>
        </div>
        <div className="mt-5 h-2 overflow-hidden rounded-full bg-gray-100 dark:bg-[#171829]">
          <div
            className="h-full rounded-full bg-gradient-to-r from-[#1488ff] via-[#4ceac6] to-[#ffb31a]"
            style={{ width: `${Math.min(100, summary?.yieldRate ?? 0)}%` }}
          />
        </div>
      </div>
    </div>
  );
}

function getLogStatus(log: DashboardRecentLog) {
  if (typeof log.status === "boolean") {
    return log.status ? "OK" : "NG";
  }

  return log.isActive ? "Active" : "Inactive";
}

function getLogIssueNumbers(log: DashboardRecentLog, issueType: string) {
  const issueNumbers = Array.from(
    new Set(
      log.issues
        .filter((issue) => issue.issueType === issueType)
        .map((issue) => issue.issueNumber)
        .filter(Boolean)
    )
  ) as string[];

  if (issueNumbers.length > 0) {
    return issueNumbers;
  }

  return [];
}

function RecentLogsTable({
  data,
  isLoading,
}: {
  data: DashboardRecentLog[];
  isLoading: boolean;
}) {
  return (
    <div
      className={`${dashboardPanel} ${overviewBorder.blue} overflow-hidden px-4 pb-4 pt-5 sm:px-5`}
    >
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <h3 className="text-base font-semibold text-gray-900 dark:text-white sm:text-lg">
            Recent Traceability Logs
          </h3>
          <p className={`mt-1 text-xs sm:text-sm ${mutedText}`}>
            Latest traceability log activity
          </p>
        </div>
        <span className="inline-flex shrink-0 items-center rounded-full border border-[#1488ff]/25 bg-[#1488ff]/10 px-2.5 py-1 text-xs font-semibold text-[#0868c7] dark:border-[#1488ff]/30 dark:text-[#8bc9ff] sm:px-3">
          {data.length} logs
        </span>
      </div>

      <div className="space-y-3 md:hidden">
        {isLoading &&
          Array.from({ length: 3 }).map((_, index) => (
            <LoadingBlock className="h-28" key={index} />
          ))}

        {!isLoading &&
          data.map((log) => <RecentLogMobileCard key={log.id} log={log} />)}

        {!isLoading && data.length === 0 && (
          <div className="rounded-md border border-dashed border-gray-300 bg-gray-50 px-4 py-8 text-center text-sm text-gray-500 dark:border-[#3a3d58] dark:bg-[#1b1d31] dark:text-[#8f93ad]">
            No recent traceability logs found
          </div>
        )}
      </div>

      <div className="hidden max-w-full overflow-x-auto rounded-md border border-gray-200 bg-white dark:border-[#34374f] dark:bg-[#1b1d31] md:block">
        <Table>
          <TableHeader>
            <TableRow>
              <TableCell
                isHeader
                className="min-w-48 px-4 py-3 text-start text-theme-xs font-semibold uppercase text-white"
              >
                Serial Clinching
              </TableCell>
              <TableCell
                isHeader
                className="min-w-48 px-4 py-3 text-start text-theme-xs font-semibold uppercase text-white"
              >
                Serial M-Fan
              </TableCell>
              <TableCell
                isHeader
                className="min-w-64 px-4 py-3 text-center text-theme-xs font-semibold uppercase text-white"
              >
                Issue Clinching
              </TableCell>
              <TableCell
                isHeader
                className="min-w-64 px-4 py-3 text-center text-theme-xs font-semibold uppercase text-white"
              >
                Issue M-Fan
              </TableCell>
              <TableCell
                isHeader
                className="min-w-28 px-4 py-3 text-start text-theme-xs font-semibold uppercase text-white"
              >
                Status
              </TableCell>
              <TableCell
                isHeader
                className="min-w-40 px-4 py-3 text-start text-theme-xs font-semibold uppercase text-white"
              >
                Created At
              </TableCell>
            </TableRow>
          </TableHeader>

          <TableBody className="divide-y divide-gray-100 dark:divide-[#34374f]">
            {isLoading &&
              Array.from({ length: 5 }).map((_, index) => (
                <TableRow key={index}>
                  {Array.from({ length: 6 }).map((__, cellIndex) => (
                    <TableCell key={cellIndex} className="px-4 py-4">
                      <LoadingBlock className="h-4 w-full" />
                    </TableCell>
                  ))}
                </TableRow>
              ))}

            {!isLoading && data.length === 0 && (
              <TableRow>
                <TableCell
                  className="px-4 py-8 text-center text-sm text-gray-500 dark:text-[#8f93ad]"
                  colSpan={6}
                >
                  No recent traceability logs found
                </TableCell>
              </TableRow>
            )}

            {!isLoading &&
              data.map((log, index) => (
                <TableRow
                  className={
                    index % 2 === 0
                      ? "bg-white dark:bg-[#22243a]"
                      : "bg-gray-50 dark:bg-[#1d1f33]"
                  }
                  key={log.id}
                >
                  <TableCell className="px-4 py-4 text-theme-sm font-semibold text-gray-900 dark:text-white">
                    <p
                      className="max-w-[260px] truncate"
                      title={log.serialNumberClinching ?? log.serialNumberCode ?? "-"}
                    >
                      {log.serialNumberClinching ?? log.serialNumberCode ?? "-"}
                    </p>
                  </TableCell>
                  <TableCell className="px-4 py-4 text-theme-sm font-semibold text-gray-900 dark:text-white">
                    <p
                      className="max-w-[260px] truncate"
                      title={log.serialNumberMFan ?? "-"}
                    >
                      {log.serialNumberMFan ?? "-"}
                    </p>
                  </TableCell>
                  <TableCell className="px-4 py-4">
                    <div className="flex flex-wrap gap-2">
                      {getLogIssueNumbers(log, "Clinching").length > 0 ? (
                        getLogIssueNumbers(log, "Clinching").map((issueNumber) => (
                          <span
                            className="inline-flex rounded-full border border-[#1488ff]/25 bg-[#1488ff]/10 px-2.5 py-1 text-xs font-semibold text-[#0868c7] dark:border-[#1488ff]/30 dark:text-[#8bc9ff]"
                            key={issueNumber}
                          >
                            {issueNumber}
                          </span>
                        ))
                      ) : (
                        <span className="text-theme-sm text-gray-500 dark:text-[#8f93ad]">
                          -
                        </span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="px-4 py-4">
                    <div className="flex flex-wrap gap-2">
                      {getLogIssueNumbers(log, "M-Fan").length > 0 ? (
                        getLogIssueNumbers(log, "M-Fan").map((issueNumber) => (
                          <span
                            className="inline-flex rounded-full border border-[#4ceac6]/25 bg-[#4ceac6]/10 px-2.5 py-1 text-xs font-semibold text-[#087866] dark:border-[#4ceac6]/30 dark:text-[#8ff5df]"
                            key={issueNumber}
                          >
                            {issueNumber}
                          </span>
                        ))
                      ) : (
                        <span className="text-theme-sm text-gray-500 dark:text-[#8f93ad]">
                          -
                        </span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="px-4 py-4">
                    <span
                      className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${getLogStatus(log) === "OK" || getLogStatus(log) === "Active"
                          ? "bg-[#008a3d]/10 text-[#008a3d] dark:text-[#22c55e]"
                          : "bg-[#d00000]/10 text-[#d00000] dark:text-[#ff3b30]"
                        }`}
                    >
                      {getLogStatus(log)}
                    </span>
                  </TableCell>
                  <TableCell className="px-4 py-4 text-theme-sm text-gray-700 dark:text-[#c7cceb]">
                    {formatDate(log.createdAt)}
                  </TableCell>
                </TableRow>
              ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

function RecentLogMobileCard({ log }: { log: DashboardRecentLog }) {
  const clinchingIssues = getLogIssueNumbers(log, "Clinching");
  const mfanIssues = getLogIssueNumbers(log, "M-Fan");
  const status = getLogStatus(log);

  return (
    <article className="rounded-md border border-gray-200 bg-white p-3 dark:border-[#34374f] dark:bg-[#1b1d31]">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate font-mono text-sm font-semibold text-gray-900 dark:text-white">
            {log.serialNumberClinching ?? log.serialNumberCode ?? "-"}
          </p>
          <p className="mt-0.5 truncate font-mono text-xs text-gray-500 dark:text-[#8f93ad]">
            M-Fan: {log.serialNumberMFan ?? "-"}
          </p>
        </div>
        <span
          className={`inline-flex shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold ${
            status === "OK" || status === "Active"
              ? "bg-[#008a3d]/10 text-[#008a3d] dark:text-[#22c55e]"
              : "bg-[#d00000]/10 text-[#d00000] dark:text-[#ff3b30]"
          }`}
        >
          {status}
        </span>
      </div>

      <div className="mt-3 grid grid-cols-1 gap-2 rounded-md bg-gray-50 p-3 dark:bg-[#22243a]">
        <IssueSummary label="Issue Clinching" issues={clinchingIssues} tone="blue" />
        <IssueSummary label="Issue M-Fan" issues={mfanIssues} tone="teal" />
        <div className="flex min-w-0 items-center gap-1.5">
          <span className="shrink-0 text-[10px] font-semibold uppercase text-gray-400">
            Created
          </span>
          <span className="truncate font-mono text-xs font-semibold text-gray-800 dark:text-[#c7cceb]">
            {formatDate(log.createdAt)}
          </span>
        </div>
      </div>
    </article>
  );
}

function IssueSummary({
  issues,
  label,
  tone,
}: {
  issues: string[];
  label: string;
  tone: "blue" | "teal";
}) {
  const chipClass =
    tone === "blue"
      ? "border-[#1488ff]/25 bg-[#1488ff]/10 text-[#0868c7] dark:border-[#1488ff]/30 dark:text-[#8bc9ff]"
      : "border-[#4ceac6]/25 bg-[#4ceac6]/10 text-[#087866] dark:border-[#4ceac6]/30 dark:text-[#8ff5df]";

  return (
    <div className="min-w-0">
      <p className="mb-1 text-[10px] font-semibold uppercase text-gray-400">
        {label}
      </p>
      <div className="flex min-w-0 flex-wrap gap-1">
        {issues.length > 0 ? (
          issues.map((issue) => (
            <span
              className={`inline-flex max-w-full rounded-full border px-2 py-0.5 font-mono text-[11px] font-semibold ${chipClass}`}
              key={issue}
            >
              <span className="truncate">{issue}</span>
            </span>
          ))
        ) : (
          <span className="text-xs text-gray-500 dark:text-[#8f93ad]">-</span>
        )}
      </div>
    </div>
  );
}

export default function DashboardOverview() {
  const [statsPeriod, setStatsPeriod] =
    useState<DashboardStatsPeriod>("day");
  const { error, isLoading, recentLogs, refetch, stats, summary } =
    useDashboard(10, statsPeriod);
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const statsPeriodLabel =
    statsPeriodOptions.find((option) => option.value === statsPeriod)?.label ??
    "Day";

  return (
    <div className="-m-4 min-h-[calc(100vh-88px)] bg-gray-50 p-4 text-gray-900 dark:bg-[#171829] dark:text-white md:-m-6 md:p-6">
      <div className="space-y-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#087866] dark:text-[#4ceac6]">
              PT TRSS
            </p>
            <h1 className="mt-2 text-2xl font-semibold text-gray-900 dark:text-white">
              Overview Dashboard
            </h1>
            <p className={`mt-1 text-sm ${mutedText}`}>
              Production output, quality status, and latest traceability logs
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="inline-flex h-10 overflow-hidden rounded-md border border-gray-200 bg-white p-1 dark:border-[#35384f] dark:bg-[#22243a]">
              {statsPeriodOptions.map((option) => (
                <button
                  className={`rounded px-3 text-sm font-semibold transition-colors ${
                    statsPeriod === option.value
                      ? "bg-[#1488ff]/12 text-[#0868c7] dark:bg-[#1488ff]/16 dark:text-[#8bc9ff]"
                      : "text-[#0868c7] hover:bg-[#1488ff]/8 hover:text-[#0759aa] dark:text-[#8bc9ff] dark:hover:bg-[#1488ff]/12 dark:hover:text-white"
                  }`}
                  disabled={isLoading && statsPeriod === option.value}
                  key={option.value}
                  onClick={() => setStatsPeriod(option.value)}
                  type="button"
                >
                  {option.label}
                </button>
              ))}
            </div>
            <button
              aria-label="Refresh dashboard"
              className="inline-flex size-10 items-center justify-center rounded-md border border-[#1488ff]/25 bg-[#1488ff]/12 text-[#0868c7] leading-none transition-colors hover:bg-[#1488ff]/20 disabled:cursor-not-allowed disabled:opacity-60 dark:border-[#1488ff]/35 dark:text-[#8bc9ff] dark:hover:bg-[#1488ff]/18"
              disabled={isLoading}
              onClick={refetch}
              title="Refresh"
              type="button"
            >
              <span className="inline-flex size-[18px] items-center justify-center leading-none">
                <RefreshActionIcon />
              </span>
            </button>
          </div>
        </div>

        {error && (
          <div className="rounded-md border border-[#ff5b8a]/25 bg-[#ff5b8a]/10 px-4 py-3 text-sm text-[#b4234c] dark:border-[#ff5b8a]/30 dark:text-[#ff9bb6]">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 gap-4 md:grid-cols-3 md:gap-5">
          <SummaryCard
            isLoading={isLoading}
            label="Today Production"
            summary={summary?.today}
            tone="teal"
          />
          <SummaryCard
            isLoading={isLoading}
            label="This Month"
            summary={summary?.thisMonth}
            tone="amber"
          />
          <SummaryCard
            isLoading={isLoading}
            label="Total Production"
            summary={summary?.total}
            tone="blue"
          />
        </div>

        <div className="grid grid-cols-12 gap-4 md:gap-5">
          <div className="col-span-12 xl:col-span-8">
            <ProductionTrendChart
              data={stats?.productionTrend ?? []}
              isDark={isDark}
              isLoading={isLoading}
              periodLabel={statsPeriodLabel}
            />
          </div>
          <div className="col-span-12 xl:col-span-4">
            <QualityDistributionChart
              data={stats?.qualityDistribution ?? []}
              isDark={isDark}
              isLoading={isLoading}
              periodLabel={statsPeriodLabel}
            />
          </div>
          <div className="col-span-12 xl:col-span-4">
            <TopPartsChart
              data={stats?.topPartsProduction ?? []}
              isDark={isDark}
              isLoading={isLoading}
              periodLabel={statsPeriodLabel}
            />
          </div>
          <div className="col-span-12 xl:col-span-8">
            <TotalQualityPanel
              isLoading={isLoading}
              summary={summary?.total}
            />
          </div>
          <div className="col-span-12">
            <RecentLogsTable data={recentLogs} isLoading={isLoading} />
          </div>
        </div>
      </div>
    </div>
  );
}
