export function nowIso(): string {
  return new Date().toISOString();
}

export function formatDate(value: string | null): string {
  if (!value) {
    return '-';
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return '-';
  }

  return date.toLocaleDateString();
}
