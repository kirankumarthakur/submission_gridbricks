import React, { useRef, useMemo, useCallback } from "react";
import { RotateCcw, ArrowRight } from "lucide-react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { useData } from "../context/DataContext";
import type { VintageRowData } from "../types";

const formatDeltaPercent = (forecast: number | null, actual: number | null) => {
  if (forecast === null || actual === null || actual === 0) {
    return null;
  }
  const pct = ((forecast - actual) / actual) * 100;
  const sign = pct > 0 ? "+" : "";
  const color =
    pct > 0
      ? "text-emerald-400"
      : pct < 0
        ? "text-rose-400"
        : "text-zinc-400";
  return {
    text: `${sign}${pct.toFixed(1)}%`,
    color,
  };
};

const formatTimeHeader = (sTime: string, sp: number) => {
  const parts = sTime.slice(5, 16).replace("T", " ");
  return {
    time: parts,
    sp: `SP ${sp}`,
  };
};

const VintageTableRow = React.memo<{
  row: VintageRowData;
  visible: boolean;
  rIdx: number;
  actualMw: (number | null)[];
  isFetching: boolean;
  onToggle: (id: string) => void;
  onFetch: (id: string) => void;
  onScrollTo: (idx: number) => void;
  virtualColumns: { index: number; start: number; size: number }[];
  totalWidth: number;
  topOffset: number;
  height: number;
}>(
  ({
    row,
    visible,
    rIdx,
    actualMw,
    isFetching,
    onToggle,
    onFetch,
    onScrollTo,
    virtualColumns,
    totalWidth,
    topOffset,
    height,
  }) => {
    return (
      <div
        className={`flex border-b border-[#292929] hover:bg-[#262626] transition absolute left-0 ${
          rIdx % 2 === 0 ? "bg-[#1c1c1c]" : "bg-[#1f1f1f]"
        } ${visible ? "bg-opacity-80 border-l-2 border-l-sky-500" : ""}`}
        style={{
          top: `${topOffset}px`,
          height: `${height}px`,
          width: `${totalWidth}px`,
        }}
      >
        <div
          className={`sticky left-0 z-10 flex items-center border-r border-[#383838] shadow-[2px_0_5px_-2px_rgba(0,0,0,0.5)] w-[288px] shrink-0 h-full ${
            rIdx % 2 === 0 ? "bg-[#1c1c1c]" : "bg-[#1f1f1f]"
          }`}
        >
          <div className="w-9 px-2 py-2 flex items-center justify-center shrink-0 border-r border-[#292929]">
            <input
              type="checkbox"
              checked={visible}
              onChange={() => onToggle(row.id)}
              title={
                row.hasData
                  ? "Plot vintage on chart"
                  : "No data loaded yet - click refresh icon to fetch"
              }
              className="w-3.5 h-3.5 rounded bg-[#1e1e1e] border-[#444444] text-sky-500 focus:ring-0 cursor-pointer"
            />
          </div>
          <div className="w-7 px-1 py-2 flex items-center justify-center shrink-0 border-r border-[#292929]">
            <span
              className="w-2.5 h-2.5 rounded-full"
              style={{ backgroundColor: row.color }}
            />
          </div>
          <div className="w-56 px-2.5 py-2 shrink-0 tabular-nums font-medium text-[#d1d5db] flex items-center justify-between gap-1">
            <span className="truncate">{row.label}</span>

            <div className="flex items-center gap-1 shrink-0">
              {row.firstValidIndex > 0 && (
                <button
                  onClick={() => onScrollTo(row.firstValidIndex)}
                  className="px-1 py-0.5 rounded text-[9px] text-sky-400 hover:text-sky-300 hover:bg-sky-950/40 border border-sky-800/40 flex items-center gap-0.5 cursor-pointer"
                  title={`Forecast starts at settlement period ${row.firstValidIndex + 1}. Click to jump.`}
                >
                  <span>Jump</span>
                  <ArrowRight className="w-2.5 h-2.5" />
                </button>
              )}
              {!row.hasData && (
                <button
                  onClick={() => onFetch(row.id)}
                  disabled={isFetching}
                  title="Fetch vintage data from Elexon"
                  className="p-1 rounded hover:bg-[#333333] text-sky-400 hover:text-sky-300 transition cursor-pointer disabled:opacity-50"
                >
                  <RotateCcw
                    className={`w-3 h-3 ${isFetching ? "animate-spin" : ""}`}
                  />
                </button>
              )}
            </div>
          </div>
        </div>

        <div className="relative flex-1 h-full">
          {virtualColumns.map((vCol) => {
            const tIdx = vCol.index;
            const val = row.values[tIdx];
            const act = actualMw[tIdx];
            const delta = formatDeltaPercent(val, act);
            const isPrePublish = row.firstValidIndex >= 0 && tIdx < row.firstValidIndex;

            return (
              <div
                key={vCol.index}
                className={`w-24 px-2 py-1.5 border-r border-[#282828] text-center tabular-nums flex flex-col items-center justify-center absolute top-0 h-full ${
                  isPrePublish ? "bg-[#181818]/60" : ""
                }`}
                style={{
                  left: `${vCol.start}px`,
                  width: `${vCol.size}px`,
                }}
              >
                {val !== null ? (
                  <>
                    <span className="text-[#eff1f6] text-[11px] font-medium">
                      {val.toLocaleString(undefined, {
                        maximumFractionDigits: 1,
                      })}
                    </span>
                    {delta && (
                      <span className={`text-[9px] font-sans ${delta.color}`}>
                        {delta.text}
                      </span>
                    )}
                  </>
                ) : isPrePublish ? (
                  <span
                    className="text-[#3a3a3a] text-[10px]"
                    title="Pre-publication period: this vintage was published after this timestamp"
                  >
                    —
                  </span>
                ) : (
                  <span className="text-[#555555]">-</span>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  }
);

VintageTableRow.displayName = "VintageTableRow";

const DataPane: React.FC = () => {
  const {
    data,
    showActual,
    setShowActual,
    actualColor,
    filteredVintageRows,
    visibleVintageIds,
    toggleVintageVisibility,
    toggleSelectAllFiltered,
    fetchVintage,
    fetchingVintageId,
    loading,
  } = useData();

  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const rowVirtualizer = useVirtualizer({
    count: filteredVintageRows.length,
    getScrollElement: () => scrollContainerRef.current,
    estimateSize: () => 36,
    overscan: 10,
  });

  const columnVirtualizer = useVirtualizer({
    horizontal: true,
    count: data.startTimes.length,
    getScrollElement: () => scrollContainerRef.current,
    estimateSize: () => 96,
    overscan: 8,
  });

  const allFilteredSelected =
    filteredVintageRows.length > 0 &&
    visibleVintageIds.size >= filteredVintageRows.length;
  const someFilteredSelected =
    !allFilteredSelected && visibleVintageIds.size > 0;

  const totalWidth = useMemo(() => {
    return 288 + data.startTimes.length * 96;
  }, [data.startTimes.length]);

  const virtualColumns = columnVirtualizer.getVirtualItems();

  const handleScrollTo = useCallback((idx: number) => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTo({
        left: Math.max(0, idx * 96),
        behavior: "smooth",
      });
    }
  }, []);

  if (data.timestamps.length === 0 && !loading) {
    return (
      <div className="w-full h-full flex items-center justify-center text-xs text-[#858585] font-sans">
        Select a span and click "Fetch Data" to populate the forecast grid.
      </div>
    );
  }

  return (
    <div
      ref={scrollContainerRef}
      className="w-full h-full overflow-auto bg-[#1a1a1a] select-none font-sans text-xs"
    >
      <div style={{ width: `${totalWidth}px` }} className="relative">
        <div
          className="flex border-b border-[#333333] bg-[#262626] sticky top-0 z-30 font-medium text-[#9e9e9e] text-[11px] h-9"
          style={{ width: `${totalWidth}px` }}
        >
          <div className="sticky left-0 z-40 bg-[#262626] flex items-center border-r border-[#383838] shadow-[2px_0_5px_-2px_rgba(0,0,0,0.5)] w-[288px] shrink-0 h-full">
            <div className="w-9 px-2 py-2 flex items-center justify-center shrink-0 border-r border-[#333333]">
              <input
                type="checkbox"
                checked={allFilteredSelected}
                ref={(el) => {
                  if (el) el.indeterminate = someFilteredSelected;
                }}
                onChange={toggleSelectAllFiltered}
                title={
                  allFilteredSelected
                    ? "Deselect all visible vintages"
                    : "Select all visible vintages"
                }
                className="w-3.5 h-3.5 rounded bg-[#1e1e1e] border-[#444444] text-sky-500 focus:ring-0 cursor-pointer"
              />
            </div>
            <div className="w-7 px-1 py-2 flex items-center justify-center shrink-0 border-r border-[#333333]">
              <span className="w-2 h-2 rounded-full bg-[#555555]" />
            </div>
            <div className="w-56 px-2.5 py-2 shrink-0 flex items-center justify-between">
              <span>Publish Time</span>
              <span className="text-[10px] text-[#707070] tabular-nums">
                ({filteredVintageRows.length})
              </span>
            </div>
          </div>

          <div className="relative flex-1 h-full">
            {virtualColumns.map((vCol) => {
              const sTime = data.startTimes[vCol.index];
              const sp = data.settlementPeriods[vCol.index];
              const { time, sp: spText } = formatTimeHeader(sTime, sp);
              return (
                <div
                  key={vCol.index}
                  className="w-24 px-2 py-1.5 border-r border-[#303030] flex flex-col items-center justify-center text-center text-[10px] tabular-nums absolute top-0 h-full"
                  style={{
                    left: `${vCol.start}px`,
                    width: `${vCol.size}px`,
                  }}
                >
                  <span className="text-[#eff1f6] font-medium">{time}</span>
                  <span className="text-[#757575] text-[9px]">{spText}</span>
                </div>
              );
            })}
          </div>
        </div>

        <div
          style={{
            height: `${rowVirtualizer.getTotalSize()}px`,
            width: `${totalWidth}px`,
            position: "relative",
          }}
        >
          {rowVirtualizer.getVirtualItems().map((vRow) => {
            const row = filteredVintageRows[vRow.index];
            const isVisible = visibleVintageIds.has(row.id);
            return (
              <VintageTableRow
                key={row.id}
                row={row}
                visible={isVisible}
                rIdx={vRow.index}
                actualMw={data.actualMw}
                isFetching={fetchingVintageId === row.id}
                onToggle={toggleVintageVisibility}
                onFetch={fetchVintage}
                onScrollTo={handleScrollTo}
                virtualColumns={virtualColumns}
                totalWidth={totalWidth}
                topOffset={vRow.start}
                height={vRow.size}
              />
            );
          })}
        </div>

        <div
          className="flex border-t-2 border-[#383838] bg-[#222222] sticky bottom-0 z-20 hover:bg-[#262626] transition shadow-[0_-2px_5px_-2px_rgba(0,0,0,0.5)] h-9"
          style={{ width: `${totalWidth}px` }}
        >
          <div className="sticky left-0 z-30 bg-[#222222] flex items-center border-r border-[#383838] shadow-[2px_0_5px_-2px_rgba(0,0,0,0.5)] w-[288px] shrink-0 h-full">
            <div className="w-9 px-2 py-2 flex items-center justify-center shrink-0 border-r border-[#333333]">
              <input
                type="checkbox"
                checked={showActual}
                onChange={() => setShowActual(!showActual)}
                title="Toggle Actual Data on chart"
                className="w-3.5 h-3.5 rounded bg-[#1e1e1e] border-[#444444] text-sky-500 focus:ring-0 cursor-pointer"
              />
            </div>
            <div className="w-7 px-1 py-2 flex items-center justify-center shrink-0 border-r border-[#333333]">
              <span
                className="w-2.5 h-2.5 rounded-full"
                style={{ backgroundColor: actualColor }}
              />
            </div>
            <div className="w-56 px-2.5 py-2 shrink-0 font-medium text-[#eff1f6] flex items-center justify-between">
              <span>Actual Data</span>
              <span className="text-[10px] text-neutral-400">Outturn MW</span>
            </div>
          </div>

          <div className="relative flex-1 h-full">
            {virtualColumns.map((vCol) => {
              const mw = data.actualMw[vCol.index];
              return (
                <div
                  key={vCol.index}
                  className="w-24 px-2 py-2 border-r border-[#292929] text-center tabular-nums text-[#eff1f6] font-medium flex items-center justify-center bg-[#222222] absolute top-0 h-full"
                  style={{
                    left: `${vCol.start}px`,
                    width: `${vCol.size}px`,
                  }}
                >
                  {mw !== null
                    ? mw.toLocaleString(undefined, { maximumFractionDigits: 1 })
                    : "-"}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

export default DataPane;
