"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { ApiListResponse } from "@/services/ParameterService";
import StockInReworkService, {
  StockInRework,
  StockInReworkQuery,
} from "@/services/StockInReworkService";

type UseStockInReworksOptions = StockInReworkQuery & {
  enabled?: boolean;
  serialNumberCode?: string;
};

export type StockInReworkQueryState = {
  page: number;
  limit: number;
  serialNumberCode: string;
};

const getInitialQuery = (
  options: UseStockInReworksOptions
): StockInReworkQueryState => ({
  page: options.page ?? 1,
  limit: options.limit ?? 10,
  serialNumberCode: options.serialNumberCode ?? "",
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
  const serialNumberFilter = query.serialNumberCode.trim().toLowerCase();
  const isFilteringBySerialNumber = serialNumberFilter.length > 0;

  const requestQuery = useMemo(
    () =>
      isFilteringBySerialNumber
        ? {
            page: 1,
            limit: 10000,
          }
        : {
            page: query.page,
            limit: query.limit,
          },
    [isFilteringBySerialNumber, query.limit, query.page]
  );

  const filteredData = useMemo(() => {
    const currentData = response?.data ?? [];

    if (!serialNumberFilter) {
      return currentData;
    }

    return currentData.filter((item) =>
      item.serialNumberCode?.toLowerCase().includes(serialNumberFilter)
    );
  }, [response?.data, serialNumberFilter]);

  const pagedData = useMemo(() => {
    if (!isFilteringBySerialNumber) {
      return filteredData;
    }

    const startIndex = (query.page - 1) * query.limit;
    return filteredData.slice(startIndex, startIndex + query.limit);
  }, [
    filteredData,
    isFilteringBySerialNumber,
    query.limit,
    query.page,
  ]);

  const localPagination = useMemo(() => {
    if (!isFilteringBySerialNumber) {
      return response?.pagination;
    }

    return {
      page: query.page,
      limit: query.limit,
      total: filteredData.length,
      totalPage: Math.max(1, Math.ceil(filteredData.length / query.limit)),
    };
  }, [
    filteredData.length,
    isFilteringBySerialNumber,
    query.limit,
    query.page,
    response?.pagination,
  ]);

  const startRequest = useCallback(() => {
    if (enabled) {
      setIsLoading(true);
      setError(null);
    }
  }, [enabled]);

  const setPage = useCallback(
    (page: number) => {
      if (!isFilteringBySerialNumber) {
        startRequest();
      }

      setQueryState((current) => ({
        ...current,
        page,
      }));
    },
    [isFilteringBySerialNumber, startRequest]
  );

  const setLimit = useCallback(
    (limit: number) => {
      if (!isFilteringBySerialNumber) {
        startRequest();
      }

      setQueryState((current) => ({
        ...current,
        limit,
        page: 1,
      }));
    },
    [isFilteringBySerialNumber, startRequest]
  );

  const setQuery = useCallback(
    (nextQuery: Partial<StockInReworkQueryState>) => {
      const currentHasSerialFilter = query.serialNumberCode.trim().length > 0;
      const nextHasSerialFilter =
        (nextQuery.serialNumberCode ?? query.serialNumberCode).trim().length > 0;

      if (currentHasSerialFilter !== nextHasSerialFilter) {
        startRequest();
      }

      setQueryState((current) => ({
        ...current,
        ...nextQuery,
        page: 1,
      }));
    },
    [query.serialNumberCode, startRequest]
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
    data: pagedData,
    error,
    isLoading,
    pagination: localPagination,
    query,
    refetch,
    response,
    setLimit,
    setPage,
    setQuery,
  };
};
