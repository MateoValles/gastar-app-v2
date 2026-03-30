export interface ApiResponse<T = unknown> {
  success: true;
  data: T;
  meta?: PaginationMeta;
}

export interface ApiErrorDetail {
  field: string;
  message: string;
}

export interface ApiErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    details?: ApiErrorDetail[];
  };
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
}
