"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { ApiListResponse } from "@/services/ParameterService";
import TraceabilityLogService, {
  TraceabilityLogItem,
  TraceabilityLogQuery,
} from "@/services/TraceabilityLogService";

type UseTraceabilityLogsOptions = TraceabilityLogQuery & {
  enabled?: boolean;
};

export type TraceabilityLogQueryState = {
  page: number;
  limit: number;
  search: string;
  serialNumberCode?: string;
  isActive?: boolean | null;
  status?: boolean | null;
  isFinish?: boolean | null;
  startDate?: string;
  endDate?: string;
};

const getInitialQuery = (
  options: UseTraceabilityLogsOptions
): TraceabilityLogQueryState => ({
  page: options.page ?? 1,
  limit: options.limit ?? 10,
  search: options.search ?? options.serialNumberCode ?? options.issueNo ?? "",
  status: options.status,
  isFinish: options.isFinish,
  isActive: options.isActive,
  startDate: options.startDate,
  endDate: options.endDate,
});

export const useTraceabilityLogs = (options: UseTraceabilityLogsOptions = {}) => {
  const { enabled = true } = options;
  const [query, setQueryState] = useState<TraceabilityLogQueryState>(() =>
    getInitialQuery(options)
  );
  const [response, setResponse] =
    useState<ApiListResponse<TraceabilityLogItem> | null>(null);
  const [isLoading, setIsLoading] = useState(enabled);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  const requestQuery = useMemo(
    () => ({
      page: query.page,
      limit: query.limit,
      search: query.search || query.serialNumberCode,
      status: query.status,
      isFinish: query.isFinish,
      startDate: query.startDate,
      endDate: query.endDate,
    }),
    [
      query.endDate,
      query.isFinish,
      query.limit,
      query.page,
      query.search,
      query.serialNumberCode,
      query.startDate,
      query.status,
    ]
  );

  const startRequest = useCallback(() => {
    if (enabled) {
      setIsLoading(true);
      setError(null);
    }
  }, [enabled]);

  const setPage = useCallback(
    (page: number) => {
      startRequest();
      setQueryState((current) => ({
        ...current,
        page,
      }));
    },
    [startRequest]
  );

  const setLimit = useCallback(
    (limit: number) => {
      startRequest();
      setQueryState((current) => ({
        ...current,
        limit,
        page: 1,
      }));
    },
    [startRequest]
  );

  const setQuery = useCallback(
    (nextQuery: Partial<TraceabilityLogQueryState>) => {
      startRequest();
      setQueryState((current) => ({
        ...current,
        ...nextQuery,
        page: 1,
      }));
    },
    [startRequest]
  );

  const refetch = useCallback(() => {
    startRequest();
    setReloadKey((current) => current + 1);
  }, [startRequest]);

  useEffect(() => {
    if (!enabled) {
      return;
    }

    const controller = new AbortController();

    TraceabilityLogService.getTraceabilityLogs(requestQuery, {
      signal: controller.signal,
    })
      .then((result) => {
        setResponse(result);
      })
      .catch((fetchError: unknown) => {
        if (
          fetchError instanceof DOMException &&
          fetchError.name === "AbortError"
        ) {
          return;
        }

        setError(
          fetchError instanceof Error
            ? fetchError.message
            : "Failed to fetch traceability logs"
        );
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setIsLoading(false);
        }
      });

    return () => {
      controller.abort();
    };
  }, [enabled, reloadKey, requestQuery]);

  return {
    data: response?.data ?? [],
    error,
    isLoading,
    pagination: response?.pagination,
    query,
    refetch,
    response,
    setLimit,
    setPage,
    setQuery,
  };
};
