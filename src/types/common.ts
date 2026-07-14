// Slim page wrapper (backend `PageResponse`) returned by every paginated endpoint.
// The backend dropped Spring's derived fields (first/last/empty/numberOfElements/
// pageable/sort) — compute them on the client from these: first = number === 0,
// last = number >= totalPages - 1, empty = content.length === 0.
export interface PagedResponse<T> {
  content: T[];
  number: number; // current page, 0-based
  size: number;
  totalElements: number;
  totalPages: number;
}
