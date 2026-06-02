export function groupBy<T>(items: T[], keyGetter: (item: T) => string): Record<string, T[]> {
  return items.reduce<Record<string, T[]>>((acc, item) => {
    const key = keyGetter(item) || "미정";
    acc[key] = acc[key] ?? [];
    acc[key].push(item);
    return acc;
  }, {});
}

export function money(amount: number, currency: string): string {
  if (!amount) return "-";
  const normalized = currency.trim().toUpperCase();
  if (normalized === "KRW" || normalized === "원") return `${amount.toLocaleString("ko-KR")}원`;
  return `${normalized} ${amount.toLocaleString("ko-KR")}`;
}

export function isPaidBudget(note: string): boolean {
  const normalized = note.toLowerCase();
  return normalized.includes("결제 완료") || normalized.includes("결제완료") || normalized.includes("결제함") || normalized.includes("paid");
}

export function getInfoValue(info: { key: string; value: string }[], key: string, fallback = ""): string {
  return info.find((item) => item.key === key)?.value || fallback;
}
