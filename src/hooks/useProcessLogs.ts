"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { ApiListResponse } from "@/services/ParameterService";
import ProcessLogService, {
  ProcessLogListItem,
  ProcessLogQuery,
} from "@/services/ProcessLogService";

type UseProcessLogsOptions = ProcessLogQuery & {
  enabled?: boolean;
};

export type ProcessLogQueryState = {
  page: number;
  limit: number;
  serialNumberCode: string;
  status?: boolean | null;
  isFinished?: boolean | null;
  startDate?: string;
  endDate?: string;
};

const getInitialQuery = (options: UseProcessLogsOptions): ProcessLogQueryState => ({
  page: options.page ?? 1,
  limit: options.limit ?? 10,
  serialNumberCode: options.serialNumberCode ?? "",
  status: options.status,
  isFinished: options.isFinished,
  startDate: options.startDate,
  endDate: options.endDate,
});

export const useProcessLogs = (options: UseProcessLogsOptions = {}) => {
  const { enabled = true } = options;
  const [query, setQueryState] = useState<ProcessLogQueryState>(() =>
    getInitialQuery(options)
  );
  const [response, setResponse] =
    useState<ApiListResponse<ProcessLogListItem> | null>(null);
  const [isLoading, setIsLoading] = useState(enabled);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  const requestQuery = useMemo(
    () => ({
      page: query.page,
      limit: query.limit,
      serialNumberCode: query.serialNumberCode,
      status: query.status,
      isFinished: query.isFinished,
      startDate: query.startDate,
      endDate: query.endDate,
    }),
    [
      query.endDate,
      query.isFinished,
      query.limit,
      query.page,
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
      setQueryState((current) => ({ ...current, page }));
    },
    [startRequest]
  );

  const setLimit = useCallback(
    (limit: number) => {
      startRequest();
      setQueryState((current) => ({ ...current, limit, page: 1 }));
    },
    [startRequest]
  );

  const setQuery = useCallback(
    (nextQuery: Partial<ProcessLogQueryState>) => {
      startRequest();
      setQueryState((current) => ({ ...current, ...nextQuery, page: 1 }));
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

    ProcessLogService.getProcessLogs(requestQuery, {
      signal: controller.signal,
    })
      .then(setResponse)
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
            : "Failed to fetch process logs"
        );
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setIsLoading(false);
        }
      });

    return () => controller.abort();
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
