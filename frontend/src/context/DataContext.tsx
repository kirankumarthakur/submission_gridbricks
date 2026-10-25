import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useRef,
  useMemo,
  useCallback,
} from "react";
import type {
  ActualRecordTuple,
  ActualResponse,
  ForecastResponse,
  AlignedDataSeries,
  DateRange,
  SpanMode,
  VintageFilterState,
  VintageRowData,
  AggregateSeriesType,
  ProcurementBaseline,
} from "../types";

const PALETTE = [
  "#f59e0b",
  "#10b981",
  "#8b5cf6",
  "#ec4899",
  "#06b6d4",
  "#f97316",
  "#14b8a6",
  "#6366f1",
  "#84cc16",
  "#d946ef",
  "#e11d48",
  "#0284c7",
];

export const AGGREGATE_CONFIGS: Record<
  AggregateSeriesType,
  {
    label: string;
    color: string;
    dash?: number[];
    width: number;
    category: "mean" | "trader_tool";
  }
> = {
  mean_48c: {
    label: "Mean (Last 48 cycles)",
    color: "#38bdf8",
    width: 2.5,
    category: "mean",
  },
  mean_3d: {
    label: "Mean (Last 3 days)",
    color: "#818cf8",
    dash: [6, 3],
    width: 2.0,
    category: "mean",
  },
  mean_7d: {
    label: "Mean (Last 7 days)",
    color: "#a78bfa",
    dash: [4, 4],
    width: 2.0,
    category: "mean",
  },
  best_fit: {
    label: "Best Fit Consensus Curve",
    color: "#34d399",
    width: 2.5,
    category: "mean",
  },
  p10_p90: {
    label: "P10 - P90 Uncertainty Band",
    color: "#f59e0b",
    dash: [2, 2],
    width: 1.5,
    category: "trader_tool",
  },
  calibrated: {
    label: "Bias-Adjusted Forecast",
    color: "#fbbf24",
    width: 2.5,
    category: "trader_tool",
  },
  net_procurement: {
    label: "Net Thermal Procurement Gap",
    color: "#f87171",
    dash: [5, 2],
    width: 2.5,
    category: "trader_tool",
  },
};

interface DataContextType {
  dateRange: DateRange;
  setDateRange: (range: DateRange) => void;
  spanMode: SpanMode;
  setSpanMode: (mode: SpanMode) => void;
  shiftDateRange: (direction: number) => void;
  showActual: boolean;
  setShowActual: (show: boolean) => void;
  showForecast: boolean;
  setShowForecast: (show: boolean) => void;
  actualColor: string;
  setActualColor: (color: string) => void;
  filters: VintageFilterState;
  setFilters: (filters: Partial<VintageFilterState>) => void;
  resetFilters: () => void;
  allVintageRows: VintageRowData[];
  filteredVintageRows: VintageRowData[];
  visibleVintageIds: Set<string>;
  toggleVintageVisibility: (id: string) => void;
  toggleSelectAllFiltered: () => void;
  setVintageColor: (id: string, color: string) => void;
  enabledAggregates: Set<AggregateSeriesType>;
  toggleAggregate: (type: AggregateSeriesType) => void;
  targetDemandMw: number;
  setTargetDemandMw: (demand: number) => void;
  procurementBaseline: ProcurementBaseline;
  setProcurementBaseline: (baseline: ProcurementBaseline) => void;
  aggregateSeriesData: Map<string, (number | null)[]>;
  data: AlignedDataSeries;
  loading: boolean;
  fetchingVintageId: string | null;
  fetchData: () => Promise<void>;
  fetchVintage: (id: string) => Promise<void>;
}

const emptySeries: AlignedDataSeries = {
  timestamps: [],
  startTimes: [],
  settlementPeriods: [],
  actualMw: [],
  vintageIds: [],
  vintageMw: [],
};

const initialFilters: VintageFilterState = {
  searchQuery: "",
  timeOfDay: "all",
};

const normalizeTimeKey = (t: string) =>
  t.replace("T", " ").replace("Z", "").slice(0, 19);

const generateTimeline = (startDate: string, endDate: string) => {
  const timestamps: number[] = [];
  const startTimes: string[] = [];
  const settlementPeriods: number[] = [];

  const [sY, sM, sD] = startDate.split("-").map(Number);
  const [eY, eM, eD] = endDate.split("-").map(Number);

  const cur = new Date(Date.UTC(sY, sM - 1, sD, 0, 0, 0));
  const stop = new Date(Date.UTC(eY, eM - 1, eD, 23, 30, 0));

  let sp = 1;
  while (cur <= stop) {
    const sTime = cur.toISOString().slice(0, 19).replace("T", " ");
    const ts = Math.floor(cur.getTime() / 1000);
    timestamps.push(ts);
    startTimes.push(sTime);
    settlementPeriods.push(sp);

    sp = sp === 48 ? 1 : sp + 1;
    cur.setUTCMinutes(cur.getUTCMinutes() + 30);
  }

  return { timestamps, startTimes, settlementPeriods };
};

const DataContext = createContext<DataContextType | null>(null);

export const useData = () => {
  const context = useContext(DataContext);
  if (!context) {
    throw new Error("useData must be used within a DataProvider");
  }
  return context;
};

export const DataProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [dateRange, setDateRangeState] = useState<DateRange>({
    startDate: "2026-01-01",
    endDate: "2026-01-01",
  });
  const [spanMode, setSpanModeState] = useState<SpanMode>("1d");

  const [showActual, setShowActual] = useState(true);
  const [showForecast, setShowForecast] = useState(true);
  const [actualColor, setActualColor] = useState("#38bdf8");
  const [filters, setFilterState] = useState<VintageFilterState>(initialFilters);
  const [loading, setLoading] = useState(false);
  const [fetchingVintageId, setFetchingVintageId] = useState<string | null>(null);

  const [enabledAggregates, setEnabledAggregates] = useState<Set<AggregateSeriesType>>(
    new Set(["mean_48c", "best_fit"])
  );
  const [targetDemandMw, setTargetDemandMw] = useState<number>(25000);
  const [procurementBaseline, setProcurementBaseline] = useState<ProcurementBaseline>("calibrated");

  const [rawActual, setRawActual] = useState<ActualRecordTuple[]>([]);
  const [rawForecast, setRawForecast] = useState<ForecastResponse>([]);
  const [visibleVintageIds, setVisibleVintageIds] = useState<Set<string>>(new Set());
  const [vintageColors, setVintageColors] = useState<Map<string, string>>(new Map());
  const visibleVintageIdsRef = useRef<Set<string>>(visibleVintageIds);
  visibleVintageIdsRef.current = visibleVintageIds;

  const abortControllerRef = useRef<AbortController | null>(null);

  const setDateRange = (range: DateRange) => {
    setDateRangeState(range);
  };

  const setSpanMode = (mode: SpanMode) => {
    setSpanModeState(mode);
    const [sY, sM, sD] = dateRange.startDate.split("-").map(Number);
    const start = new Date(Date.UTC(sY, sM - 1, sD, 0, 0, 0));
    const days = mode === "1d" ? 0 : mode === "3d" ? 2 : 6;
    const end = new Date(start);
    end.setUTCDate(end.getUTCDate() + days);
    setDateRangeState({
      startDate: dateRange.startDate,
      endDate: end.toISOString().slice(0, 10),
    });
  };

  const shiftDateRange = (direction: number) => {
    const days = spanMode === "1d" ? 1 : spanMode === "3d" ? 3 : 7;
    const [sY, sM, sD] = dateRange.startDate.split("-").map(Number);
    const start = new Date(Date.UTC(sY, sM - 1, sD, 0, 0, 0));
    start.setUTCDate(start.getUTCDate() + direction * days);

    const spanDays = spanMode === "1d" ? 0 : spanMode === "3d" ? 2 : 6;
    const end = new Date(start);
    end.setUTCDate(end.getUTCDate() + spanDays);

    setDateRangeState({
      startDate: start.toISOString().slice(0, 10),
      endDate: end.toISOString().slice(0, 10),
    });
  };

  const setFilters = (newFilters: Partial<VintageFilterState>) => {
    setFilterState((prev) => ({ ...prev, ...newFilters }));
  };

  const resetFilters = () => {
    setFilterState(initialFilters);
  };

  const toggleAggregate = (type: AggregateSeriesType) => {
    setEnabledAggregates((prev) => {
      const next = new Set(prev);
      if (next.has(type)) {
        next.delete(type);
      } else {
        next.add(type);
      }
      return next;
    });
  };

  const fetchData = useCallback(async () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    const controller = new AbortController();
    abortControllerRef.current = controller;

    setLoading(true);
    try {
      const [actualRows, forecastRows] = await Promise.all([
        fetch(
          `/api/v1/data/actual?start_date=${dateRange.startDate}&end_date=${dateRange.endDate}`,
          { signal: controller.signal }
        ).then((r) => r.json() as Promise<ActualResponse>),
        fetch(
          `/api/v1/data/forecast?start_date=${dateRange.startDate}&end_date=${dateRange.endDate}`,
          { signal: controller.signal }
        ).then((r) => r.json() as Promise<ForecastResponse>),
      ]);

      setRawActual(actualRows);
      setRawForecast(forecastRows);
    } catch (err: unknown) {
      if (err instanceof DOMException && err.name === "AbortError") {
        return;
      }
    } finally {
      if (abortControllerRef.current === controller) {
        setLoading(false);
      }
    }
  }, [dateRange.startDate, dateRange.endDate]);

  useEffect(() => {
    fetchData();
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  const fetchVintage = async (id: string) => {
    setFetchingVintageId(id);
    try {
      const cleanPub = id.replace(" ", "T");
      const url = `/api/v1/data/forecast?start_date=${dateRange.startDate}&end_date=${dateRange.endDate}&publish_time=${encodeURIComponent(cleanPub)}&fetch_missing=true`;
      const newRows: ForecastResponse = await fetch(url).then((r) => r.json());

      if (newRows.length > 0) {
        setRawForecast((prev) => {
          const existingKeys = new Set(
            prev.map((r) => `${r[0]}_${r[1]}`)
          );
          const combined = [...prev];
          for (let i = 0; i < newRows.length; i++) {
            const key = `${newRows[i][0]}_${newRows[i][1]}`;
            if (!existingKeys.has(key)) {
              combined.push(newRows[i]);
            }
          }
          return combined;
        });

        setVisibleVintageIds((prev) => new Set(prev).add(id));
      }
    } catch {
    } finally {
      setFetchingVintageId(null);
    }
  };

  const timeline = useMemo(() => {
    return generateTimeline(dateRange.startDate, dateRange.endDate);
  }, [dateRange.startDate, dateRange.endDate]);

  const timeMap = useMemo(() => {
    const map = new Map<string, number>();
    for (let i = 0; i < timeline.startTimes.length; i++) {
      map.set(normalizeTimeKey(timeline.startTimes[i]), i);
    }
    return map;
  }, [timeline.startTimes]);

  const cleanActual = useMemo<ActualRecordTuple[]>(() => {
    if (rawActual.length === 0) return [];
    const map = new Map<string, ActualRecordTuple>();
    for (let i = 0; i < rawActual.length; i++) {
      const row = rawActual[i];
      const key = normalizeTimeKey(row[0]);
      const existing = map.get(key);
      if (!existing || row[1] > existing[1]) {
        map.set(key, row);
      }
    }
    return Array.from(map.values()).sort((a, b) =>
      normalizeTimeKey(a[0]).localeCompare(normalizeTimeKey(b[0]))
    );
  }, [rawActual]);

  const actualMw = useMemo(() => {
    const arr: (number | null)[] = new Array(timeline.startTimes.length).fill(null);
    for (let i = 0; i < cleanActual.length; i++) {
      const sKey = normalizeTimeKey(cleanActual[i][0]);
      const idx = timeMap.get(sKey);
      if (idx !== undefined) {
        arr[idx] = cleanActual[i][5];
      }
    }
    return arr;
  }, [timeline.startTimes.length, cleanActual, timeMap]);

  const { baseVintageRows, baseVintageMap, aggregateSeriesData } = useMemo(() => {
    const timelineLen = timeline.startTimes.length;
    if (timelineLen === 0) {
      return {
        baseVintageRows: [] as VintageRowData[],
        baseVintageMap: new Map<string, VintageRowData>(),
        aggregateSeriesData: new Map<string, (number | null)[]>(),
      };
    }

    const vintageDataMap = new Map<string, Map<number, number>>();
    const aggMap = new Map<string, Map<number, number>>();

    for (let i = 0; i < rawForecast.length; i++) {
      const f = rawForecast[i];
      const sKey = normalizeTimeKey(f[0]);
      const pubTime = f[1];
      const mw = f[2];

      const tIdx = timeMap.get(sKey);
      if (tIdx !== undefined) {
        if (pubTime.startsWith("AGG_")) {
          if (!aggMap.has(pubTime)) {
            aggMap.set(pubTime, new Map());
          }
          aggMap.get(pubTime)!.set(tIdx, mw);
          if (tIdx + 1 < timelineLen && tIdx % 2 === 0) {
            aggMap.get(pubTime)!.set(tIdx + 1, mw);
          }
        } else {
          if (!vintageDataMap.has(pubTime)) {
            vintageDataMap.set(pubTime, new Map());
          }
          vintageDataMap.get(pubTime)!.set(tIdx, mw);
          if (tIdx + 1 < timelineLen && tIdx % 2 === 0) {
            vintageDataMap.get(pubTime)!.set(tIdx + 1, mw);
          }
        }
      }
    }

    const allPubTimes = Array.from(vintageDataMap.keys())
      .filter((id) => !id.startsWith("AGG_"))
      .sort();

    const baseRows: VintageRowData[] = allPubTimes.map((id, index) => {
      const pointsMap = vintageDataMap.get(id);
      const values: (number | null)[] = new Array(timelineLen).fill(null);
      let dataCount = 0;

      if (pointsMap) {
        for (let i = 0; i < timelineLen; i++) {
          if (pointsMap.has(i)) {
            values[i] = pointsMap.get(i)!;
            dataCount++;
          }
        }
      }

      const firstValidIndex = values.findIndex((v) => v !== null);
      const defaultColor = PALETTE[index % PALETTE.length];

      return {
        id,
        label: id.replace("T", " ").replace("Z", "").slice(0, 16),
        color: vintageColors.get(id) || defaultColor,
        get visible() {
          return visibleVintageIdsRef.current.has(id);
        },
        hasData: dataCount > 0,
        dataCount,
        firstValidIndex,
        values,
      };
    });

    const parsedAggregates = new Map<string, (number | null)[]>();
    const aggMapping: [string, string][] = [
      ["AGG_MEAN_48C", "mean_48c"],
      ["AGG_MEAN_3D", "mean_3d"],
      ["AGG_MEAN_7D", "mean_7d"],
      ["AGG_BEST_FIT", "best_fit"],
      ["AGG_CALIBRATED", "calibrated"],
      ["AGG_P10", "p10"],
      ["AGG_P90", "p90"],
    ];

    aggMapping.forEach(([apiKey, aggType]) => {
      const pMap = aggMap.get(apiKey);
      if (pMap) {
        const arr: (number | null)[] = new Array(timelineLen).fill(null);
        for (let i = 0; i < timelineLen; i++) {
          if (pMap.has(i)) {
            arr[i] = pMap.get(i)!;
          }
        }
        parsedAggregates.set(aggType, arr);
      }
    });

    const rowMap = new Map<string, VintageRowData>();
    for (let i = 0; i < baseRows.length; i++) {
      rowMap.set(baseRows[i].id, baseRows[i]);
    }

    return {
      baseVintageRows: baseRows,
      baseVintageMap: rowMap,
      aggregateSeriesData: parsedAggregates,
    };
  }, [timeline.startTimes.length, rawForecast, timeMap, vintageColors]);

  const allVintageRows = baseVintageRows;

  const filteredVintageRows = useMemo<VintageRowData[]>(() => {
    const deliveryEndLimit = `${dateRange.endDate} 23:59:59`;

    return baseVintageRows.filter((row) => {
      if (!row.hasData) return false;

      const pubTimeClean = row.id.replace("T", " ").slice(0, 19);
      if (pubTimeClean > deliveryEndLimit) return false;

      if (filters.searchQuery) {
        const q = filters.searchQuery.toLowerCase();
        if (!row.id.toLowerCase().includes(q) && !row.label.toLowerCase().includes(q)) {
          return false;
        }
      }

      const timePart = row.id.slice(11, 16);
      const hour = parseInt(timePart.slice(0, 2), 10);

      if (filters.timeOfDay === "00-06" && (hour < 0 || hour >= 6)) return false;
      if (filters.timeOfDay === "06-12" && (hour < 6 || hour >= 12)) return false;
      if (filters.timeOfDay === "12-18" && (hour < 12 || hour >= 18)) return false;
      if (filters.timeOfDay === "18-24" && (hour < 18 || hour >= 24)) return false;

      return true;
    });
  }, [baseVintageRows, filters, dateRange.endDate]);

  const data = useMemo<AlignedDataSeries>(() => {
    if (timeline.timestamps.length === 0) return emptySeries;

    const vintageIds: string[] = [];
    const vintageMw: (number | null)[][] = [];

    if (showForecast) {
      for (const id of visibleVintageIds) {
        const row = baseVintageMap.get(id);
        if (row) {
          vintageIds.push(row.id);
          vintageMw.push(row.values);
        }
      }

      enabledAggregates.forEach((aggType) => {
        if (aggType === "net_procurement") {
          let base = aggregateSeriesData.get(procurementBaseline);
          if (!base || !base.some((v) => v !== null)) {
            base =
              aggregateSeriesData.get("calibrated") ||
              aggregateSeriesData.get("best_fit") ||
              aggregateSeriesData.get("mean_48c");
          }

          const netMw: (number | null)[] = new Array(timeline.startTimes.length).fill(null);
          for (let i = 0; i < timeline.startTimes.length; i++) {
            const w = base ? base[i] : null;
            if (w !== null) {
              netMw[i] = Math.max(0, targetDemandMw - w);
            }
          }
          vintageIds.push("AGG_NET_PROCUREMENT");
          vintageMw.push(netMw);
        } else if (aggType === "p10_p90") {
          const p10Vals = aggregateSeriesData.get("p10");
          const p90Vals = aggregateSeriesData.get("p90");
          if (p10Vals && p10Vals.some((v) => v !== null)) {
            vintageIds.push("AGG_P10");
            vintageMw.push(p10Vals);
          }
          if (p90Vals && p90Vals.some((v) => v !== null)) {
            vintageIds.push("AGG_P90");
            vintageMw.push(p90Vals);
          }
        } else {
          const vals = aggregateSeriesData.get(aggType);
          if (vals && vals.some((v) => v !== null)) {
            vintageIds.push(`AGG_${aggType.toUpperCase()}`);
            vintageMw.push(vals);
          }
        }
      });
    }

    return {
      timestamps: timeline.timestamps,
      startTimes: timeline.startTimes,
      settlementPeriods: timeline.settlementPeriods,
      actualMw,
      vintageIds,
      vintageMw,
    };
  }, [
    timeline,
    actualMw,
    showForecast,
    visibleVintageIds,
    baseVintageMap,
    enabledAggregates,
    aggregateSeriesData,
    targetDemandMw,
    procurementBaseline,
  ]);

  const toggleSelectAllFiltered = useCallback(() => {
    const allSelected =
      filteredVintageRows.length > 0 &&
      filteredVintageRows.every((r) => visibleVintageIds.has(r.id));

    setVisibleVintageIds((prev) => {
      if (allSelected) {
        return new Set();
      }
      const next = new Set(prev);
      for (let i = 0; i < filteredVintageRows.length; i++) {
        next.add(filteredVintageRows[i].id);
      }
      return next;
    });
  }, [filteredVintageRows, visibleVintageIds]);

  const toggleVintageVisibility = useCallback((id: string) => {
    setVisibleVintageIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  const setVintageColor = useCallback((id: string, color: string) => {
    setVintageColors((prev) => {
      const next = new Map(prev);
      next.set(id, color);
      return next;
    });
  }, []);

  return (
    <DataContext.Provider
      value={{
        dateRange,
        setDateRange,
        spanMode,
        setSpanMode,
        shiftDateRange,
        showActual,
        setShowActual,
        showForecast,
        setShowForecast,
        actualColor,
        setActualColor,
        filters,
        setFilters,
        resetFilters,
        allVintageRows,
        filteredVintageRows,
        visibleVintageIds,
        toggleVintageVisibility,
        toggleSelectAllFiltered,
        setVintageColor,
        enabledAggregates,
        toggleAggregate,
        targetDemandMw,
        setTargetDemandMw,
        procurementBaseline,
        setProcurementBaseline,
        aggregateSeriesData,
        data,
        loading,
        fetchingVintageId,
        fetchData,
        fetchVintage,
      }}
    >
      {children}
    </DataContext.Provider>
  );
};
