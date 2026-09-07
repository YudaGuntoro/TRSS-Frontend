"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import PageLoader from "@/components/common/PageLoader";
import { Modal } from "@/components/ui/modal";
import { useProcessLogs } from "@/hooks/useProcessLogs";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { ProcessLog, ProcessLogParameter } from "@/services/ProcessLogService";
import { useToast } from "@/context/ToastContext";
import { DownloadIcon, EyeIcon, RefreshIcon } from "@/icons";

type ResultFilter = "" | "ok" | "ng";

const dateFormatter = new Intl.DateTimeFormat("en-GB", { day: "2-digit", hour: "2-digit", minute: "2-digit", month: "short", year: "numeric" });
const formatDate = (value: string) => {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "-" : dateFormatter.format(date);
};
const isPassed = (log: ProcessLog) => typeof log.status === "boolean" ? log.status : log.isActive;
const parameterValue = (parameter: ProcessLogParameter) => parameter.parameterCode === "CHECK_POINTS" ? `${parameter.values.filter(Boolean).length}/${parameter.values.length} OK` : parameter.values.slice(0, 2).map((value) => typeof value === "boolean" ? (value ? "OK" : "NG") : String(value)).join(", ") || "-";
const findValue = (log: ProcessLog, label: string) => log.details.flatMap((detail) => detail.parameters).find((parameter) => parameter.parameterName === label);
const cellValue = (log: ProcessLog, label: string) => parameterValue(findValue(log, label) ?? { parameterId: 0, values: [] });

export default function ProcessLogTable() {
  const toast = useToast();
  const router = useRouter();
  const lastErrorRef = useRef<string | null>(null);
  const [search, setSearch] = useState("");
  const [resultFilter, setResultFilter] = useState<ResultFilter>("");
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const debouncedSearch = useDebouncedValue(search.trim(), 500);
  const { data, error, isLoading, pagination, query, refetch, setLimit, setPage, setQuery } = useProcessLogs({ limit: 10, page: 1 });

  useEffect(() => {
    if (debouncedSearch !== query.serialNumberCode) setQuery({ serialNumberCode: debouncedSearch });
  }, [debouncedSearch, query.serialNumberCode, setQuery]);

  useEffect(() => {
    if (!error || lastErrorRef.current === error) return;
    lastErrorRef.current = error;
    toast.error({ title: "Failed to load process logs", message: error });
  }, [error, toast]);

  const visibleLogs = useMemo(() => data.filter((log) => resultFilter === "" || (resultFilter === "ok") === isPassed(log)), [data, resultFilter]);
  const passedCount = data.filter(isPassed).length;

  if (isLoading && data.length === 0) return <PageLoader />;

  return (
    <div className="process-log-sheet mx-4 space-y-5">
      <section className="flex flex-col gap-4 border-b border-gray-200 pb-5 dark:border-gray-800 lg:flex-row lg:items-center lg:justify-between">
        <div><div className="flex flex-wrap items-center gap-2"><h2 className="text-lg font-semibold text-gray-800 dark:text-white/90">Process Log Data Sheet</h2><span className="rounded-full bg-brand-50 px-2.5 py-1 text-xs font-semibold text-brand-600 dark:bg-brand-500/15 dark:text-brand-300">Traceability history</span></div><p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Traceability line inspection and process verification records.</p></div>
        <div className="flex items-center gap-2"><button aria-label="Refresh process logs" className="process-log-refresh-button inline-flex size-10 items-center justify-center rounded-lg border border-gray-300 bg-white text-gray-600 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300 dark:hover:bg-gray-800" onClick={refetch} title="Refresh" type="button"><RefreshIcon className="size-4" /></button><button className="process-log-export-button inline-flex h-10 items-center gap-2 rounded-lg bg-brand-500 px-4 text-sm font-semibold text-white shadow-theme-xs hover:bg-brand-600" onClick={() => setIsExportModalOpen(true)} type="button"><DownloadIcon className="size-4" />Export CSV</button></div>
      </section>

      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4"><Metric label="Loaded records" value={String(data.length)} tone="brand" /><Metric label="Passed (OK)" value={String(passedCount)} tone="success" /><Metric label="Rejected (NG)" value={String(data.length - passedCount)} tone="error" /><Metric label="Total records" value={String(pagination?.total ?? 0)} tone="warning" /></section>

      <section className="flex flex-col gap-3 border-b border-gray-200 pb-5 dark:border-gray-800 sm:flex-row sm:items-end"><label className="w-full text-sm text-gray-700 dark:text-gray-300 sm:max-w-sm">Search serial number<input className="mt-1 h-10 w-full rounded-lg border border-gray-300 bg-transparent px-3 text-sm text-gray-800 outline-none focus:border-brand-300 focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90" onChange={(event) => setSearch(event.target.value)} placeholder="Serial number or issue number" value={search} /></label><label className="w-full text-sm text-gray-700 dark:text-gray-300 sm:w-44">Result<select className="mt-1 h-10 w-full rounded-lg border border-gray-300 bg-transparent px-3 text-sm text-gray-800 outline-none focus:border-brand-300 focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90" onChange={(event) => setResultFilter(event.target.value as ResultFilter)} value={resultFilter}><option value="">All results</option><option value="ok">Passed (OK)</option><option value="ng">Rejected (NG)</option></select></label><label className="w-full text-sm text-gray-700 dark:text-gray-300 sm:ml-auto sm:w-32">Rows<select className="mt-1 h-10 w-full rounded-lg border border-gray-300 bg-transparent px-3 text-sm text-gray-800 outline-none focus:border-brand-300 focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90" onChange={(event) => setLimit(Number(event.target.value))} value={query.limit}>{[10, 25, 50].map((limit) => <option key={limit} value={limit}>{limit}</option>)}</select></label></section>

      <section className="overflow-x-auto rounded-lg border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03]">
        <table className="w-full min-w-[1180px] text-left text-sm"><thead className="bg-[#6D8AF3] text-[11px] font-semibold uppercase text-white dark:bg-[#6D8AF3]/90"><tr><th className="w-14 px-4 py-3 text-center">No</th><th className="px-4 py-3">Timestamp</th><th className="px-4 py-3">Serial No</th><th className="px-4 py-3">Core Asm</th><th className="px-4 py-3">Upper Tank</th><th className="px-4 py-3">Lower Tank</th><th className="px-4 py-3 text-center">Clinching Avg</th><th className="px-4 py-3 text-center">End Plate</th><th className="px-4 py-3 text-center">Check Points</th><th className="px-4 py-3 text-center">Action</th></tr></thead><tbody className="divide-y divide-gray-200 dark:divide-gray-800">{visibleLogs.map((log, index) => <ProcessLogRow index={(query.page - 1) * query.limit + index + 1} key={log.id} log={log} onOpen={() => router.push(`/process-log/${encodeURIComponent(log.serialNumberCode ?? String(log.id))}`)} />)}</tbody></table>{visibleLogs.length === 0 && <div className="py-12 text-center text-sm text-gray-500 dark:text-gray-400">{error ?? "No process logs found."}</div>}</section>

      <footer className="flex flex-col gap-3 border-t border-gray-200 py-4 text-sm text-gray-500 dark:border-gray-800 dark:text-gray-400 sm:flex-row sm:items-center sm:justify-between"><span>Showing {visibleLogs.length} of {pagination?.total ?? 0} records</span><div className="flex items-center gap-2"><button className="h-9 rounded-lg border border-gray-300 bg-white px-3 text-sm text-gray-700 disabled:cursor-not-allowed disabled:opacity-40 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300" disabled={query.page <= 1 || isLoading} onClick={() => setPage(query.page - 1)} type="button">Previous</button><span className="min-w-20 text-center font-medium text-gray-700 dark:text-gray-300">Page {query.page} / {pagination?.totalPage ?? 1}</span><button className="h-9 rounded-lg border border-gray-300 bg-white px-3 text-sm text-gray-700 disabled:cursor-not-allowed disabled:opacity-40 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300" disabled={query.page >= (pagination?.totalPage ?? 1) || isLoading} onClick={() => setPage(query.page + 1)} type="button">Next</button></div></footer>
      <ComingSoonModal isOpen={isExportModalOpen} onClose={() => setIsExportModalOpen(false)} title="Export CSV" />
    </div>
  );
}

function ComingSoonModal({ isOpen, onClose, title }: { isOpen: boolean; onClose: () => void; title: string }) {
  return <Modal className="mx-4 max-w-sm p-6" isOpen={isOpen} onClose={onClose}><div className="pr-10"><h2 className="text-lg font-semibold text-gray-800 dark:text-white/90">{title}</h2><p className="mt-2 text-sm text-gray-500 dark:text-gray-400">Coming soon.</p></div><div className="mt-6 flex justify-end"><button className="h-9 rounded-lg bg-brand-500 px-4 text-sm font-semibold text-white hover:bg-brand-600" onClick={onClose} type="button">Close</button></div></Modal>;
}

function Metric({ label, value, tone }: { label: string; value: string; tone: "brand" | "success" | "error" | "warning" }) {
  const toneClass = { brand: "text-brand-600 dark:text-brand-300", success: "text-success-600 dark:text-success-400", error: "text-error-600 dark:text-error-400", warning: "text-warning-600 dark:text-warning-400" }[tone];
  return <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-theme-xs dark:border-gray-800 dark:bg-white/[0.03]"><p className="text-xs font-medium text-gray-500 dark:text-gray-400">{label}</p><p className={`mt-1 text-2xl font-semibold ${toneClass}`}>{value}</p></div>;
}

function ProcessLogRow({ index, log, onOpen }: { index: number; log: ProcessLog; onOpen: () => void }) {
  const passed = isPassed(log);
  const statusClass = passed ? "bg-success-50 text-success-700 dark:bg-success-500/15 dark:text-success-400" : "bg-error-50 text-error-700 dark:bg-error-500/15 dark:text-error-400";
  return <tr className="hover:bg-gray-50/70 dark:hover:bg-white/[0.03]"><td className="px-4 py-4 text-center font-mono text-xs text-gray-500 dark:text-gray-400">{String(index).padStart(2, "0")}</td><td className="whitespace-nowrap px-4 py-4 text-xs text-gray-600 dark:text-gray-300">{formatDate(log.createdAt)}</td><td className="px-4 py-4 font-mono font-semibold text-brand-600 dark:text-brand-300">{log.serialNumberCode ?? log.issueNo}</td><td className="px-4 py-4 font-mono text-xs text-gray-700 dark:text-gray-300">{cellValue(log, "Core Asm")}</td><td className="px-4 py-4 font-mono text-xs text-gray-700 dark:text-gray-300">{cellValue(log, "Upper Tank Asm")}</td><td className="px-4 py-4 font-mono text-xs text-gray-700 dark:text-gray-300">{cellValue(log, "Lower Tank Asm")}</td><td className="px-4 py-4 text-center font-mono text-xs font-semibold text-gray-700 dark:text-gray-300">{cellValue(log, "Clinching Height Avg")}</td><td className="px-4 py-4 text-center font-mono text-xs font-semibold text-gray-700 dark:text-gray-300">{cellValue(log, "End Plate Width")}</td><td className="px-4 py-4 text-center"><span className={`rounded px-2 py-1 text-xs font-semibold ${statusClass}`}>{cellValue(log, "Check Points")}</span></td><td className="px-4 py-4 text-center"><button className="process-log-details-button inline-flex h-8 items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-3 text-xs font-semibold text-brand-600 hover:bg-brand-50 dark:border-gray-700 dark:bg-gray-900 dark:text-brand-300 dark:hover:bg-brand-500/10" onClick={onOpen} type="button"><EyeIcon className="size-4 fill-current" />Details</button></td></tr>;
}
