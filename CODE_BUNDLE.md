# Travel Itinerary Google Sheets 코드 번들

## `.env.example`

```example
VITE_GOOGLE_SHEET_URL=https://docs.google.com/spreadsheets/d/193dTJ1DzyQN7kTtzOoVMgyFykCFU8PjEnOawXD74EYs/edit?usp=sharing
# 또는
# VITE_GOOGLE_SHEET_ID=193dTJ1DzyQN7kTtzOoVMgyFykCFU8PjEnOawXD74EYs

```

## `README.md`

```md
# Travel Itinerary

공개 Google Sheets를 데이터 소스로 사용하는 React + TypeScript 여행 일정 웹앱입니다.

## 실행

```bash
npm install
npm run dev
```

## Google Sheets 연동

`.env` 파일을 만들고 아래 중 하나를 설정합니다.

```bash
VITE_GOOGLE_SHEET_URL=https://docs.google.com/spreadsheets/d/193dTJ1DzyQN7kTtzOoVMgyFykCFU8PjEnOawXD74EYs/edit?usp=sharing
```

또는

```bash
VITE_GOOGLE_SHEET_ID=193dTJ1DzyQN7kTtzOoVMgyFykCFU8PjEnOawXD74EYs
```

## 필요한 시트명

- `여행정보`
- `여행일정`
- `예상경비`
- `준비물 체크리스트`

브라우저에서 Google Sheets의 공개 CSV 엔드포인트를 탭별로 읽습니다.

```text
https://docs.google.com/spreadsheets/d/{SHEET_ID}/gviz/tq?tqx=out:csv&sheet={SHEET_NAME}
```

구글 시트 내용을 수정한 뒤 웹에서 `새로고침` 버튼을 누르면 반영됩니다.

```

## `index.html`

```html
<!doctype html>
<html lang="ko">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Travel Itinerary</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>

```

## `package.json`

```json
{
  "name": "travel-itinerary",
  "private": true,
  "version": "0.1.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc -b && vite build",
    "preview": "vite preview"
  },
  "dependencies": {
    "@vitejs/plugin-react": "latest",
    "vite": "latest",
    "typescript": "latest",
    "react": "latest",
    "react-dom": "latest",
    "lucide-react": "latest",
    "framer-motion": "latest"
  },
  "devDependencies": {}
}
```

## `src/App.tsx`

```tsx
import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, CalendarDays, Car, CheckSquare, ChevronRight, Clock, CloudSun, MapPin, Plane, RefreshCw, Utensils, WalletCards } from "lucide-react";
import { motion } from "framer-motion";
import { loadSheetData } from "./googleSheets";
import type { BudgetRow, ChecklistRow, ItineraryRow, SheetData } from "./types";
import { getInfoValue, groupBy, isPaidBudget, money } from "./utils";

type TabKey = "itinerary" | "budget" | "checklist";

const fallbackData: SheetData = {
  travelInfo: [
    { key: "여행명", value: "Travel Itinerary" },
    { key: "시작일", value: "" },
    { key: "종료일", value: "" },
  ],
  itinerary: [],
  budget: [],
  checklist: [],
};

const categoryIconMap: Record<string, typeof CalendarDays> = {
  항공: Plane,
  교통: Car,
  식사: Utensils,
  관광: MapPin,
  투어: CalendarDays,
  숙소: CloudSun,
  휴식: CloudSun,
};

function CategoryBadge({ category }: { category: string }) {
  if (!category) return null;
  const Icon = categoryIconMap[category] ?? CalendarDays;
  return <span className="inline-flex items-center gap-1 rounded-full bg-sky-50 px-2 py-1 text-xs font-semibold text-sky-700"><Icon className="h-3 w-3" />{category}</span>;
}

function StatusBadge({ status }: { status: string }) {
  if (!status) return null;
  return <span className="inline-flex items-center rounded-full bg-emerald-50 px-2 py-1 text-xs font-semibold text-emerald-700">{status}</span>;
}

function BudgetSummary({ budget }: { budget: BudgetRow[] }) {
  const paidRows = budget.filter((row) => isPaidBudget(row.note));
  const expectedRows = budget.filter((row) => !isPaidBudget(row.note));
  const paidByCurrency = useMemo(() => paidRows.reduce<Record<string, number>>((acc, row) => { const c = row.currency || "KRW"; acc[c] = (acc[c] ?? 0) + row.amount; return acc; }, {}), [paidRows]);
  const expectedByCurrency = useMemo(() => expectedRows.reduce<Record<string, number>>((acc, row) => { const c = row.currency || "KRW"; acc[c] = (acc[c] ?? 0) + row.amount; return acc; }, {}), [expectedRows]);

  return <div className="space-y-3">
    <div className="rounded-3xl bg-white p-4 shadow-sm ring-1 ring-slate-100">
      <div className="mb-3 flex items-center justify-between"><div><p className="text-xs font-semibold text-slate-500">이미 결제한 항목</p><h3 className="text-lg font-bold">결제 완료 금액</h3></div><span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">환전 제외</span></div>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">{Object.entries(paidByCurrency).map(([currency, amount]) => <div key={currency} className="rounded-2xl bg-slate-50 p-4"><p className="text-xs text-slate-500">{currency}</p><p className="mt-1 text-xl font-bold text-slate-900">{money(amount, currency)}</p></div>)}{!Object.keys(paidByCurrency).length && <p className="text-sm text-slate-500">결제 완료 항목이 없습니다.</p>}</div>
    </div>
    <div className="rounded-3xl bg-slate-900 p-4 text-white shadow-sm">
      <div className="mb-3 flex items-center justify-between"><div><p className="text-xs font-semibold text-slate-300">앞으로 쓸 돈</p><h3 className="text-lg font-bold">예상 경비 / 환전 참고 금액</h3></div><span className="rounded-full bg-white-10 px-3 py-1 text-xs font-semibold text-white">환전 참고</span></div>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">{Object.entries(expectedByCurrency).map(([currency, amount]) => <div key={currency} className="rounded-2xl bg-white-10 p-4"><p className="text-xs text-slate-300">{currency}</p><p className="mt-1 text-xl font-bold">{money(amount, currency)}</p></div>)}{!Object.keys(expectedByCurrency).length && <p className="text-sm text-slate-300">예상 경비 항목이 없습니다.</p>}</div>
    </div>
  </div>;
}

function ItineraryPage({ itinerary }: { itinerary: ItineraryRow[] }) {
  const [categoryFilter, setCategoryFilter] = useState("전체");
  const categories = useMemo(() => ["전체", ...Array.from(new Set(itinerary.map((item) => item.category).filter(Boolean)))], [itinerary]);
  const visible = categoryFilter === "전체" ? itinerary : itinerary.filter((item) => item.category === categoryFilter);
  const byDate = useMemo(() => groupBy(visible, (row) => row.date), [visible]);
  if (!itinerary.length) return <div className="rounded-3xl bg-white p-6 text-center text-sm text-slate-500 shadow-sm ring-1 ring-slate-100">여행일정 시트에 표시할 데이터가 없습니다.</div>;
  return <motion.section initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-5">
    <div className="flex gap-2 overflow-x-auto pb-1">{categories.map((category) => <button key={category} onClick={() => setCategoryFilter(category)} className={`shrink-0 rounded-full px-4 py-2 text-sm font-semibold ${categoryFilter === category ? "bg-slate-900 text-white" : "bg-white text-slate-600 ring-1 ring-slate-200"}`}>{category}</button>)}</div>
    {Object.entries(byDate).map(([date, rows]) => <div key={date} className="rounded-3xl bg-white p-4 shadow-sm ring-1 ring-slate-100"><div className="mb-3 flex items-center justify-between"><div><h3 className="text-lg font-bold">{date}</h3><p className="text-sm text-slate-500">{rows[0]?.area || "지역 미정"}</p></div><span className="rounded-full bg-sky-50 px-3 py-1 text-xs font-semibold text-sky-700">{rows.length}개 일정</span></div><div className="space-y-3">{rows.map((row, index) => <div key={`${date}-${index}`} className="flex gap-3 rounded-2xl bg-slate-50 p-3"><div className="w-14 shrink-0 text-sm font-bold text-sky-700">{row.time || "-"}</div><div className="min-w-0 flex-1"><div className="mb-2 flex flex-wrap items-center gap-2"><CategoryBadge category={row.category} /><StatusBadge status={row.reservationStatus} /></div><p className="whitespace-pre-line font-semibold">{row.title}</p><div className="mt-2 flex flex-wrap gap-2 text-xs text-slate-500">{row.travelTime && <span className="inline-flex items-center gap-1 rounded-full bg-white px-2 py-1"><Clock className="h-3 w-3" />{row.travelTime}</span>}{row.arrivalTime && <span className="inline-flex items-center gap-1 rounded-full bg-white px-2 py-1"><MapPin className="h-3 w-3" />{row.arrivalTime}</span>}</div>{row.note && <p className="mt-2 whitespace-pre-line text-sm text-slate-600">{row.note}</p>}</div><ChevronRight className="mt-1 h-4 w-4 text-slate-300" /></div>)}</div></div>)}
  </motion.section>;
}

function BudgetPage({ budget }: { budget: BudgetRow[] }) {
  const paid = budget.filter((row) => isPaidBudget(row.note));
  const expected = budget.filter((row) => !isPaidBudget(row.note));
  return <motion.section initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-4"><BudgetSummary budget={budget} /><div className="rounded-3xl bg-white p-4 shadow-sm ring-1 ring-slate-100"><h3 className="mb-3 text-lg font-bold">결제 완료 항목</h3><div className="space-y-2">{paid.map((row, index) => <div key={`paid-${index}`} className="flex items-start justify-between gap-3 rounded-2xl bg-emerald-50 p-3 ring-1 ring-emerald-100"><div><p className="font-semibold">{row.item}</p>{row.note && <p className="mt-1 text-sm text-slate-500">{row.note}</p>}</div><p className="shrink-0 text-right font-bold">{money(row.amount, row.currency)}</p></div>)}{!paid.length && <p className="text-sm text-slate-500">결제 완료 항목이 없습니다.</p>}</div></div><div className="rounded-3xl bg-white p-4 shadow-sm ring-1 ring-slate-100"><h3 className="mb-3 text-lg font-bold">남은 예상 경비</h3><div className="space-y-2">{expected.map((row, index) => <div key={`expected-${index}`} className="flex items-start justify-between gap-3 rounded-2xl bg-slate-50 p-3"><div><p className="font-semibold">{row.item}</p>{row.note && <p className="mt-1 text-sm text-slate-500">{row.note}</p>}</div><p className="shrink-0 text-right font-bold">{money(row.amount, row.currency)}</p></div>)}{!expected.length && <p className="text-sm text-slate-500">남은 예상 경비 항목이 없습니다.</p>}</div></div></motion.section>;
}

function ChecklistPage({ checklist }: { checklist: ChecklistRow[] }) {
  const byCategory = useMemo(() => groupBy(checklist, (row) => row.category), [checklist]);
  return <motion.section initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-4"><div className="rounded-3xl bg-white p-4 shadow-sm ring-1 ring-slate-100"><h3 className="mb-4 text-lg font-bold">준비물 체크리스트</h3><div className="space-y-4">{Object.entries(byCategory).map(([category, rows]) => <div key={category}><h4 className="mb-2 text-sm font-bold text-slate-500">{category}</h4><div className="space-y-2">{rows.map((row, index) => <div key={`${category}-${index}`} className="rounded-2xl bg-slate-50 p-3 ring-1 ring-slate-100"><div className="flex items-start gap-3"><div className="mt-1 h-5 w-5 rounded-md border border-slate-300 bg-white" /><div className="flex-1"><p className="font-semibold">{row.item || "-"}</p>{row.note && <p className="mt-1 text-sm text-slate-500">{row.note}</p>}</div></div></div>)}</div></div>)}{!checklist.length && <p className="text-sm text-slate-500">준비물 데이터가 없습니다.</p>}</div></div></motion.section>;
}

export default function App() {
  const [tab, setTab] = useState<TabKey>("itinerary");
  const [data, setData] = useState<SheetData>(fallbackData);
  const [loading, setLoading] = useState(false);
  const [lastUpdated, setLastUpdated] = useState("아직 불러오지 않음");
  const [error, setError] = useState("");

  async function refresh() {
    setLoading(true); setError("");
    try { const next = await loadSheetData(); setData(next); setLastUpdated(new Date().toLocaleString("ko-KR")); }
    catch (e) { setError(e instanceof Error ? e.message : "구글 시트를 불러오지 못했습니다."); }
    finally { setLoading(false); }
  }

  useEffect(() => { refresh(); }, []);

  const tripName = getInfoValue(data.travelInfo, "여행명", "Travel Itinerary");
  const startDate = getInfoValue(data.travelInfo, "시작일");
  const endDate = getInfoValue(data.travelInfo, "종료일");
  const period = [startDate, endDate].filter(Boolean).join(" - ");
  const tabs = [{ key: "itinerary" as const, label: "일정", icon: CalendarDays }, { key: "budget" as const, label: "경비", icon: WalletCards }, { key: "checklist" as const, label: "준비물", icon: CheckSquare }];

  return <div className="min-h-screen bg-slate-50 text-slate-900"><header className="sticky top-0 z-20 border-b border-slate-200 bg-white-90 backdrop-blur"><div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3"><div>{period && <p className="text-xs font-medium text-sky-600">{period}</p>}<h1 className="text-lg font-bold">{tripName}</h1></div><button onClick={refresh} className="flex items-center gap-2 rounded-full bg-slate-900 px-3 py-2 text-sm font-semibold text-white shadow-sm"><RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />새로고침</button></div></header><main className="mx-auto max-w-5xl px-4 pb-24 pt-5"><section className="mb-5 overflow-hidden rounded-3xl bg-gradient-to-br from-sky-500 to-indigo-600 p-5 text-white shadow-md"><div className="flex items-start justify-between gap-4"><div>{period && <p className="text-sm text-sky-100">{period}</p>}<h2 className="mt-1 text-2xl font-bold">{tripName}</h2><p className="mt-2 text-sm text-sky-50">구글 시트 수정 후 새로고침하면 일정, 경비, 준비물이 함께 반영됩니다.</p></div><CloudSun className="h-10 w-10 shrink-0 text-white" /></div></section>{error && <div className="mb-4 flex gap-2 rounded-2xl bg-amber-50 p-3 text-sm text-amber-800 ring-1 ring-amber-200"><AlertTriangle className="h-5 w-5 shrink-0" /><span>{error}</span></div>}<div className="mb-4 text-xs text-slate-500">데이터 기준: {lastUpdated}</div><nav className="mb-5 grid grid-cols-3 gap-2 rounded-2xl bg-white p-1 shadow-sm ring-1 ring-slate-100">{tabs.map(({ key, label, icon: Icon }) => <button key={key} onClick={() => setTab(key)} className={`flex items-center justify-center gap-2 rounded-xl px-3 py-3 text-sm font-semibold transition ${tab === key ? "bg-slate-900 text-white" : "text-slate-500 hover-bg-slate-100"}`}><Icon className="h-4 w-4" />{label}</button>)}</nav>{tab === "itinerary" && <ItineraryPage itinerary={data.itinerary} />}{tab === "budget" && <BudgetPage budget={data.budget} />}{tab === "checklist" && <ChecklistPage checklist={data.checklist} />}</main><footer className="fixed bottom-0 left-0 right-0 border-t border-slate-200 bg-white-95 px-4 py-2 backdrop-blur md-hidden"><div className="mx-auto grid max-w-md grid-cols-3 gap-2">{tabs.map(({ key, label, icon: Icon }) => <button key={key} onClick={() => setTab(key)} className={`rounded-2xl p-2 text-xs font-semibold ${tab === key ? "bg-slate-900 text-white" : "text-slate-500"}`}><Icon className="mx-auto mb-1 h-4 w-4" />{label}</button>)}</div></footer></div>;
}

```

## `src/googleSheets.ts`

```ts
import type { BudgetRow, ChecklistRow, ItineraryRow, SheetData, SheetRow, TravelInfo } from "./types";

const DEFAULT_SHEET_ID = "193dTJ1DzyQN7kTtzOoVMgyFykCFU8PjEnOawXD74EYs";

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
" || char === "") && !inQuotes) {
      if (cell.length > 0 || row.length > 0) {
        row.push(cell.trim());
        rows.push(row);
        row = [];
        cell = "";
      }
      if (char === "" && next === "
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

```

## `src/main.tsx`

```tsx
import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./styles.css";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);

```

## `src/styles.css`

```css
*{box-sizing:border-box}body{margin:0;font-family:Inter,ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;background:#f8fafc}button{font-family:inherit;border:0;cursor:pointer}.whitespace-pre-line{white-space:pre-line}.min-h-screen{min-height:100vh}.bg-slate-50{background-color:#f8fafc}.bg-white{background-color:#fff}.bg-slate-900{background-color:#0f172a}.bg-slate-100,.hover-bg-slate-100:hover{background-color:#f1f5f9}.bg-sky-50{background-color:#f0f9ff}.bg-emerald-50{background-color:#ecfdf5}.bg-emerald-100{background-color:#d1fae5}.bg-amber-50{background-color:#fffbeb}.bg-white-10{background-color:rgb(255 255 255 / .1)}.bg-white-90{background-color:rgb(255 255 255 / .9)}.bg-white-95{background-color:rgb(255 255 255 / .95)}.text-white{color:#fff}.text-slate-900{color:#0f172a}.text-slate-600{color:#475569}.text-slate-500{color:#64748b}.text-slate-300{color:#cbd5e1}.text-sky-700{color:#0369a1}.text-sky-600{color:#0284c7}.text-sky-100{color:#e0f2fe}.text-sky-50{color:#f0f9ff}.text-emerald-700{color:#047857}.text-amber-800{color:#92400e}.border{border:1px solid}.border-b{border-bottom:1px solid}.border-t{border-top:1px solid}.border-slate-200{border-color:#e2e8f0}.border-slate-300{border-color:#cbd5e1}.ring-1{box-shadow:0 0 0 1px var(--ring-color,#e2e8f0)}.ring-slate-100{--ring-color:#f1f5f9}.ring-slate-200{--ring-color:#e2e8f0}.ring-emerald-100{--ring-color:#d1fae5}.ring-amber-200{--ring-color:#fde68a}.shadow-sm{box-shadow:0 1px 2px 0 rgb(15 23 42 / .05)}.shadow-md{box-shadow:0 4px 6px -1px rgb(15 23 42 / .1),0 2px 4px -2px rgb(15 23 42 / .1)}.sticky{position:sticky}.fixed{position:fixed}.top-0{top:0}.bottom-0{bottom:0}.left-0{left:0}.right-0{right:0}.z-20{z-index:20}.mx-auto{margin-left:auto;margin-right:auto}.max-w-5xl{max-width:64rem}.max-w-md{max-width:28rem}.px-2{padding-left:.5rem;padding-right:.5rem}.px-3{padding-left:.75rem;padding-right:.75rem}.px-4{padding-left:1rem;padding-right:1rem}.py-1{padding-top:.25rem;padding-bottom:.25rem}.py-2{padding-top:.5rem;padding-bottom:.5rem}.py-3{padding-top:.75rem;padding-bottom:.75rem}.p-1{padding:.25rem}.p-2{padding:.5rem}.p-3{padding:.75rem}.p-4{padding:1rem}.p-5{padding:1.25rem}.p-6{padding:1.5rem}.pt-5{padding-top:1.25rem}.pb-24{padding-bottom:6rem}.pb-1{padding-bottom:.25rem}.mb-1{margin-bottom:.25rem}.mb-2{margin-bottom:.5rem}.mb-3{margin-bottom:.75rem}.mb-4{margin-bottom:1rem}.mb-5{margin-bottom:1.25rem}.mt-1{margin-top:.25rem}.mt-2{margin-top:.5rem}.flex{display:flex}.grid{display:grid}.inline-flex{display:inline-flex}.items-center{align-items:center}.items-start{align-items:flex-start}.justify-between{justify-content:space-between}.justify-center{justify-content:center}.gap-1{gap:.25rem}.gap-2{gap:.5rem}.gap-3{gap:.75rem}.gap-4{gap:1rem}.space-y-2>*+*{margin-top:.5rem}.space-y-3>*+*{margin-top:.75rem}.space-y-4>*+*{margin-top:1rem}.space-y-5>*+*{margin-top:1.25rem}.grid-cols-2{grid-template-columns:repeat(2,minmax(0,1fr))}.grid-cols-3{grid-template-columns:repeat(3,minmax(0,1fr))}.min-w-0{min-width:0}.w-14{width:3.5rem}.h-3{height:.75rem}.w-3{width:.75rem}.h-4{height:1rem}.w-4{width:1rem}.h-5{height:1.25rem}.w-5{width:1.25rem}.h-10{height:2.5rem}.w-10{width:2.5rem}.shrink-0{flex-shrink:0}.flex-1{flex:1 1 0%}.flex-wrap{flex-wrap:wrap}.overflow-hidden{overflow:hidden}.overflow-x-auto{overflow-x:auto}.rounded-md{border-radius:.375rem}.rounded-xl{border-radius:.75rem}.rounded-2xl{border-radius:1rem}.rounded-3xl{border-radius:1.5rem}.rounded-full{border-radius:9999px}.bg-gradient-to-br{background-image:linear-gradient(to bottom right,var(--tw-gradient-from),var(--tw-gradient-to))}.from-sky-500{--tw-gradient-from:#0ea5e9}.to-indigo-600{--tw-gradient-to:#4f46e5}.backdrop-blur{backdrop-filter:blur(8px)}.text-xs{font-size:.75rem;line-height:1rem}.text-sm{font-size:.875rem;line-height:1.25rem}.text-lg{font-size:1.125rem;line-height:1.75rem}.text-xl{font-size:1.25rem;line-height:1.75rem}.text-2xl{font-size:1.5rem;line-height:2rem}.font-medium{font-weight:500}.font-semibold{font-weight:600}.font-bold{font-weight:700}.text-center{text-align:center}.text-right{text-align:right}.transition{transition:all 150ms}.animate-spin{animation:spin 1s linear infinite}@keyframes spin{to{transform:rotate(360deg)}}@media (min-width:768px){.md\:grid-cols-4{grid-template-columns:repeat(4,minmax(0,1fr))}.md-hidden{display:none}}

```

## `src/types.ts`

```ts
export type TravelInfo = { key: string; value: string };

export type ItineraryRow = {
  date: string;
  area: string;
  time: string;
  category: string;
  title: string;
  travelTime: string;
  arrivalTime: string;
  reservationStatus: string;
  note: string;
};

export type BudgetRow = {
  item: string;
  amount: number;
  currency: string;
  note: string;
};

export type ChecklistRow = {
  category: string;
  item: string;
  note: string;
};

export type SheetRow = Record<string, string>;

export type SheetData = {
  travelInfo: TravelInfo[];
  itinerary: ItineraryRow[];
  budget: BudgetRow[];
  checklist: ChecklistRow[];
};

```

## `src/utils.ts`

```ts
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

```

## `tsconfig.json`

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "useDefineForClassFields": true,
    "lib": [
      "DOM",
      "DOM.Iterable",
      "ES2020"
    ],
    "allowJs": false,
    "skipLibCheck": true,
    "esModuleInterop": true,
    "allowSyntheticDefaultImports": true,
    "strict": true,
    "forceConsistentCasingInFileNames": true,
    "module": "ESNext",
    "moduleResolution": "Node",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "jsx": "react-jsx"
  },
  "include": [
    "src"
  ],
  "references": []
}
```

## `vite.config.ts`

```ts
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
});

```
