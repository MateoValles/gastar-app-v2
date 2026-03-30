/**
 * API response shape for a Category resource.
 *
 * `icon` and `color` are optional display fields — stored as nullable strings.
 * `color` is always a valid hex string (`#RRGGBB`) when present.
 *
 * `createdAt` and `updatedAt` are ISO 8601 strings.
 */
export interface CategoryResponse {
  id: string;
  userId: string;
  name: string;
  icon: string | null;
  color: string | null;
  createdAt: string; // ISO 8601
  updatedAt: string; // ISO 8601
}
