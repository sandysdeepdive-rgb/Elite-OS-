export function sanitizeText(input: string | null | undefined): string {
  if (!input) return "";
  // Remove HTML tags and trim
  return input.replace(/<[^>]*>?/gm, '').trim();
}

export function sanitizePhone(input: string | null | undefined): string {
  if (!input) return "";
  // Keep only digits and plus sign
  return input.replace(/[^\d+]/g, '');
}

export function sanitizeEmail(input: string | null | undefined): string {
  if (!input) return "";
  return input.trim().toLowerCase();
}
