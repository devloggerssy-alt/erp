import { ApiQueryOptions } from "@devloggers/api-contracts";

/**
 * Serializes ApiQueryOptions to URL query string format
 * Compatible with NestJS class-transformer query parsing
 */
export function serializeQueryOptions(query: ApiQueryOptions): string {
  const params = new URLSearchParams();

  // Pagination
  if (query.pagination) {
    if (query.pagination.page !== undefined) {
      params.append("pagination[page]", String(query.pagination.page));
    }
    if (query.pagination.limit !== undefined) {
      params.append("pagination[limit]", String(query.pagination.limit));
    }
  }

  // Sort
  if (query.sort) {
    if (query.sort.field) {
      params.append("sort[field]", query.sort.field);
    }
    if (query.sort.order) {
      params.append("sort[order]", query.sort.order);
    }
  }

  // Filters
  if (query.filters) {
    Object.entries(query.filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        params.append(`filters[${key}]`, String(value));
      }
    });
  }

  // Include
  if (query.include) {
    Object.entries(query.include).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        params.append(`include[${key}]`, String(value));
      }
    });
  }

  // Search
  if (query.search) {
    if (query.search.value) {
      params.append("search[value]", query.search.value);
    }
    if (query.search.keys && query.search.keys.length > 0) {
      query.search.keys.forEach((key) => {
        params.append("search[keys][]", key);
      });
    }
  }

  return params.toString();
}









