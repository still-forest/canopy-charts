import { Flex, Separator, Text } from "@still-forest/canopy";
import type ProperDate from "@still-forest/proper-date.js";
import { AxisBottom, AxisLeft } from "@visx/axis";
import { curveMonotoneX } from "@visx/curve";
import { localPoint } from "@visx/event";
import { LinearGradient } from "@visx/gradient";
import { useParentSize } from "@visx/responsive";
import { scaleLinear, scaleTime } from "@visx/scale";
import { AreaClosed, LinePath } from "@visx/shape";
import { useTooltip, useTooltipInPortal } from "@visx/tooltip";
import { bisector, extent, max, min } from "@visx/vendor/d3-array";
import type React from "react";
import { useMemo } from "react";
import { Crosshair } from "@/charts/components/Crosshair";
import chartStyle, { defaultTooltipStyles } from "@/charts/styles";
import color from "@/color";

type TooltipData = {
  dataPoint: DataPoint;
  x: number;
  y: number;
};

type DataPoint = {
  date: ProperDate;
  value: number;
};

// accessors
const getX = (d: DataPoint): Date => d.date.toDate();
const getY = (d: DataPoint): number => d.value;
const bisectDate = bisector<DataPoint, Date>((d) => d.date.toDate()).left;

export type LineChartProps = {
  data: DataPoint[];
  label?: string;
  width?: number;
  height?: number;
  margin?: { top: number; right: number; bottom: number; left: number };
};

export const LineChart = ({ data, label, margin = { top: 10, right: 10, bottom: 10, left: 10 } }: LineChartProps) => {
  const { parentRef, width: totalWidth, height: totalHeight } = useParentSize({ debounceTime: 150 });
  const { tooltipOpen, tooltipLeft, tooltipTop = 0, tooltipData, hideTooltip, showTooltip } = useTooltip<TooltipData>();

  // dimensions
  const xDimensions = useMemo(() => {
    const { left, right } = margin;
    const gap = 0;
    const yAxisWidth = 50;
    const chartWidth = totalWidth - left - gap - yAxisWidth - right;

    return {
      total: totalWidth,
      layout: {
        left,
        chartWidth,
        gap,
        yAxisWidth,
        right,
      },
      placement: {
        axisLeft: left + yAxisWidth,
        chartLeft: left + yAxisWidth + gap,
      },
    };
  }, [margin, totalWidth]);

  const yDimensions = useMemo(() => {
    const { top, bottom } = margin;
    const gap = 0;
    const xAxisHeight = 25;
    const chartHeight = totalHeight - top - xAxisHeight - gap - bottom;

    return {
      total: totalHeight,
      layout: {
        top,
        chartHeight,
        gap,
        xAxisHeight,
        bottom,
      },
      placement: {
        axisTop: top + chartHeight + gap,
        dateTooltipTop: top + chartHeight + gap,
      },
    };
  }, [totalHeight, margin]);

  const { containerRef, TooltipInPortal } = useTooltipInPortal({
    scroll: true,
  });

  // domain
  const xDomain: [Date, Date] = extent(data, getX) as [Date, Date];
  const yDomain: [number, number] = [(min(data, getY) as number) * 0.975, (max(data, getY) as number) * 1.025];

  // range
  const xRange = useMemo(
    () => [xDimensions.placement.chartLeft, xDimensions.layout.chartWidth + xDimensions.placement.chartLeft],
    [xDimensions],
  );
  const yRange = useMemo(
    () => [yDimensions.layout.chartHeight + yDimensions.layout.top, yDimensions.layout.top],
    [yDimensions],
  );

  // scales
  const xScale = scaleTime<number>({
    range: xRange,
    domain: xDomain,
  });
  const yScale = scaleLinear<number>({
    range: yRange,
    domain: yDomain,
  });

  // axes
  const numTicksForWidth = (width: number) => {
    if (width < 600) return 4;
    if (width < 800) return 6;
    return 8;
  };

  // events
  const onMouseMove = (event: React.MouseEvent<SVGRectElement>) => {
    const { x, y } = localPoint(event) || { x: 0, y: 0 };
    const x0 = xScale.invert(x);
    const index = bisectDate(data, x0, 1);
    const d0 = data[index - 1];
    const d1 = data[index];
    let d = d0;
    if (d1 && getX(d1)) {
      d = x0.valueOf() - getX(d0).valueOf() > getX(d1).valueOf() - x0.valueOf() ? d1 : d0;
    }
    const left = x;

    showTooltip({
      tooltipData: {
        dataPoint: d,
        x: x,
        y: y,
      },
      tooltipTop: yScale(d.value),
      tooltipLeft: left,
    });
  };

  const getXPlot = useMemo(() => (d: DataPoint) => xScale(getX(d)) || 0, [xScale]);
  const getYPlot = useMemo(() => (d: DataPoint) => yScale(getY(d)) || 0, [yScale]);

  // Empty data case
  if (!data || data.length === 0) {
    return (
      <Flex align="center" className="h-full w-full border" justify="center">
        <Text className="p-4 text-center">No data available</Text>
      </Flex>
    );
  }

  return (
    <div ref={parentRef} style={{ width: "100%", height: "100%", minHeight: 200 }}>
      <svg height={yDimensions.total} ref={containerRef} width={totalWidth}>
        <LinePath<DataPoint>
          data={data}
          shapeRendering="geometricPrecision"
          stroke={chartStyle.colors.primaryDark}
          strokeWidth={1.5}
          x={getXPlot}
          y={getYPlot}
        />
        <LinearGradient
          from={chartStyle.colors.primaryMediumDark}
          id="area-gradient"
          to={chartStyle.colors.primaryMediumLight}
          toOpacity={0.5}
        />
        <AreaClosed
          curve={curveMonotoneX}
          data={data}
          fill="url(#area-gradient)"
          onMouseLeave={() => {
            window.setTimeout(() => {
              hideTooltip();
            }, 300);
          }}
          onMouseMove={onMouseMove}
          stroke={chartStyle.colors.primary}
          strokeWidth={1}
          x={getXPlot}
          y={getYPlot}
          yScale={yScale}
        />
        {tooltipData && (
          <Crosshair
            height={yDimensions.total}
            left={tooltipLeft as number}
            pointColor={chartStyle.colors.primaryDark}
            top={tooltipTop}
            width={xDimensions.total}
          />
        )}
        <AxisLeft
          hideZero={true}
          left={xDimensions.placement.axisLeft}
          numTicks={5}
          scale={yScale}
          stroke={color.gray["600"]}
          tickLabelProps={{
            fill: color.gray["600"],
            fontSize: 12,
          }}
          tickStroke={color.gray["600"]}
        />
        <g style={{ height: yDimensions.layout.xAxisHeight }}>
          <AxisBottom
            numTicks={numTicksForWidth(totalWidth)}
            scale={xScale}
            stroke={color.gray["600"]}
            tickLabelProps={{
              fill: color.gray["600"],
              fontSize: 12,
              textAnchor: "middle",
            }}
            tickStroke={color.gray["600"]}
            top={yDimensions.placement.axisTop}
          />
        </g>
      </svg>
      {tooltipOpen && tooltipData && (
        <>
          <TooltipInPortal className="bg-card/90" left={tooltipLeft} style={defaultTooltipStyles} top={tooltipData.y}>
            {label ? (
              <>
                <Text weight="semibold">{label}</Text>
                <Separator className="my-1" />
              </>
            ) : null}
            <Text family="sans" numeric>
              {tooltipData.dataPoint.value.toFixed(4)}
            </Text>
          </TooltipInPortal>
          <TooltipInPortal
            className="bg-card/90"
            left={tooltipLeft}
            style={{
              ...defaultTooltipStyles,
              minWidth: 72,
            }}
            top={yDimensions.placement.dateTooltipTop}
          >
            <Text>{tooltipData.dataPoint.date.formatted}</Text>
          </TooltipInPortal>
        </>
      )}
    </div>
  );
};
