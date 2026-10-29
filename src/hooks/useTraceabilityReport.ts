"use client";

import { useEffect, useState } from "react";
import type { ApiListResponse } from "@/services/PartService";
import TraceabilityReportService, {
  isTraceabilityReportUnavailable,
  type TraceabilityReportFilters,
  type TraceabilityReportRow,
} from "@/services/TraceabilityReportService";

export function useTraceabilityReport() {
  const [query, setQuery] = useState({
    filters: {} as TraceabilityReportFilters,
    page: 1, limit: 10,
    revision: 0,
  });
  const [state, setState] = useState({
    response: null as ApiListResponse<TraceabilityReportRow> | null,
    isLoading: true,
    error: null as string | null,
    unavailable: false,
  });

  useEffect(() => {
    const controller = new AbortController();
    TraceabilityReportService.getReport(query, { signal: controller.signal })
      .then((response) => {
        if (!controller.signal.aborted) setState({ response, isLoading: false, error: null, unavailable: false });
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted) return;
        const unavailable = isTraceabilityReportUnavailable(error);
        setState({
          response: null,
          isLoading: false,
          error: unavailable ? null : error instanceof Error ? error.message : "Failed to load traceability report.",
          unavailable,
        });
      });
    return () => controller.abort();
  }, [query]);

  const update = (changes: Partial<typeof query>) => {
    setState({ response: null, isLoading: true, error: null, unavailable: false });
    setQuery((current) => ({ ...current, ...changes, revision: current.revision + 1 }));
  };

  return {
    ...state,
    query,
    data: state.response?.data ?? [],
    pagination: state.response?.pagination ?? { page: query.page, limit: query.limit, total: 0, totalPage: 1 },
    search: (filters: TraceabilityReportFilters) => update({ filters, page: 1 }),
    reset: () => update({ filters: {}, page: 1, limit: 10 }),
    setPage: (page: number) => update({ page }),
    setLimit: (limit: number) => update({ limit, page: 1 }),
    retry: () => update({}),
  };
}
