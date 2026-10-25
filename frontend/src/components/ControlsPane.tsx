import React, { useState, useRef, useEffect } from "react";
import {
  Calendar,
  RefreshCw,
  Search,
  RotateCcw,
  Clock,
  FilterX,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  X,
  Zap,
  Sliders,
} from "lucide-react";
import { useData, AGGREGATE_CONFIGS } from "../context/DataContext";
import type { TimeOfDayFilter, SpanMode, AggregateSeriesType } from "../types";

const SPAN_OPTIONS: { id: SpanMode; label: string }[] = [
  { id: "1d", label: "1 Day (48 SPs)" },
  { id: "3d", label: "3 Days" },
  { id: "7d", label: "7 Days" },
];

const TIME_OF_DAY_OPTIONS: { id: TimeOfDayFilter; label: string }[] = [
  { id: "all", label: "All Hours" },
  { id: "00-06", label: "00:00 - 06:00" },
  { id: "06-12", label: "06:00 - 12:00" },
  { id: "12-18", label: "12:00 - 18:00" },
  { id: "18-24", label: "18:00 - 24:00" },
];

const AGGREGATE_OPTIONS: {
  id: AggregateSeriesType;
  label: string;
  category: string;
}[] = [
  { id: "mean_48c", label: "Mean (Last 48 cycles / 24h)", category: "Ensembles" },
  { id: "mean_3d", label: "Mean (Last 3 days)", category: "Ensembles" },
  { id: "mean_7d", label: "Mean (Last 7 days)", category: "Ensembles" },
  { id: "best_fit", label: "Best Fit Consensus Curve", category: "Models" },
  { id: "p10_p90", label: "P10 - P90 Uncertainty Band", category: "Risk" },
  { id: "calibrated", label: "Bias-Adjusted Forecast", category: "Bidding" },
  { id: "net_procurement", label: "Net Thermal Procurement Gap", category: "Bidding" },
];

const SpanNavigationSection: React.FC = () => {
  const {
    dateRange,
    setDateRange,
    spanMode,
    setSpanMode,
    shiftDateRange,
    fetchData,
    loading,
  } = useData();

  const prevLabel = spanMode === "1d" ? "Prev Day" : "Prev Span";
  const nextLabel = spanMode === "1d" ? "Next Day" : "Next Span";

  return (
    <div className="p-3 border-b border-[#333333] flex flex-col gap-2.5">
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-medium uppercase tracking-wider text-[#9e9e9e] flex items-center gap-1.5">
          <Calendar className="w-3.5 h-3.5 text-[#858585]" />
          Span
        </span>
        <button
          onClick={() => fetchData()}
          disabled={loading}
          title="Refresh data from ClickHouse"
          className="p-1 rounded bg-[#2b2b2b] hover:bg-[#383838] text-[#eff1f6] transition cursor-pointer disabled:opacity-50"
        >
          <RotateCcw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
        </button>
      </div>

      <div className="grid grid-cols-3 gap-1 bg-[#161616] p-0.5 rounded border border-[#333333]">
        {SPAN_OPTIONS.map((opt) => {
          const active = spanMode === opt.id;
          return (
            <button
              key={opt.id}
              onClick={() => setSpanMode(opt.id)}
              className={`py-1 text-center rounded text-[10px] font-medium transition cursor-pointer truncate ${
                active
                  ? "bg-sky-600 text-white shadow-sm"
                  : "text-[#999999] hover:text-[#eff1f6]"
              }`}
            >
              {opt.label}
            </button>
          );
        })}
      </div>

      <div className="grid grid-cols-2 gap-2 text-xs">
        <div>
          <label className="text-[10px] text-[#858585] block mb-0.5">Start Date</label>
          <div className="flex items-center bg-[#181818] border border-[#383838] rounded px-2 py-1">
            <input
              type="date"
              value={dateRange.startDate}
              onChange={(e) => {
                const s = e.target.value;
                if (!s) return;
                const days = spanMode === "1d" ? 0 : spanMode === "3d" ? 2 : 6;
                const [sY, sM, sD] = s.split("-").map(Number);
                const end = new Date(Date.UTC(sY, sM - 1, sD, 0, 0, 0));
                end.setUTCDate(end.getUTCDate() + days);
                setDateRange({
                  startDate: s,
                  endDate: end.toISOString().slice(0, 10),
                });
              }}
              className="bg-transparent text-[#eff1f6] focus:outline-none w-full text-xs font-sans tabular-nums"
            />
          </div>
        </div>
        <div>
          <label className="text-[10px] text-[#858585] block mb-0.5">End Date</label>
          <div className="flex items-center bg-[#181818] border border-[#383838] rounded px-2 py-1">
            <input
              type="date"
              value={dateRange.endDate}
              onChange={(e) => {
                if (!e.target.value) return;
                setDateRange({
                  startDate: dateRange.startDate,
                  endDate: e.target.value,
                });
              }}
              className="bg-transparent text-[#eff1f6] focus:outline-none w-full text-xs font-sans tabular-nums"
            />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 pt-0.5">
        <button
          onClick={() => shiftDateRange(-1)}
          className="py-1 px-2 rounded bg-[#282828] hover:bg-[#333333] text-[10px] font-medium text-[#b3b3b3] transition cursor-pointer flex items-center justify-center gap-1"
        >
          <ChevronLeft className="w-3 h-3" />
          <span>{prevLabel}</span>
        </button>
        <button
          onClick={() => shiftDateRange(1)}
          className="py-1 px-2 rounded bg-[#282828] hover:bg-[#333333] text-[10px] font-medium text-[#b3b3b3] transition cursor-pointer flex items-center justify-center gap-1"
        >
          <span>{nextLabel}</span>
          <ChevronRight className="w-3 h-3" />
        </button>
      </div>

      <button
        onClick={() => fetchData()}
        disabled={loading}
        className="w-full mt-1 py-1.5 px-3 rounded bg-sky-600 hover:bg-sky-500 active:bg-sky-700 text-xs font-medium text-white transition cursor-pointer flex items-center justify-center gap-1.5 disabled:opacity-50 shadow-sm"
      >
        <RefreshCw className={`w-3 h-3 ${loading ? "animate-spin" : ""}`} />
        <span>{loading ? "Fetching..." : "Fetch Data"}</span>
      </button>
    </div>
  );
};

const FiltersSection: React.FC = () => {
  const {
    filters,
    setFilters,
    resetFilters,
    filteredVintageRows,
    allVintageRows,
  } = useData();

  return (
    <div className="p-3 border-b border-[#333333] flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-medium uppercase tracking-wider text-[#9e9e9e]">
          Filters
        </span>
        <button
          onClick={resetFilters}
          className="text-[10px] text-[#858585] hover:text-[#eff1f6] flex items-center gap-1 cursor-pointer transition"
          title="Reset filters"
        >
          <FilterX className="w-3 h-3" />
          <span>Reset</span>
        </button>
      </div>

      <div className="relative">
        <Search className="w-3.5 h-3.5 text-[#757575] absolute left-2.5 top-2" />
        <input
          type="text"
          value={filters.searchQuery}
          onChange={(e) => setFilters({ searchQuery: e.target.value })}
          placeholder="Search date or time..."
          className="w-full bg-[#181818] border border-[#383838] rounded pl-8 pr-2 py-1 text-xs text-[#eff1f6] placeholder-[#666666] focus:outline-none focus:border-sky-500 font-sans"
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label className="text-[10px] text-[#858585] font-medium flex items-center gap-1">
          <Clock className="w-3 h-3" />
          Publication Hour Window
        </label>
        <div className="flex flex-col gap-1">
          {TIME_OF_DAY_OPTIONS.map((t) => {
            const active = filters.timeOfDay === t.id;
            return (
              <button
                key={t.id}
                onClick={() => setFilters({ timeOfDay: t.id })}
                className={`py-1 px-2.5 rounded text-[11px] text-left transition cursor-pointer flex items-center justify-between ${
                  active
                    ? "bg-[#333333] text-sky-400 font-medium border border-sky-800/60"
                    : "bg-[#252525] hover:bg-[#2c2c2c] text-[#a3a3a3]"
                }`}
              >
                <span>{t.label}</span>
                {active && (
                  <span className="w-1.5 h-1.5 rounded-full bg-sky-400 shrink-0" />
                )}
              </button>
            );
          })}
        </div>
      </div>

      <div className="text-[10px] text-[#858585] pt-1">
        Showing <strong className="text-[#eff1f6]">{filteredVintageRows.length}</strong> of {allVintageRows.length} relevant vintages
      </div>
    </div>
  );
};

const PlotSeriesSection: React.FC = () => {
  const {
    showActual,
    setShowActual,
    actualColor,
    setActualColor,
    showForecast,
    setShowForecast,
    visibleVintageIds,
    enabledAggregates,
    toggleAggregate,
    targetDemandMw,
    setTargetDemandMw,
    procurementBaseline,
    setProcurementBaseline,
  } = useData();

  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="p-3 mt-auto border-t border-[#333333] flex flex-col gap-3 bg-[#1a1a1a]">
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-medium uppercase tracking-wider text-[#9e9e9e]">
          Plot Series
        </span>
        <span className="text-[10px] text-[#707070]">
          {enabledAggregates.size} active
        </span>
      </div>

      <div className="flex items-center justify-between">
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={showActual}
            onChange={() => setShowActual(!showActual)}
            className="w-3.5 h-3.5 rounded bg-[#181818] border-[#444444] text-sky-500 focus:ring-0 cursor-pointer"
          />
          <span className="text-xs font-medium text-[#eff1f6]">Actual Data</span>
        </label>
        <input
          type="color"
          value={actualColor}
          onChange={(e) => setActualColor(e.target.value)}
          className="w-4 h-4 rounded cursor-pointer border-0 p-0 bg-transparent"
          title="Change Actual line color"
        />
      </div>

      <div className="flex items-center justify-between">
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={showForecast}
            onChange={() => setShowForecast(!showForecast)}
            className="w-3.5 h-3.5 rounded bg-[#181818] border-[#444444] text-sky-500 focus:ring-0 cursor-pointer"
          />
          <span className="text-xs font-medium text-[#eff1f6]">Forecast Vintages</span>
        </label>
        <span className="text-[10px] text-[#707070]">
          ({visibleVintageIds.size} selected)
        </span>
      </div>

      <div className="relative pt-1" ref={dropdownRef}>
        <label className="text-[10px] text-[#888888] font-medium block mb-1 flex items-center justify-between">
          <span>Statistical & ML Curves</span>
          <Sliders className="w-3 h-3 text-[#707070]" />
        </label>

        <button
          onClick={() => setDropdownOpen(!dropdownOpen)}
          className="w-full bg-[#202020] hover:bg-[#262626] border border-[#383838] rounded px-2.5 py-1.5 text-xs text-left flex items-center justify-between transition cursor-pointer"
        >
          <span className="text-[#cccccc] text-[11px] truncate">
            Select Ensembles & Curves...
          </span>
          <ChevronDown
            className={`w-3.5 h-3.5 text-[#888888] transition-transform ${
              dropdownOpen ? "rotate-180" : ""
            }`}
          />
        </button>

        {dropdownOpen && (
          <div className="absolute left-0 right-0 bottom-full mb-1 bg-[#222222] border border-[#3d3d3d] rounded shadow-2xl z-50 max-h-56 overflow-y-auto py-1">
            {AGGREGATE_OPTIONS.map((opt) => {
              const active = enabledAggregates.has(opt.id);
              const config = AGGREGATE_CONFIGS[opt.id];
              return (
                <button
                  key={opt.id}
                  onClick={() => toggleAggregate(opt.id)}
                  className={`w-full px-2.5 py-1.5 text-left text-[11px] flex items-center justify-between hover:bg-[#2c2c2c] transition cursor-pointer ${
                    active ? "text-sky-300 font-medium bg-[#282828]" : "text-[#b0b0b0]"
                  }`}
                >
                  <div className="flex items-center gap-2 overflow-hidden">
                    <span
                      className="w-2.5 h-2.5 rounded-full shrink-0"
                      style={{ backgroundColor: config.color }}
                    />
                    <span className="truncate">{opt.label}</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={active}
                    onChange={() => {}}
                    className="w-3 h-3 rounded bg-[#181818] border-[#444444] text-sky-500 focus:ring-0 cursor-pointer pointer-events-none"
                  />
                </button>
              );
            })}
          </div>
        )}
      </div>

      {enabledAggregates.size > 0 && (
        <div className="flex flex-wrap gap-1.5 pt-1">
          {Array.from(enabledAggregates).map((aggKey) => {
            const config = AGGREGATE_CONFIGS[aggKey];
            if (!config) return null;
            return (
              <span
                key={aggKey}
                className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] bg-[#222222] border border-[#353535] text-[#d6d6d6] shadow-sm"
              >
                <span
                  className="w-2 h-2 rounded-full shrink-0"
                  style={{ backgroundColor: config.color }}
                />
                <span className="truncate max-w-[125px]">{config.label}</span>
                <button
                  onClick={() => toggleAggregate(aggKey)}
                  className="hover:text-rose-400 p-0.5 transition cursor-pointer text-[#777777]"
                  title="Remove series"
                >
                  <X className="w-2.5 h-2.5" />
                </button>
              </span>
            );
          })}
        </div>
      )}

      {enabledAggregates.has("net_procurement") && (
        <div className="mt-1 p-2 rounded bg-[#1d1d1d] border border-[#383838] flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-medium text-amber-400 flex items-center gap-1">
              <Zap className="w-3 h-3" />
              Consumer Demand Baseline
            </span>
            <span className="text-[10px] text-[#888888]">MW</span>
          </div>
          <input
            type="number"
            step={500}
            value={targetDemandMw}
            onChange={(e) => setTargetDemandMw(Number(e.target.value) || 0)}
            className="bg-[#141414] border border-[#3d3d3d] rounded px-2 py-1 text-xs text-[#eff1f6] tabular-nums focus:outline-none focus:border-amber-500"
          />
          <div className="flex flex-col gap-1">
            <span className="text-[10px] text-[#888888] font-medium">Hedge Basis (Wind Deducted):</span>
            <select
              value={procurementBaseline}
              onChange={(e) => setProcurementBaseline(e.target.value as any)}
              className="bg-[#141414] border border-[#3d3d3d] rounded px-2 py-1 text-[11px] text-[#eff1f6] focus:outline-none focus:border-amber-500"
            >
              <option value="calibrated">Bias-Adjusted (Calibrated)</option>
              <option value="p10">P10 (Conservative Downside)</option>
              <option value="best_fit">Best Fit Consensus Curve</option>
              <option value="mean_48c">Mean (Last 48 cycles)</option>
            </select>
          </div>
        </div>
      )}
    </div>
  );
};

const ControlsPane: React.FC = () => {
  return (
    <div className="w-full h-full flex flex-col bg-[#1e1e1e] border-r border-[#333333] select-none font-sans text-xs text-[#eff1f6] overflow-y-auto">
      <SpanNavigationSection />
      <FiltersSection />
      <PlotSeriesSection />
    </div>
  );
};

export default ControlsPane;
