export type ActualRecordTuple = [
  startTime: string,
  publishTime: string,
  settlementDate: string,
  settlementPeriod: number,
  fuelType: string,
  generationMw: number,
];

export type ActualResponse = ActualRecordTuple[];

export type ForecastRecordTuple = [
  startTime: string,
  publishTime: string,
  generationMw: number,
];

export type ForecastResponse = ForecastRecordTuple[];

export interface AlignedDataSeries {
  timestamps: number[];
  startTimes: string[];
  settlementPeriods: number[];
  actualMw: (number | null)[];
  vintageIds: string[];
  vintageMw: (number | null)[][];
}

export interface DateRange {
  startDate: string;
  endDate: string;
}

export type SpanMode = "1d" | "3d" | "7d";

export type TimeOfDayFilter =
  | "all"
  | "00-06"
  | "06-12"
  | "12-18"
  | "18-24";

export interface VintageFilterState {
  searchQuery: string;
  timeOfDay: TimeOfDayFilter;
}

export interface VintageRowData {
  id: string;
  label: string;
  color: string;
  visible: boolean;
  hasData: boolean;
  dataCount: number;
  firstValidIndex: number;
  values: (number | null)[];
}

export type AggregateSeriesType =
  | "mean_48c"
  | "mean_3d"
  | "mean_7d"
  | "best_fit"
  | "p10_p90"
  | "calibrated"
  | "net_procurement";

export interface AggregateOptionConfig {
  id: AggregateSeriesType;
  label: string;
  category: "mean" | "trader_tool";
  color: string;
}

export type ProcurementBaseline = "calibrated" | "p10" | "best_fit" | "mean_48c";
