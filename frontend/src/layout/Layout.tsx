import React, { useState } from "react";
import { Sliders, LineChart, Table as TableIcon } from "lucide-react";
import { Group, Panel, usePanelRef } from "react-resizable-panels";
import { PanelHeader } from "../components/PanelHeader";
import { SplitSeparator } from "../components/SplitSeparator";
import ControlsPane from "../components/ControlsPane";
import PlotsPane from "../components/PlotsPane";
import DataPane from "../components/DataPane";

export const Layout: React.FC = () => {
  const controlsRef = usePanelRef();
  const plotsRef = usePanelRef();
  const dataRef = usePanelRef();

  const [controlsCollapsed, setControlsCollapsed] = useState(false);
  const [plotsCollapsed, setPlotsCollapsed] = useState(false);
  const [dataCollapsed, setDataCollapsed] = useState(false);

  const [plotsMaximized, setPlotsMaximized] = useState(false);
  const [dataMaximized, setDataMaximized] = useState(false);

  const toggleControls = () => {
    const panel = controlsRef.current;
    if (!panel) return;
    if (panel.isCollapsed()) {
      panel.expand();
      setControlsCollapsed(false);
    } else {
      panel.collapse();
      setControlsCollapsed(true);
    }
  };

  const togglePlots = () => {
    const panel = plotsRef.current;
    if (!panel) return;
    if (panel.isCollapsed()) {
      panel.expand();
      setPlotsCollapsed(false);
    } else {
      panel.collapse();
      setPlotsCollapsed(true);
    }
  };

  const toggleData = () => {
    const panel = dataRef.current;
    if (!panel) return;
    if (panel.isCollapsed()) {
      panel.expand();
      setDataCollapsed(false);
    } else {
      panel.collapse();
      setDataCollapsed(true);
    }
  };

  const togglePlotsMaximize = () => {
    const plots = plotsRef.current;
    const data = dataRef.current;
    if (!plots || !data) return;

    if (plotsMaximized) {
      data.expand();
      setPlotsMaximized(false);
      setDataCollapsed(false);
    } else {
      data.collapse();
      plots.expand();
      setPlotsMaximized(true);
      setDataMaximized(false);
      setDataCollapsed(true);
      setPlotsCollapsed(false);
    }
  };

  const toggleDataMaximize = () => {
    const plots = plotsRef.current;
    const data = dataRef.current;
    if (!plots || !data) return;

    if (dataMaximized) {
      plots.expand();
      setDataMaximized(false);
      setPlotsCollapsed(false);
    } else {
      plots.collapse();
      data.expand();
      setDataMaximized(true);
      setPlotsMaximized(false);
      setPlotsCollapsed(true);
      setDataCollapsed(false);
    }
  };

  return (
    <div className="w-screen h-screen overflow-hidden bg-[#1a1a1a] text-[#eff1f6] flex flex-col select-none p-0">
      <Group orientation="horizontal" className="h-full w-full">
        <Panel
          id="controls-panel"
          panelRef={controlsRef}
          defaultSize="25%"
          minSize="15%"
          maxSize="40%"
          collapsible
          collapsedSize="36px"
          onResize={() => {
            const collapsed = controlsRef.current?.isCollapsed();
            if (collapsed !== undefined && collapsed !== controlsCollapsed) {
              setControlsCollapsed(collapsed);
            }
          }}
          className="flex flex-col bg-[#262626] border-r border-[#333333] overflow-hidden"
          style={{ overflow: "hidden" }}
        >
          <PanelHeader
            title="Controls"
            icon={<Sliders className="w-3.5 h-3.5" />}
            collapsed={controlsCollapsed}
            position="left"
            onToggleCollapse={toggleControls}
          />
          {!controlsCollapsed && (
            <div className="flex-1 min-h-0 overflow-auto">
              <ControlsPane />
            </div>
          )}
        </Panel>

        <SplitSeparator direction="vertical" />

        <Panel id="workspace-panel" defaultSize="75%" style={{ overflow: "hidden" }}>
          <Group orientation="vertical" className="h-full w-full">
            <Panel
              id="plots-panel"
              panelRef={plotsRef}
              defaultSize="55%"
              minSize="15%"
              collapsible
              collapsedSize="36px"
              onResize={() => {
                const collapsed = plotsRef.current?.isCollapsed();
                if (collapsed !== undefined && collapsed !== plotsCollapsed) {
                  setPlotsCollapsed(collapsed);
                }
              }}
              className="flex flex-col bg-[#262626] border-b border-[#333333] overflow-hidden"
              style={{ overflow: "hidden" }}
            >
              <PanelHeader
                title="Plots"
                icon={<LineChart className="w-3.5 h-3.5" />}
                collapsed={plotsCollapsed}
                position="top"
                onToggleCollapse={togglePlots}
                onToggleMaximize={togglePlotsMaximize}
                maximized={plotsMaximized}
              />
              {!plotsCollapsed && (
                <div className="flex-1 min-h-0 overflow-auto">
                  <PlotsPane />
                </div>
              )}
            </Panel>

            <SplitSeparator direction="horizontal" />

            <Panel
              id="data-panel"
              panelRef={dataRef}
              defaultSize="45%"
              minSize="15%"
              collapsible
              collapsedSize="36px"
              onResize={() => {
                const collapsed = dataRef.current?.isCollapsed();
                if (collapsed !== undefined && collapsed !== dataCollapsed) {
                  setDataCollapsed(collapsed);
                }
              }}
              className="flex flex-col bg-[#262626] overflow-hidden"
              style={{ overflow: "hidden" }}
            >
              <PanelHeader
                title="Data"
                icon={<TableIcon className="w-3.5 h-3.5" />}
                collapsed={dataCollapsed}
                position="bottom"
                onToggleCollapse={toggleData}
                onToggleMaximize={toggleDataMaximize}
                maximized={dataMaximized}
              />
              {!dataCollapsed && (
                <div className="flex-1 min-h-0 overflow-auto">
                  <DataPane />
                </div>
              )}
            </Panel>
          </Group>
        </Panel>
      </Group>
    </div>
  );
};
