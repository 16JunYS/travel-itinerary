import type { BudgetRow, ChecklistRow, ItineraryRow, SheetData, SheetRow, TravelInfo } from "./types";

const DEFAULT_SHEET_ID = "1ODvUMXlopii8kbKIlYiQzSuV3InztP9NzZIU604DPTI";

const SHEET_NAMES = {
  travelInfo: "여행정보",
  itinerary: "여행일정",
  budget: "예상경비",
  checklist: "준비물 체크리스트",
} as const;

export function getGoogleSheetId(): string {
  const envUrl = import.meta.env.VITE_GOOGLE_SHEET_URL as string | undefined;
  const envId = import.meta.env.VITE_GOOGLE_SHEET_ID as string | undefined;
  if (envId?.trim()) return envId.trim();
  if (envUrl?.trim()) {
    const match = envUrl.match(/\/spreadsheets\/d\/([^/]+)/);
    if (match?.[1]) return match[1];
  }
  return DEFAULT_SHEET_ID;
}

function csvUrl(sheetId: string, sheetName: string): string {
  const baseUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq`;
  const params = new URLSearchParams({ tqx: "out:csv", sheet: sheetName });
  return `${baseUrl}?${params.toString()}`;
}

export function parseCsv(text: string): SheetRow[] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let inQuotes = false;

  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];
    const next = text[i + 1];
    if (char === '"' && inQuotes && next === '"') {
      cell += '"';
      i += 1;
    } else if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === "," && !inQuotes) {
      row.push(cell.trim());
      cell = "";
    } else if ((char === "
" || char === "
") && !inQuotes) {
      if (cell.length > 0 || row.length > 0) {
        row.push(cell.trim());
        rows.push(row);
        row = [];
        cell = "";
      }
      if (char === "
" && next === "
") i += 1;
    } else {
      cell += char;
    }
  }

  if (cell.length > 0 || row.length > 0) {
    row.push(cell.trim());
    rows.push(row);
  }

  const headers = rows[0] ?? [];
  return rows.slice(1)
    .filter((item) => item.some((value) => value.trim() !== ""))
    .map((item) => {
      const mapped: SheetRow = {};
      headers.forEach((header, index) => {
        mapped[header.trim()] = item[index]?.trim() ?? "";
      });
      return mapped;
    });
}

async function fetchSheetRows(sheetId: string, sheetName: string): Promise<SheetRow[]> {
  const response = await fetch(csvUrl(sheetId, sheetName), { cache: "no-store" });
  if (!response.ok) throw new Error(`${sheetName} 시트를 불러오지 못했습니다. status=${response.status}`);
  const text = await response.text();
  if (text.startsWith("<!DOCTYPE html") || text.includes("<html")) {
    throw new Error(`${sheetName} 시트가 CSV로 공개되어 있지 않습니다. 공유 권한과 시트명을 확인하세요.`);
  }
  return parseCsv(text);
}

function get(row: SheetRow, keys: string[]): string {
  for (const key of keys) {
    const value = row[key];
    if (value !== undefined && value !== "") return value;
  }
  return "";
}

function toNumber(value: string): number {
  const normalized = value.replace(/[^0-9.-]/g, "");
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : 0;
}

function toTravelInfo(rows: SheetRow[]): TravelInfo[] {
  return rows.map((row) => ({ key: get(row, ["항목", "key", "Key"]), value: get(row, ["값", "value", "Value"]) }))
    .filter((row) => row.key || row.value);
}

function toItinerary(rows: SheetRow[]): ItineraryRow[] {
  return rows.map((row) => ({
    date: get(row, ["날짜", "date", "Date"]),
    area: get(row, ["지역", "area", "Area"]),
    time: get(row, ["시간", "시간대", "time", "Time"]),
    category: get(row, ["분류", "category", "Category"]),
    title: get(row, ["주요 일정", "제목", "title", "Title"]),
    travelTime: get(row, ["이동 예상 시간", "이동시간", "travelTime", "Travel Time"]),
    arrivalTime: get(row, ["예상 도착 시간", "도착시간", "arrivalTime", "Arrival Time"]),
    reservationStatus: get(row, ["예약상태", "상태", "reservationStatus", "Status"]),
    note: get(row, ["비고", "메모", "note", "Note"]),
  })).filter((row) => row.date || row.time || row.title || row.note);
}

function toBudget(rows: SheetRow[]): BudgetRow[] {
  return rows.map((row) => ({
    item: get(row, ["항목", "item", "Item"]),
    amount: toNumber(get(row, ["금액", "예상 금액", "amount", "Amount"])),
    currency: get(row, ["통화", "currency", "Currency"]) || "KRW",
    note: get(row, ["비고", "메모", "note", "Note"]),
  })).filter((row) => row.item || row.amount > 0 || row.note);
}

function toChecklist(rows: SheetRow[]): ChecklistRow[] {
  let currentCategory = "";
  return rows.map((row) => {
    const category = get(row, ["대항목", "카테고리", "category", "Category"]);
    if (category) currentCategory = category;
    return {
      category: currentCategory,
      item: get(row, ["세부항목", "준비물", "항목", "item", "Item"]),
      note: get(row, ["비고", "메모", "note", "Note"]),
    };
  }).filter((row) => row.category || row.item || row.note);
}

export async function loadSheetData(): Promise<SheetData> {
  const sheetId = getGoogleSheetId();
  const [travelInfoRows, itineraryRows, budgetRows, checklistRows] = await Promise.all([
    fetchSheetRows(sheetId, SHEET_NAMES.travelInfo),
    fetchSheetRows(sheetId, SHEET_NAMES.itinerary),
    fetchSheetRows(sheetId, SHEET_NAMES.budget),
    fetchSheetRows(sheetId, SHEET_NAMES.checklist),
  ]);
  return {
    travelInfo: toTravelInfo(travelInfoRows),
    itinerary: toItinerary(itineraryRows),
    budget: toBudget(budgetRows),
    checklist: toChecklist(checklistRows),
  };
}
