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
