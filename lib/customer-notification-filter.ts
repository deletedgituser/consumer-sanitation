/**
 * Customer bell + reports: excludes admin-bulletin-only types and legacy PENDING
 * rows created when PENDING duplicated the old admin-queue copy (“Name: …”).
 */
export function excludeAdminOnlyNotification<N extends { type: string; message?: string | null }>(
  rows: N[],
): N[] {
  return rows.filter((n) => {
    const t = n.type;
    if (t === "ADMIN_APPLICATION" || t === "ADMIN_TICKET") return false;
    if (t !== "PENDING") return true;
    const msg = (n.message ?? "").trimStart();
    if (/^Name:\s/i.test(msg)) return false;
    return true;
  });
}
