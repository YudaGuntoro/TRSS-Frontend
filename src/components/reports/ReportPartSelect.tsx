"use client";

import { useEffect, useRef, useState } from "react";
import PartService, { type Part } from "@/services/PartService";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { ChevronDownIcon } from "@/icons";

export type ReportPart = Pick<Part, "id" | "number" | "name">;

export default function ReportPartSelect({ value, onChange }: {
  value: ReportPart | null;
  onChange: (part: ReportPart | null) => void;
}) {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState({ search: "", page: 1, revision: 0 });
  const debouncedQuery = useDebouncedValue(query, 300);
  const [state, setState] = useState({
    parts: [] as Part[], totalPage: 1, loading: true, error: "",
  });
  const loading = state.loading || query !== debouncedQuery;

  useEffect(() => {
    const closeOutside = (event: PointerEvent) => {
      if (!wrapperRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", closeOutside);
    return () => document.removeEventListener("pointerdown", closeOutside);
  }, []);

  useEffect(() => {
    if (!open || query !== debouncedQuery) return;
    const controller = new AbortController();
    PartService.getParts({ search: debouncedQuery.search, page: debouncedQuery.page, limit: 25 }, { signal: controller.signal })
      .then((response) => {
        if (controller.signal.aborted) return;
        if (!response.success) throw new Error(response.message || "Failed to load parts.");
        setState((current) => ({
          parts: debouncedQuery.page === 1 ? response.data : [
            ...current.parts,
            ...response.data.filter((part) => !current.parts.some((existing) => existing.id === part.id)),
          ],
          totalPage: response.pagination.totalPage,
          loading: false,
          error: "",
        }));
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted) return;
        setState((current) => ({ ...current, loading: false, error: error instanceof Error ? error.message : "Failed to load parts." }));
      });
    return () => controller.abort();
  }, [debouncedQuery, open, query]);

  const select = (part: ReportPart | null) => {
    onChange(part);
    setOpen(false);
    triggerRef.current?.focus();
  };

  const update = (changes: Partial<typeof query>) => {
    setState((current) => ({ ...current, loading: true, error: "", ...(changes.search !== undefined ? { parts: [] } : {}) }));
    setQuery((current) => ({ ...current, ...changes, revision: current.revision + 1 }));
  };

  return (
    <div ref={wrapperRef} className="relative" onBlur={(event) => {
      if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false);
    }} onKeyDown={(event) => {
      if (event.key === "Escape") {
        event.preventDefault();
        setOpen(false);
        triggerRef.current?.focus();
      }
    }}>
      <label id="report-part-label" htmlFor="report-part" className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">Part</label>
      <button id="report-part" ref={triggerRef} type="button" aria-expanded={open}
        aria-controls={open ? "report-part-options" : undefined}
        className="flex h-10 w-full items-center justify-between gap-2 rounded-lg border border-gray-300 bg-transparent px-3 text-left text-sm text-gray-800 outline-none focus:border-brand-300 focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
        onClick={() => {
          if (!open) update({ search: "", page: 1 });
          setOpen(!open);
        }}>
        <span className="truncate">{value ? `${value.number} - ${value.name}` : "All parts"}</span>
        <ChevronDownIcon className={`size-4 shrink-0 ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <div id="report-part-options" role="group" aria-labelledby="report-part-label" className="absolute left-0 top-full z-40 mt-1 w-full min-w-60 rounded-lg border border-gray-200 bg-white p-2 shadow-theme-lg dark:border-gray-700 dark:bg-gray-900">
          <input aria-label="Search parts by number or name" autoFocus
            placeholder="Type part number or name"
            value={query.search} onChange={(event) => update({ search: event.target.value, page: 1 })}
            className="h-10 w-full rounded-lg border border-gray-300 bg-transparent px-3 text-sm text-gray-800 outline-none focus:border-brand-300 dark:border-gray-700 dark:text-white/90" />
          <div className="mt-2 max-h-60 overflow-y-auto">
            <button type="button" onClick={() => select(null)} className="w-full rounded px-3 py-2 text-left text-sm text-brand-500 hover:bg-brand-50 dark:hover:bg-white/5">All parts</button>
            {state.parts.map((part) => (
              <button key={part.id} type="button" aria-pressed={part.id === value?.id}
                onClick={() => select(part)}
                className="block w-full rounded px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 aria-pressed:bg-brand-50 dark:text-gray-300 dark:hover:bg-white/5 dark:aria-pressed:bg-brand-500/10">
                <span className="block font-medium">{part.number}</span>
                <span className="text-xs text-gray-500 dark:text-gray-400">{part.name}</span>
              </button>
            ))}
            {loading && <p role="status" className="p-3 text-sm text-gray-500">Loading parts...</p>}
            {!loading && state.error && <div role="alert" className="p-3 text-sm text-error-500">
              {state.error}
              <button type="button" className="ml-2 underline" onClick={() => update({})}>Retry</button>
            </div>}
            {!loading && !state.error && state.parts.length === 0 && <p role="status" className="p-3 text-sm text-gray-500">No parts found.</p>}
            {!loading && !state.error && query.page < state.totalPage && (
              <button type="button" className="w-full p-2 text-sm text-brand-500" onClick={() => update({ page: query.page + 1 })}>Load more parts</button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
