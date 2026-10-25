import React from "react";
import {
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  ChevronDown,
  Maximize2,
  Minimize2,
} from "lucide-react";

export type PanelPosition = "left" | "top" | "bottom";

interface PanelHeaderProps {
  title: string;
  icon: React.ReactNode;
  collapsed: boolean;
  position: PanelPosition;
  onToggleCollapse: () => void;
  onToggleMaximize?: () => void;
  maximized?: boolean;
}

const getCollapseIcon = (position: PanelPosition, collapsed: boolean) => {
  if (position === "left") {
    return collapsed ? (
      <ChevronRight className="w-4 h-4 shrink-0" />
    ) : (
      <ChevronLeft className="w-3.5 h-3.5 shrink-0" />
    );
  }
  if (position === "bottom") {
    return collapsed ? (
      <ChevronUp className="w-3.5 h-3.5 shrink-0" />
    ) : (
      <ChevronDown className="w-3.5 h-3.5 shrink-0" />
    );
  }
  return collapsed ? (
    <ChevronDown className="w-3.5 h-3.5 shrink-0" />
  ) : (
    <ChevronUp className="w-3.5 h-3.5 shrink-0" />
  );
};

const HeaderButton: React.FC<{
  onClick: (e: React.MouseEvent) => void;
  title: string;
  children: React.ReactNode;
}> = ({ onClick, title, children }) => {
  return (
    <button
      onClick={onClick}
      title={title}
      className="p-1 rounded text-[#9e9e9e] hover:text-[#eff1f6] hover:bg-[#333333] transition cursor-pointer shrink-0"
    >
      {children}
    </button>
  );
};

const VerticalPanelHeader: React.FC<{
  title: string;
  icon: React.ReactNode;
  position: PanelPosition;
  onToggleCollapse: () => void;
}> = ({ title, icon, position, onToggleCollapse }) => {
  return (
    <div
      onClick={onToggleCollapse}
      className="w-full h-full flex flex-col items-center py-2.5 gap-2.5 bg-[#262626] hover:bg-[#2e2e2e] cursor-pointer text-[#9e9e9e] hover:text-[#eff1f6] transition select-none overflow-hidden"
      title={`Expand ${title}`}
    >
      {getCollapseIcon(position, true)}
      <span className="shrink-0">{icon}</span>
      <span className="text-[11px] font-medium tracking-wider uppercase [writing-mode:vertical-rl] rotate-180 mt-1 shrink-0">
        {title}
      </span>
    </div>
  );
};

const HorizontalPanelHeader: React.FC<{
  title: string;
  icon: React.ReactNode;
  collapsed: boolean;
  position: PanelPosition;
  onToggleCollapse: () => void;
  onToggleMaximize?: () => void;
  maximized?: boolean;
}> = ({
  title,
  icon,
  collapsed,
  position,
  onToggleCollapse,
  onToggleMaximize,
  maximized,
}) => {
  return (
    <div
      onClick={collapsed ? onToggleCollapse : undefined}
      className={`h-9 w-full bg-[#262626] px-3 flex items-center justify-between text-xs shrink-0 select-none overflow-hidden ${
        collapsed
          ? "cursor-pointer hover:bg-[#2e2e2e]"
          : "border-b border-[#333333]"
      }`}
    >
      <div className="flex items-center gap-2 text-[#eff1f6] font-medium shrink-0">
        <span className="text-[#9e9e9e] shrink-0">{icon}</span>
        <span>{title}</span>
      </div>

      <div className="flex items-center gap-0.5 shrink-0">
        {onToggleMaximize && !collapsed && (
          <HeaderButton
            onClick={(e) => {
              e.stopPropagation();
              onToggleMaximize();
            }}
            title={maximized ? "Restore" : "Maximize"}
          >
            {maximized ? (
              <Minimize2 className="w-3.5 h-3.5" />
            ) : (
              <Maximize2 className="w-3.5 h-3.5" />
            )}
          </HeaderButton>
        )}
        <HeaderButton
          onClick={(e) => {
            e.stopPropagation();
            onToggleCollapse();
          }}
          title={collapsed ? `Expand ${title}` : `Collapse ${title}`}
        >
          {getCollapseIcon(position, collapsed)}
        </HeaderButton>
      </div>
    </div>
  );
};

export const PanelHeader: React.FC<PanelHeaderProps> = ({
  title,
  icon,
  collapsed,
  position,
  onToggleCollapse,
  onToggleMaximize,
  maximized,
}) => {
  if (collapsed && position === "left") {
    return (
      <VerticalPanelHeader
        title={title}
        icon={icon}
        position={position}
        onToggleCollapse={onToggleCollapse}
      />
    );
  }

  return (
    <HorizontalPanelHeader
      title={title}
      icon={icon}
      collapsed={collapsed}
      position={position}
      onToggleCollapse={onToggleCollapse}
      onToggleMaximize={onToggleMaximize}
      maximized={maximized}
    />
  );
};
