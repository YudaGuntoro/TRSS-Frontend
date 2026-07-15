"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { ApiListResponse } from "@/services/ParameterService";
import StockInReworkService, {
  StockInRework,
  StockInReworkQuery,
} from "@/services/StockInReworkService";

type UseStockInReworksOptions = StockInReworkQuery & {
  enabled?: boolean;
};

export type StockInReworkQueryState = {
  page: number;
  limit: number;
  serialNumberCode: string;
  includeAllDispositions?: boolean;
};

const getInitialQuery = (
  options: UseStockInReworksOptions
): StockInReworkQueryState => ({
  page: options.page ?? 1,
  limit: options.limit ?? 10,
  serialNumberCode: options.serialNumberCode ?? "",
  includeAllDispositions: options.includeAllDispositions,
});

export const useStockInReworks = (
  options: UseStockInReworksOptions = {}
) => {
  const { enabled = true } = options;
  const [query, setQueryState] = useState<StockInReworkQueryState>(() =>
    getInitialQuery(options)
  );
  const [response, setResponse] =
    useState<ApiListResponse<StockInRework> | null>(null);
  const [isLoading, setIsLoading] = useState(enabled);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  const requestQuery = useMemo(
    () => ({
      page: query.page,
      limit: query.limit,
      serialNumberCode: query.serialNumberCode,
      includeAllDispositions: query.includeAllDispositions,
    }),
    [
      query.includeAllDispositions,
      query.limit,
      query.page,
      query.serialNumberCode,
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
    (nextQuery: Partial<StockInReworkQueryState>) => {
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

    StockInReworkService.getStockInReworks(requestQuery, {
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
            : "Failed to fetch stock in reworks"
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
