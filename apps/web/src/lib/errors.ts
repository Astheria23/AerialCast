import { isAxiosError } from "axios"

interface ApiErrorResponse {
  message?: string
  error?: string
  detail?: string
}

export function getFriendlyErrorMessage(error: unknown, fallback = "Something went wrong") {
  if (isAxiosError<ApiErrorResponse>(error)) {
    return error.response?.data?.message ?? error.response?.data?.error ?? error.message ?? fallback
  }

  if (error instanceof Error) {
    return error.message || fallback
  }

  if (typeof error === "string" && error.trim().length > 0) {
    return error
  }

  return fallback
}
