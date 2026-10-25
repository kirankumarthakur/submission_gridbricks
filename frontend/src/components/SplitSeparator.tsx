import React from "react";
import { Separator } from "react-resizable-panels";

interface SplitSeparatorProps {
  direction?: "horizontal" | "vertical";
}

const HorizontalDivider: React.FC = () => {
  return (
    <Separator className="h-1.5 w-full bg-[#1a1a1a] hover:bg-[#222222] active:bg-[#2c2c2c] transition cursor-row-resize flex items-center justify-center shrink-0 border-y border-[#333333] group">
      <div className="h-0.5 w-8 rounded-full bg-[#4a4a4a] group-hover:bg-[#808080] transition" />
    </Separator>
  );
};

const VerticalDivider: React.FC = () => {
  return (
    <Separator className="w-1.5 h-full bg-[#1a1a1a] hover:bg-[#222222] active:bg-[#2c2c2c] transition cursor-col-resize flex items-center justify-center shrink-0 border-x border-[#333333] group">
      <div className="w-0.5 h-8 rounded-full bg-[#4a4a4a] group-hover:bg-[#808080] transition" />
    </Separator>
  );
};

export const SplitSeparator: React.FC<SplitSeparatorProps> = ({
  direction = "horizontal",
}) => {
  if (direction === "vertical") {
    return <VerticalDivider />;
  }
  return <HorizontalDivider />;
};
