"use client";

import AppConfigService, {
  AppConfig,
  AppConfigQuery,
} from "@/services/AppConfigService";
import { ApiListResponse } from "@/services/ParameterService";
import { useCallback, useEffect, useMemo, useState } from "react";

type UseAppConfigsOptions = AppConfigQuery & {
  enabled?: boolean;
};

type AppConfigQueryState = {
  page: number;
  limit: number;
  search: string;
};

const getInitialQuery = (
  options: UseAppConfigsOptions
): AppConfigQueryState => ({
  page: options.page ?? 1,
  limit: options.limit ?? 10,
  search: options.search ?? "",
});

export const useAppConfigs = (options: UseAppConfigsOptions = {}) => {
  const { enabled = true } = options;
  const [query, setQueryState] = useState<AppConfigQueryState>(() =>
    getInitialQuery(options)
  );
  const [response, setResponse] =
    useState<ApiListResponse<AppConfig> | null>(null);
  const [isLoading, setIsLoading] = useState(enabled);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  const requestQuery = useMemo(
    () => ({
      page: query.page,
      limit: query.limit,
      search: query.search,
    }),
    [query.limit, query.page, query.search]
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

  const setSearch = useCallback(
    (search: string) => {
      startRequest();
      setQueryState((current) => ({ ...current, search, page: 1 }));
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

    AppConfigService.getAppConfigs(requestQuery, {
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
            : "Failed to fetch app configurations"
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
    setLimit,
    setPage,
    setSearch,
  };
};
