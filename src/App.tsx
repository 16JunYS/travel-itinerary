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

  return <div className="min-h-screen bg-slate-50 text-slate-900"><header className="sticky top-0 z-20 border-b border-slate-200 bg-white-90 backdrop-blur"><div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3"><div>{period && <p className="text-xs font-medium text-sky-600">{period}</p>}<h1 className="text-lg font-bold">{tripName}</h1></div><button onClick={refresh} className="flex items-center gap-2 rounded-full bg-slate-900 px-3 py-2 text-sm font-semibold text-white shadow-sm"><RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />새로고침</button></div></header><main className="mx-auto max-w-5xl px-4 pb-24 pt-5"><section className="mb-5 overflow-hidden rounded-3xl bg-gradient-to-br from-sky-500 to-indigo-600 p-5 text-white shadow-md"><div className="flex items-start justify-between gap-4"><div>{period && <p className="text-sm text-sky-100">{period}</p>}<h2 className="mt-1 text-2xl font-bold">{tripName}</h2><p className="mt-2 text-sm text-sky-50">우리가 지금 어듸로 가는지, 내일은 뭘 하니, 엄마빠 궁금점을 풀어주기 위한 사이트</p></div><CloudSun className="h-10 w-10 shrink-0 text-white" /></div></section>{error && <div className="mb-4 flex gap-2 rounded-2xl bg-amber-50 p-3 text-sm text-amber-800 ring-1 ring-amber-200"><AlertTriangle className="h-5 w-5 shrink-0" /><span>{error}</span></div>}<div className="mb-4 text-xs text-slate-500">데이터 기준: {lastUpdated}</div><nav className="mb-5 grid grid-cols-3 gap-2 rounded-2xl bg-white p-1 shadow-sm ring-1 ring-slate-100">{tabs.map(({ key, label, icon: Icon }) => <button key={key} onClick={() => setTab(key)} className={`flex items-center justify-center gap-2 rounded-xl px-3 py-3 text-sm font-semibold transition ${tab === key ? "bg-slate-900 text-white" : "text-slate-500 hover-bg-slate-100"}`}><Icon className="h-4 w-4" />{label}</button>)}</nav>{tab === "itinerary" && <ItineraryPage itinerary={data.itinerary} />}{tab === "budget" && <BudgetPage budget={data.budget} />}{tab === "checklist" && <ChecklistPage checklist={data.checklist} />}</main><footer className="fixed bottom-0 left-0 right-0 border-t border-slate-200 bg-white-95 px-4 py-2 backdrop-blur md-hidden"><div className="mx-auto grid max-w-md grid-cols-3 gap-2">{tabs.map(({ key, label, icon: Icon }) => <button key={key} onClick={() => setTab(key)} className={`rounded-2xl p-2 text-xs font-semibold ${tab === key ? "bg-slate-900 text-white" : "text-slate-500"}`}><Icon className="mx-auto mb-1 h-4 w-4" />{label}</button>)}</div></footer></div>;
}
