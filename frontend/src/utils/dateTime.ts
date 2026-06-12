function pad(value: number): string {
  return String(value).padStart(2, "0");
}

/**
 * SQL Server stores the dataset timestamps without a timezone. The backend
 * transports them as ISO strings, so UTC getters preserve the original clock
 * value instead of applying the browser's local timezone offset.
 */
export function formatDatasetDateTime(iso: string): string {
  const value = new Date(iso);

  return [
    `${value.getUTCFullYear()}-${pad(value.getUTCMonth() + 1)}-${pad(value.getUTCDate())}`,
    `${pad(value.getUTCHours())}:${pad(value.getUTCMinutes())}:${pad(value.getUTCSeconds())}`,
  ].join(" ");
}
