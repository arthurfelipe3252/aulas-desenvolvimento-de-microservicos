export interface LinkDef {
  href: string;
  method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
}

export type LinksMap = Record<string, LinkDef | null>;

export interface PaginationParams {
  page: number;
  limit: number;
}

export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
}
