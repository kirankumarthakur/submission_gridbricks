import React, { useEffect, useRef, useMemo } from "react";
import uPlot from "uplot";
import "uplot/dist/uPlot.min.css";
import { useData, AGGREGATE_CONFIGS } from "../context/DataContext";

const AGG_SERIES_META: Record<
  string,
  { label: string; stroke: string; width: number; dash?: number[] }
> = {
  AGG_MEAN_48C: {
    label: AGGREGATE_CONFIGS.mean_48c.label,
    stroke: AGGREGATE_CONFIGS.mean_48c.color,
    width: AGGREGATE_CONFIGS.mean_48c.width,
  },
  AGG_MEAN_3D: {
    label: AGGREGATE_CONFIGS.mean_3d.label,
    stroke: AGGREGATE_CONFIGS.mean_3d.color,
    width: AGGREGATE_CONFIGS.mean_3d.width,
    dash: AGGREGATE_CONFIGS.mean_3d.dash,
  },
  AGG_MEAN_7D: {
    label: AGGREGATE_CONFIGS.mean_7d.label,
    stroke: AGGREGATE_CONFIGS.mean_7d.color,
    width: AGGREGATE_CONFIGS.mean_7d.width,
    dash: AGGREGATE_CONFIGS.mean_7d.dash,
  },
  AGG_BEST_FIT: {
    label: AGGREGATE_CONFIGS.best_fit.label,
    stroke: AGGREGATE_CONFIGS.best_fit.color,
    width: AGGREGATE_CONFIGS.best_fit.width,
  },
  AGG_P10_P90: {
    label: AGGREGATE_CONFIGS.p10_p90.label,
    stroke: AGGREGATE_CONFIGS.p10_p90.color,
    width: AGGREGATE_CONFIGS.p10_p90.width,
    dash: AGGREGATE_CONFIGS.p10_p90.dash,
  },
  AGG_P10: {
    label: "P10 Downside Wind",
    stroke: "#f59e0b",
    width: 1.5,
    dash: [2, 2],
  },
  AGG_P90: {
    label: "P90 Upside Wind",
    stroke: "#f59e0b",
    width: 1.5,
    dash: [2, 2],
  },
  AGG_CALIBRATED: {
    label: AGGREGATE_CONFIGS.calibrated.label,
    stroke: AGGREGATE_CONFIGS.calibrated.color,
    width: AGGREGATE_CONFIGS.calibrated.width,
  },
  AGG_NET_PROCUREMENT: {
    label: AGGREGATE_CONFIGS.net_procurement.label,
    stroke: AGGREGATE_CONFIGS.net_procurement.color,
    width: AGGREGATE_CONFIGS.net_procurement.width,
    dash: AGGREGATE_CONFIGS.net_procurement.dash,
  },
};

const buildSeriesOptions = (
  showActual: boolean,
  actualColor: string,
  showForecast: boolean,
  seriesConfigs: { id: string; label: string; color: string; width: number; dash?: number[] }[],
  isDense: boolean
): uPlot.Series[] => {
  const series: uPlot.Series[] = [
    {
      label: "Time",
    },
  ];

  if (showActual) {
    series.push({
      label: "Actual",
      stroke: actualColor,
      width: 2.5,
      points: { show: false },
      spanGaps: true,
    });
  }

  if (showForecast) {
    for (let i = 0; i < seriesConfigs.length; i++) {
      const v = seriesConfigs[i];
      series.push({
        label: v.label,
        stroke: v.color,
        width: v.width,
        points: { show: false },
        dash: isDense ? undefined : (v.dash || [4, 2]),
        spanGaps: true,
      });
    }
  }

  return series;
};

const createTooltipPlugin = () => {
  let tooltip: HTMLDivElement;
  let lastIdx: number | null = null;

  return {
    hooks: {
      init: (u: uPlot) => {
        tooltip = document.createElement("div");
        tooltip.className =
          "absolute pointer-events-none hidden bg-[#262626]/95 border border-[#3d3d3d] rounded p-2.5 shadow-xl text-xs z-50 transition-opacity duration-75 text-[#eff1f6] min-w-44 font-sans";
        u.over.appendChild(tooltip);
      },
      setCursor: (u: uPlot) => {
        const { left, top, idx } = u.cursor;

        if (
          idx === null ||
          idx === undefined ||
          left === undefined ||
          top === undefined ||
          left < 0 ||
          top < 0
        ) {
          if (tooltip) tooltip.style.display = "none";
          lastIdx = null;
          return;
        }

        const updatePosition = () => {
          const overRect = u.over.getBoundingClientRect();
          const tooltipWidth = tooltip.offsetWidth || 180;
          const tooltipHeight = tooltip.offsetHeight || 100;

          let posX = left + 15;
          let posY = top + 15;

          if (posX + tooltipWidth > overRect.width) {
            posX = left - tooltipWidth - 15;
          }
          if (posY + tooltipHeight > overRect.height) {
            posY = top - tooltipHeight - 15;
          }

          tooltip.style.left = `${Math.max(4, posX)}px`;
          tooltip.style.top = `${Math.max(4, posY)}px`;
        };

        if (idx === lastIdx && tooltip.style.display === "block") {
          updatePosition();
          return;
        }

        lastIdx = idx;

        const timestamp = u.data[0][idx];
        if (timestamp === undefined || timestamp === null) {
          if (tooltip) tooltip.style.display = "none";
          return;
        }

        const dateStr = new Date(timestamp * 1000)
          .toISOString()
          .replace("T", " ")
          .slice(0, 16) + " UTC";

        let actualVal: number | null = null;
        let seriesHtml = "";
        let displayedCount = 0;
        const MAX_ITEMS = 8;
        let totalItems = 0;

        for (let sIdx = 1; sIdx < u.series.length; sIdx++) {
          const s = u.series[sIdx];
          const val = u.data[sIdx]?.[idx];

          if (val === null || val === undefined) continue;
          totalItems++;

          const isActual = s.label === "Actual";
          if (isActual) {
            actualVal = val;
          }

          if (displayedCount >= MAX_ITEMS) continue;
          displayedCount++;

          let deltaHtml = "";
          if (!isActual && actualVal !== null && actualVal !== 0 && !s.label.includes("Procurement")) {
            const pct = ((val - actualVal) / actualVal) * 100;
            const sign = pct > 0 ? "+" : "";
            const colorClass =
              pct > 0
                ? "color: #34d399;"
                : pct < 0
                  ? "color: #fb7185;"
                  : "color: #9ca3af;";
            deltaHtml = ` <span style="${colorClass} font-size: 10px;">(${sign}${pct.toFixed(1)}%)</span>`;
          }

          const strokeColor =
            typeof s.stroke === "function"
              ? (s.stroke(u, sIdx) as string)
              : (s.stroke as string) || "#ccc";

          seriesHtml += `
            <div class="flex items-center justify-between gap-3 text-[11px] py-0.5">
              <div class="flex items-center gap-1.5 overflow-hidden">
                <span class="w-2 h-2 rounded-full shrink-0" style="background-color: ${strokeColor}"></span>
                <span class="text-[#cfcfcf] truncate max-w-32">${s.label}</span>
              </div>
              <div class="font-medium tabular-nums text-right text-[#eff1f6]">
                ${val.toLocaleString(undefined, { maximumFractionDigits: 1 })} MW
                ${deltaHtml}
              </div>
            </div>
          `;
        }

        if (!seriesHtml) {
          if (tooltip) tooltip.style.display = "none";
          return;
        }

        if (totalItems > MAX_ITEMS) {
          seriesHtml += `
            <div class="text-[10px] text-[#888888] pt-1 text-center font-sans">
              + ${totalItems - MAX_ITEMS} more series
            </div>
          `;
        }

        tooltip.innerHTML = `
          <div class="font-medium text-[#858585] border-b border-[#3d3d3d] pb-1 mb-1.5 font-sans">
            ${dateStr}
          </div>
          <div class="flex flex-col gap-0.5 font-sans">
            ${seriesHtml}
          </div>
        `;

        tooltip.style.display = "block";
        updatePosition();
      },
      destroy: () => {
        if (tooltip && tooltip.parentNode) {
          tooltip.parentNode.removeChild(tooltip);
        }
      },
    },
  };
};

const buildUPlotOptions = (
  width: number,
  height: number,
  series: uPlot.Series[],
  timeBounds: [number, number] | null
): uPlot.Options => {
  return {
    width,
    height,
    tzDate: (ts: number) => uPlot.tzDate(new Date(ts * 1000), "UTC"),
    plugins: [createTooltipPlugin()],
    cursor: {
      drag: { x: true, y: true },
      sync: { key: "wind_stream" },
      dataIdx: (self: uPlot, seriesIdx: number, closestIdx: number) => {
        const val = self.data[seriesIdx]?.[closestIdx];
        return val !== null && val !== undefined ? closestIdx : null;
      },
      points: {
        show: true,
        size: 8,
        width: 2,
        stroke: (u: uPlot, seriesIdx: number) => {
          const s = u.series[seriesIdx];
          return typeof s.stroke === "function"
            ? (s.stroke(u, seriesIdx) as string)
            : (s.stroke as string) || "#38bdf8";
        },
        fill: (u: uPlot, seriesIdx: number) => {
          const s = u.series[seriesIdx];
          return typeof s.stroke === "function"
            ? (s.stroke(u, seriesIdx) as string)
            : (s.stroke as string) || "#38bdf8";
        },
      },
    },
    scales: {
      x: {
        time: true,
        auto: false,
        range: (u, min, max) => {
          if (timeBounds) {
            return timeBounds;
          }
          return [min, max];
        },
      },
      y: {
        auto: true,
        range: (u, dataMin, dataMax) => {
          const min = 0;
          const max = dataMax && dataMax > 0 ? Math.ceil(dataMax * 1.05) : 20000;
          return [min, max];
        },
      },
    },
    axes: [
      {
        stroke: "#707070",
        grid: { stroke: "#262626", width: 1 },
        ticks: { stroke: "#3d3d3d", width: 1 },
        font: "10px sans-serif",
        gap: 8,
        values: (self, splits) => {
          return splits.map((ts) => {
            const d = new Date(ts * 1000);
            const h = d.getUTCHours();
            const m = d.getUTCMinutes();
            const mStr = m > 0 ? `:${m < 10 ? "0" : ""}${m}` : "";
            if (h === 0 && m === 0) {
              const month = d.toLocaleString("en-US", {
                month: "short",
                timeZone: "UTC",
              });
              return `${month} ${d.getUTCDate()}`;
            }
            const ampm = h >= 12 ? "pm" : "am";
            const h12 = h % 12 || 12;
            return `${h12}${mStr}${ampm}`;
          });
        },
      },
      {
        stroke: "#707070",
        grid: { stroke: "#262626", width: 1 },
        ticks: { stroke: "#3d3d3d", width: 1 },
        font: "10px sans-serif",
        gap: 8,
        values: (u, vals) => vals.map((v) => (v >= 1000 ? `${(v / 1000).toFixed(0)}k` : `${v}`)),
      },
    ],
    series,
  };
};

const PlotsPane: React.FC = () => {
  const {
    data,
    showActual,
    showForecast,
    actualColor,
    allVintageRows,
    loading,
  } = useData();

  const containerRef = useRef<HTMLDivElement>(null);
  const plotInstanceRef = useRef<uPlot | null>(null);

  const vintageMap = useMemo(() => {
    const map = new Map<string, { label: string; color: string }>();
    for (let i = 0; i < allVintageRows.length; i++) {
      const r = allVintageRows[i];
      map.set(r.id, { label: r.label, color: r.color });
    }
    return map;
  }, [allVintageRows]);

  const isDense = data.timestamps.length > 300;

  const seriesConfigs = useMemo(() => {
    return data.vintageIds.map((id) => {
      if (id.startsWith("AGG_")) {
        const meta = AGG_SERIES_META[id] || {
          label: id.replace("AGG_", ""),
          stroke: "#a3a3a3",
          width: 1.5,
        };
        return {
          id,
          label: meta.label,
          color: meta.stroke,
          width: meta.width,
          dash: isDense ? undefined : meta.dash,
        };
      }

      const match = vintageMap.get(id);
      return {
        id,
        label: match ? match.label : id.slice(11, 16),
        color: match ? match.color : "#f59e0b",
        width: 1.5,
        dash: isDense ? undefined : [4, 2],
      };
    });
  }, [data.vintageIds, vintageMap, isDense]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const width = container.clientWidth || 800;
    const height = container.clientHeight || 400;

    if (data.timestamps.length === 0) {
      if (plotInstanceRef.current) {
        plotInstanceRef.current.destroy();
        plotInstanceRef.current = null;
      }
      return;
    }

    const timeBounds: [number, number] = [
      data.timestamps[0],
      data.timestamps[data.timestamps.length - 1] + 1800,
    ];

    const seriesOptions = buildSeriesOptions(
      showActual,
      actualColor,
      showForecast,
      seriesConfigs,
      isDense
    );
    const uOptions = buildUPlotOptions(width, height, seriesOptions, timeBounds);

    const alignedArrays: (number | null)[][] = [data.timestamps];
    if (showActual) {
      alignedArrays.push(data.actualMw);
    }
    if (showForecast) {
      for (let i = 0; i < data.vintageMw.length; i++) {
        alignedArrays.push(data.vintageMw[i]);
      }
    }

    if (plotInstanceRef.current) {
      plotInstanceRef.current.destroy();
      plotInstanceRef.current = null;
    }

    plotInstanceRef.current = new uPlot(
      uOptions,
      alignedArrays as uPlot.AlignedData,
      container
    );

    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width: newWidth, height: newHeight } = entry.contentRect;
        if (newWidth > 0 && newHeight > 0 && plotInstanceRef.current) {
          plotInstanceRef.current.setSize({
            width: Math.floor(newWidth),
            height: Math.floor(newHeight),
          });
        }
      }
    });

    resizeObserver.observe(container);

    return () => {
      resizeObserver.disconnect();
    };
  }, [
    data,
    showActual,
    showForecast,
    actualColor,
    seriesConfigs,
  ]);

  useEffect(() => {
    return () => {
      if (plotInstanceRef.current) {
        plotInstanceRef.current.destroy();
        plotInstanceRef.current = null;
      }
    };
  }, []);

  return (
    <div className="w-full h-full relative bg-[#1e1e1e] overflow-hidden select-none font-sans">
      {data.timestamps.length === 0 && !loading && (
        <div className="w-full h-full flex items-center justify-center text-xs text-[#858585] font-sans">
          Click "Fetch Data" to render wind generation series
        </div>
      )}
      <div ref={containerRef} className="w-full h-full" />
    </div>
  );
};

export default PlotsPane;
