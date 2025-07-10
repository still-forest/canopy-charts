import { Line } from "@visx/shape";
import React from "react";

import chartStyle from "@/charts/styles";
import color from "@/color";

interface CrosshairProps {
  left: number;
  top: number;
  xOffset?: number;
  yOffset?: number;
  width: number;
  height: number;
  strokeColor?: string;
  pointColor?: string;
}

export const Crosshair = React.memo(function Crosshair({
  left,
  top,
  xOffset = 0,
  yOffset = 0,
  width,
  height,
  strokeColor = color.gray["800"],
  pointColor = chartStyle.colors.primary,
}: CrosshairProps) {
  return (
    <g>
      <Line
        from={{ x: left, y: yOffset }}
        pointerEvents="none"
        stroke={strokeColor}
        strokeDasharray="5,3"
        strokeOpacity={0.7}
        strokeWidth={1}
        to={{ x: left, y: height }}
      />
      <Line
        from={{ x: xOffset, y: top }}
        pointerEvents="none"
        stroke={strokeColor}
        strokeDasharray="5,3"
        strokeOpacity={0.7}
        strokeWidth={1}
        to={{ x: width, y: top }}
      />
      <circle cx={left} cy={top} fill={pointColor} pointerEvents="none" r={6} stroke="white" strokeWidth={2} />
    </g>
  );
});
