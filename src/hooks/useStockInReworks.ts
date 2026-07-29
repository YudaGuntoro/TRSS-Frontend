"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { ApiListResponse } from "@/services/ParameterService";
import StockInReworkService, {
  StockInRework,
  StockInReworkFinalDisposition,
  StockInReworkQuery,
} from "@/services/StockInReworkService";

type UseStockInReworksOptions = StockInReworkQuery & {
  enabled?: boolean;
};

export type StockInReworkQueryState = {
  page: number;
  limit: number;
  serialNumberCode: string;
  disposition: StockInReworkQuery["disposition"];
  includeAllDispositions?: boolean;
};

const getInitialQuery = (
  options: UseStockInReworksOptions
): StockInReworkQueryState => ({
  page: options.page ?? 1,
  limit: options.limit ?? 10,
  serialNumberCode: options.serialNumberCode ?? "",
  disposition: options.disposition ?? "",
  includeAllDispositions: options.includeAllDispositions,
});

const finalDispositions: StockInReworkFinalDisposition[] = [
  "STOCK_IN",
  "SCRAP",
];

const getTimestamp = (item: StockInRework) => {
  const value = item.createdAt || item.updatedAt;
  const timestamp = value ? new Date(value).getTime() : 0;

  return Number.isNaN(timestamp) ? 0 : timestamp;
};

const mergeResponses = (
  responses: ApiListResponse<StockInRework>[],
  page: number,
  limit: number
): ApiListResponse<StockInRework> => {
  const uniqueRows = new Map<number, StockInRework>();

  responses.forEach((response) => {
    response.data.forEach((item) => {
      uniqueRows.set(item.id, item);
    });
  });

  const sortedRows = Array.from(uniqueRows.values()).sort(
    (first, second) => getTimestamp(second) - getTimestamp(first)
  );
  const total = responses.reduce(
    (currentTotal, response) => currentTotal + response.pagination.total,
    0
  );
  const startIndex = (page - 1) * limit;

  return {
    data: sortedRows.slice(startIndex, startIndex + limit),
    message: responses[0]?.message ?? "Stock in reworks retrieved successfully",
    pagination: {
      limit,
      page,
      total,
      totalPage: Math.max(1, Math.ceil(total / limit)),
    },
    success: responses.every((response) => response.success),
  };
};

const getCombinedStockInReworks = async (
  query: StockInReworkQuery,
  options: { signal: AbortSignal }
) => {
  const page = query.page ?? 1;
  const limit = query.limit ?? 10;
  const aggregateLimit = Math.max(page * limit, limit);
  const dispositions: StockInReworkQuery["disposition"][] =
    query.disposition === "ALL" ? ["", ...finalDispositions] : finalDispositions;
  const responses = await Promise.all(
    dispositions.map((disposition) =>
      StockInReworkService.getStockInReworks(
        {
          ...query,
          disposition,
          includeAllDispositions: undefined,
          limit: aggregateLimit,
          page: 1,
        },
        options
      )
    )
  );

  return mergeResponses(responses, page, limit);
};

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
      disposition: query.disposition,
      includeAllDispositions: query.includeAllDispositions,
    }),
    [
      query.disposition,
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
    const shouldCombineResponses =
      requestQuery.disposition === "ALL" ||
      (requestQuery.includeAllDispositions && !requestQuery.disposition);

    const request = shouldCombineResponses
      ? getCombinedStockInReworks(requestQuery, {
          signal: controller.signal,
        })
      : StockInReworkService.getStockInReworks(requestQuery, {
          signal: controller.signal,
        });

    request
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
