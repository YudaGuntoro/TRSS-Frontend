"use client";

import dynamic from "next/dynamic";
import type { ApexOptions } from "apexcharts";
import type { ReactNode } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useTheme } from "@/context/ThemeContext";
import { useDashboard } from "@/hooks/useDashboard";
import {
  AlertIcon,
  BoxIconLine,
  CheckCircleIcon,
  PieChartIcon,
  TimeIcon,
} from "@/icons";
import {
  DashboardChartItem,
  DashboardPeriodSummary,
  DashboardRecentLog,
} from "@/services/DashboardService";

const Chart = dynamic(() => import("react-apexcharts"), { ssr: false });

const dateFormatter = new Intl.DateTimeFormat("en-GB", {
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  month: "short",
  year: "numeric",
});

const dashboardPanel =
  "rounded-lg border bg-white shadow-theme-sm dark:bg-[#22243a] dark:shadow-[0_18px_50px_rgba(5,8,24,0.22)]";
const dashboardSubPanel =
  "rounded-lg bg-gray-50 dark:bg-[#1b1d31]";
const mutedText = "text-gray-500 dark:text-[#8f93ad]";

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

const formatDate = (value?: string) => {
  if (!value) {
    return "-";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "-";
  }

  return dateFormatter.format(date);
};

const formatNumber = (value?: number) =>
  new Intl.NumberFormat("en-US").format(value ?? 0);

const formatPercent = (value?: number) => `${(value ?? 0).toFixed(2)}%`;

const formatLogValue = (value: string | number | boolean) => {
  if (typeof value === "boolean") {
    return value ? "OK" : "NG";
  }

  return String(value);
};

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
    accent: "bg-[#1488ff]",
    border: overviewBorder.blue,
    icon: "bg-[#1488ff]/10 text-[#1488ff] ring-[#1488ff]/20 dark:bg-[#1488ff]/12 dark:text-[#60b8ff] dark:ring-[#1488ff]/25",
    label: "text-[#0868c7] dark:text-[#8bc9ff]",
  },
  pink: {
    accent: "bg-[#ff2fb3]",
    border: overviewBorder.pink,
    icon: "bg-[#ff2fb3]/10 text-[#d91b96] ring-[#ff2fb3]/20 dark:bg-[#ff2fb3]/12 dark:text-[#ff72cf] dark:ring-[#ff2fb3]/25",
    label: "text-[#c21887] dark:text-[#ff9bde]",
  },
  teal: {
    accent: "bg-[#4ceac6]",
    border: overviewBorder.teal,
    icon: "bg-[#4ceac6]/12 text-[#0d9b82] ring-[#16bfa1]/20 dark:text-[#4ceac6] dark:ring-[#4ceac6]/25",
    label: "text-[#087866] dark:text-[#8ff5df]",
  },
  amber: {
    accent: "bg-[#ffb31a]",
    border: overviewBorder.amber,
    icon: "bg-[#ffb31a]/12 text-[#c77c00] ring-[#ffb31a]/25 dark:text-[#ffc95c]",
    label: "text-[#a46300] dark:text-[#ffd27a]",
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
  icon,
  isLoading,
  label,
  summary,
  tone = "teal",
}: {
  icon: ReactNode;
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
    <div className={`${dashboardPanel} overflow-hidden p-5 ${classes.border}`}>
      <div className={`mb-5 h-1 w-16 rounded-full ${classes.accent}`} />

      <div className="flex items-start justify-between gap-4">
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
        <div
          className={`flex h-11 w-11 items-center justify-center rounded-md ring-1 ${classes.icon}`}
        >
          {icon}
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
            <p className="mt-3 text-xl font-semibold text-[#4ceac6]">
              {formatNumber(summary?.okCount)}
            </p>
          </div>
          <div className={`${dashboardSubPanel} px-4 py-3.5`}>
            <p className={`text-sm font-medium ${mutedText}`}>NG</p>
            <p className="mt-3 text-xl font-semibold text-[#ff5b8a]">
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
              className="h-full rounded-full bg-[#4ceac6]"
              style={{ width: `${okRate}%` }}
            />
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-gray-100 dark:bg-[#171829]">
            <div
              className="h-full rounded-full bg-[#ff5b8a]"
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
}: {
  data: DashboardChartItem[];
  isDark: boolean;
  isLoading: boolean;
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
            Last 7 days production volume
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
        <div className="max-w-full overflow-x-auto">
          <div className="min-w-[720px] xl:min-w-full">
            <Chart
              key={chartKey}
              height={310}
              options={options}
              series={[{ data: seriesData, name: "Production" }]}
              type="line"
            />
          </div>
        </div>
      )}
    </div>
  );
}

function QualityDistributionChart({
  data,
  isDark,
  isLoading,
}: {
  data: DashboardChartItem[];
  isDark: boolean;
  isLoading: boolean;
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
        enabled: false,
      },
      style: {
        colors: ["#111827"],
        fontSize: "13px",
        fontWeight: 800,
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
      theme: chartTheme.tooltip,
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
        OK vs NG production result
      </p>

      {isLoading ? (
        <LoadingBlock className="mt-5 h-[260px]" />
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
}: {
  data: DashboardChartItem[];
  isDark: boolean;
  isLoading: boolean;
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
        Highest produced part numbers
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
    <div className="grid h-full grid-cols-1 gap-4 sm:grid-cols-2">
      <div className={`${dashboardPanel} ${overviewBorder.teal} p-5`}>
        <div className="flex h-11 w-11 items-center justify-center rounded-md bg-[#4ceac6]/12 text-[#0d9b82] ring-1 ring-[#16bfa1]/20 dark:text-[#4ceac6] dark:ring-[#4ceac6]/25">
          <CheckCircleIcon className="h-5 w-5 fill-current" />
        </div>
        <p className="mt-5 text-sm font-semibold text-[#087866] dark:text-[#8ff5df]">Total OK</p>
        <h3 className="mt-2 text-3xl font-semibold text-gray-900 dark:text-white">
          {isLoading ? "-" : formatNumber(summary?.okCount)}
        </h3>
      </div>

      <div className={`${dashboardPanel} ${overviewBorder.pink} p-5`}>
        <div className="flex h-11 w-11 items-center justify-center rounded-md bg-[#ff5b8a]/12 text-[#d92d5c] ring-1 ring-[#ff5b8a]/20 dark:text-[#ff5b8a] dark:ring-[#ff5b8a]/25">
          <AlertIcon className="h-5 w-5 fill-current" />
        </div>
        <p className="mt-5 text-sm font-semibold text-[#b4234c] dark:text-[#ff9bb6]">Total NG</p>
        <h3 className="mt-2 text-3xl font-semibold text-gray-900 dark:text-white">
          {isLoading ? "-" : formatNumber(summary?.ngCount)}
        </h3>
      </div>

      <div className={`${dashboardPanel} ${overviewBorder.blue} p-5 sm:col-span-2`}>
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-[#0868c7] dark:text-[#8bc9ff]">
              Overall Yield Rate
            </p>
            <h3 className="mt-2 text-4xl font-semibold text-gray-900 dark:text-white">
              {isLoading ? "-" : formatPercent(summary?.yieldRate)}
            </h3>
          </div>
          <div className="flex h-11 w-11 items-center justify-center rounded-md bg-[#1488ff]/10 text-[#1488ff] ring-1 ring-[#1488ff]/20 dark:bg-[#1488ff]/12 dark:text-[#60b8ff] dark:ring-[#1488ff]/25">
            <PieChartIcon className="h-5 w-5 fill-current" />
          </div>
        </div>
        <div className="mt-6 h-2 overflow-hidden rounded-full bg-gray-100 dark:bg-[#171829]">
          <div
            className="h-full rounded-full bg-gradient-to-r from-[#1488ff] via-[#4ceac6] to-[#ffb31a]"
            style={{ width: `${Math.min(100, summary?.yieldRate ?? 0)}%` }}
          />
        </div>
      </div>
    </div>
  );
}

function getLogParameterCount(log: DashboardRecentLog) {
  return (log.details ?? []).reduce(
    (total, detail) => total + (detail.parameters ?? []).length,
    0
  );
}

function getLogProcessNames(log: DashboardRecentLog) {
  const details = log.details ?? [];
  if (details.length === 0) {
    return log.type ?? "-";
  }

  return details.map((detail) => detail.processName).join(", ");
}

function getLogStatus(log: DashboardRecentLog) {
  if (typeof log.status === "boolean") {
    return log.status ? "OK" : "NG";
  }

  return log.isActive ? "Active" : "Inactive";
}

function getFirstLogValues(log: DashboardRecentLog) {
  const values = (log.details ?? [])
    .flatMap((detail) => detail.parameters ?? [])
    .slice(0, 3)
    .map((parameter) => {
      const parameterValues = (parameter.values ?? []).map(formatLogValue).join(", ");
      return `${parameter.parameterName}: ${parameterValues || "-"}`;
    });

  return values.length > 0 ? values.join("; ") : "-";
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
      <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Recent Logs</h3>
          <p className={`mt-1 text-sm ${mutedText}`}>
            Latest production log activity
          </p>
        </div>
        <span className="inline-flex w-fit items-center rounded-full border border-[#1488ff]/25 bg-[#1488ff]/10 px-3 py-1 text-xs font-semibold text-[#0868c7] dark:border-[#1488ff]/30 dark:text-[#8bc9ff]">
          {data.length} logs
        </span>
      </div>

      <div className="max-w-full overflow-x-auto rounded-md border border-gray-200 bg-white dark:border-[#34374f] dark:bg-[#1b1d31]">
        <Table>
          <TableHeader>
            <TableRow>
              <TableCell
                isHeader
                className="min-w-32 px-4 py-3 text-start text-theme-xs font-semibold uppercase text-white"
              >
                Issue No
              </TableCell>
              <TableCell
                isHeader
                className="min-w-44 px-4 py-3 text-start text-theme-xs font-semibold uppercase text-white"
              >
                Part
              </TableCell>
              <TableCell
                isHeader
                className="min-w-64 px-4 py-3 text-start text-theme-xs font-semibold uppercase text-white"
              >
                Processes
              </TableCell>
              <TableCell
                isHeader
                className="min-w-80 px-4 py-3 text-start text-theme-xs font-semibold uppercase text-white"
              >
                Values[]
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
                Created
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
                  No recent logs found
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
                    <div>
                      <p className="max-w-[260px] truncate" title={log.issueNo}>
                        {log.issueNo}
                      </p>
                      <span className="text-theme-xs font-normal text-gray-500 dark:text-[#8f93ad]">
                        {log.serialNumberCode ?? "-"}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="px-4 py-4 text-theme-sm text-gray-700 dark:text-[#c7cceb]">
                    <div>
                      <p>{log.partName ?? "-"}</p>
                      <span className="text-theme-xs text-gray-500 dark:text-[#8f93ad]">
                        {log.partNumber ?? "-"}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="px-4 py-4 text-theme-sm text-gray-700 dark:text-[#c7cceb]">
                    <div>
                      <p>{getLogProcessNames(log)}</p>
                      <span className="text-theme-xs text-gray-500 dark:text-[#8f93ad]">
                        {log.type ?? "-"} / {getLogParameterCount(log)} parameters
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="px-4 py-4 text-theme-sm text-gray-700 dark:text-[#c7cceb]">
                    <p className="max-w-[420px] truncate" title={getFirstLogValues(log)}>
                      {getFirstLogValues(log)}
                    </p>
                  </TableCell>
                  <TableCell className="px-4 py-4">
                    <span
                      className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${
                        getLogStatus(log) === "OK" || getLogStatus(log) === "Active"
                          ? "bg-[#4ceac6]/12 text-[#087866] dark:text-[#4ceac6]"
                          : "bg-error-50 text-error-700 dark:bg-error-500/15 dark:text-error-400"
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

export default function DashboardOverview() {
  const { error, isLoading, recentLogs, refetch, stats, summary } =
    useDashboard(10);
  const { theme } = useTheme();
  const isDark = theme === "dark";

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
              Production output, quality status, and latest process logs
            </p>
          </div>
          <button
            className="inline-flex h-10 items-center justify-center rounded-md border border-[#16bfa1]/30 bg-[#4ceac6]/12 px-4 text-sm font-semibold text-[#087866] transition-colors hover:bg-[#4ceac6]/20 disabled:cursor-not-allowed disabled:opacity-60 dark:border-[#4ceac6]/35 dark:text-[#8ff5df] dark:hover:bg-[#4ceac6]/18"
            disabled={isLoading}
            onClick={refetch}
            type="button"
          >
            Refresh
          </button>
        </div>

        {error && (
          <div className="rounded-md border border-[#ff5b8a]/25 bg-[#ff5b8a]/10 px-4 py-3 text-sm text-[#b4234c] dark:border-[#ff5b8a]/30 dark:text-[#ff9bb6]">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 gap-4 md:grid-cols-3 md:gap-5">
          <SummaryCard
            icon={<TimeIcon className="h-5 w-5 fill-current" />}
            isLoading={isLoading}
            label="Today Production"
            summary={summary?.today}
            tone="teal"
          />
          <SummaryCard
            icon={<BoxIconLine className="h-5 w-5 fill-current" />}
            isLoading={isLoading}
            label="This Month"
            summary={summary?.thisMonth}
            tone="amber"
          />
          <SummaryCard
            icon={<CheckCircleIcon className="h-5 w-5 fill-current" />}
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
            />
          </div>
          <div className="col-span-12 xl:col-span-4">
            <QualityDistributionChart
              data={stats?.qualityDistribution ?? []}
              isDark={isDark}
              isLoading={isLoading}
            />
          </div>
          <div className="col-span-12 xl:col-span-4">
            <TopPartsChart
              data={stats?.topPartsProduction ?? []}
              isDark={isDark}
              isLoading={isLoading}
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
