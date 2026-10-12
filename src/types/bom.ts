export interface BomItem {
  id: string;
  scopeId?: string;
  clauseNumber: string; // e.g. "ข้อ 4.1"
  title: string;
  category: string; // e.g. "งานพัฒนาซอฟต์แวร์และวิศวกรรมระบบ"
  responsibleRole: string; // e.g. "Solution Architect"
  quantity: number;
  unit: string; // e.g. "วัน-คน (Man-Day)", "ชุด", "ระบบย่อย"
  unitRate: number; // e.g. 5000 (บาท)
  totalPrice: number; // quantity * unitRate
  deliverable?: string;
  notes?: string;
}

export interface BomRateCardItem {
  role: string;
  level: string;
  standardRatePerDay: number;
  standardRatePerMonth: number;
  description: string;
}

export interface BomCategorySummary {
  category: string;
  totalCost: number;
  itemCount: number;
  percentage: number;
}
