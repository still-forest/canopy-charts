import { Separator, Text } from "@still-forest/canopy";
import { getProperDateFromDate } from "@still-forest/proper-date.js";
import { AxisBottom, AxisLeft, type AxisScale } from "@visx/axis";
import { curveMonotoneX } from "@visx/curve";
import { localPoint } from "@visx/event";
import { LinearGradient } from "@visx/gradient";
import { GridColumns, GridRows } from "@visx/grid";
import { useParentSize } from "@visx/responsive";
import { scaleLinear, scaleTime } from "@visx/scale";
import { AreaStack, LinePath } from "@visx/shape";
import { useTooltip, useTooltipInPortal } from "@visx/tooltip";
import { bisector, extent, max, min } from "@visx/vendor/d3-array";
import type { NumberValue } from "@visx/vendor/d3-scale";
import { useId, useMemo, useRef } from "react";
import { Crosshair } from "@/charts/components/Crosshair";
import chartStyle, { defaultTooltipStyles } from "@/charts/styles";
import { displayUsd, getTickValues, scaleUpNeatly } from "@/charts/utilities";
import type { VisxAreaStack, VisxAreaStackData, VisxAreaStackDataPoint } from "@/charts/visx-types";
import color from "@/color";
import type { DataPoint, TooltipData } from "./types";

export type StackedAreaChartProps = {
  margin?: { top: number; right: number; bottom: number; left: number };
  data: DataPoint[];
};

export const StackedAreaChart = ({
  margin = { top: 10, right: 10, bottom: 0, left: 0 },
  data,
}: StackedAreaChartProps) => {
  const { parentRef, width, height } = useParentSize({ debounceTime: 150 });
  const {
    tooltipOpen,
    tooltipLeft = 0,
    tooltipTop = 0,
    tooltipData,
    hideTooltip,
    showTooltip,
  } = useTooltip<TooltipData>();
  const tooltipTimeout = useRef<number>(0);

  const { containerRef, TooltipInPortal } = useTooltipInPortal({
    scroll: true,
  });

  // constants
  const xAxisHeight = 30;
  const xAxisTop = Math.max(height - xAxisHeight, 0);
  const xAxisTicks = 6;
  const yAxisWidth = 60;
  const yAxisTicks = 5;

  // accessors
  const getX: (d: DataPoint) => number = (d) => d.x.getTime();
  const getTotalY: (d: DataPoint) => number = (d) => d.yTotal;
  const getStackX: (d: VisxAreaStackDataPoint) => number = (d) => getX(d.data as unknown as DataPoint);
  const getStackY0 = (d: VisxAreaStackDataPoint) => d[0];
  const getStackY1 = (d: VisxAreaStackDataPoint) => d[1];
  const getKeys: (d: DataPoint) => string[] = (d) => d.ySeries.map((s) => s.key);

  const getTooltipData = (stack: VisxAreaStack): TooltipData => {
    const { index, key } = stack;
    const dataPoint = data[index];
    const serie = dataPoint.ySeries.find((s) => s.key === key);
    const label = serie ? serie.label : "";
    const value = serie ? serie.y : 0;

    return {
      date: getProperDateFromDate(dataPoint.x),
      total: dataPoint.yTotal,
      label,
      value,
    };
  };

  // bounds
  const maxWidth = Math.max(width - margin.left - margin.right, 0);
  const maxHeight = Math.max(height - margin.top - margin.bottom, 0);

  // range
  const xRange = useMemo(() => [yAxisWidth, maxWidth], [maxWidth]);
  const yRange = useMemo(() => [maxHeight - xAxisHeight + margin.top, margin.top], [maxHeight, margin]);

  // domain
  const yMin = scaleUpNeatly(min(data, getTotalY) || 0);
  const yMax = scaleUpNeatly(max(data, getTotalY) || 0);
  const xDomain: [number, number] = extent(data, getX) as [number, number];
  const yDomain: [number, number] = useMemo(
    () => [Math.min(0, yMin), Math.max(0, yMax)] as [number, number],
    [yMin, yMax],
  );

  // scales
  const xScale: AxisScale<number> = useMemo(
    () =>
      scaleTime<number>({
        range: xRange,
        domain: xDomain,
      }),
    [xRange, xDomain],
  );
  const yScale: AxisScale<number> = useMemo(
    () =>
      scaleLinear({
        range: yRange,
        domain: yDomain,
        nice: true,
      }),
    [yRange, yDomain],
  );

  // data transformation
  const getAreaStackData = (d: DataPoint): VisxAreaStackData => {
    const ySeries = d.ySeries.reduce((acc: { [key: string]: number }, serie) => {
      acc[serie.key] = serie.y;
      return acc;
    }, {});

    return {
      x: d.x,
      ...ySeries,
    };
  };

  // formatting
  const tickFormat = (v: NumberValue) => {
    const value = Number(v);

    if (value >= 1_000_000) {
      return `${displayUsd(value / 1_000_000, true)}mm`;
    }
    if (value >= 10_000) {
      return `${displayUsd(value / 1_000, true)}k`;
    }

    return `${displayUsd(value, true)}`;
  };

  // event handlers
  const bisectDate = bisector<DataPoint, Date>((d) => d.x).left; // TODO: move this or something
  const onMouseMove = (event: React.PointerEvent<SVGRectElement>, stack: VisxAreaStack) => {
    if (tooltipTimeout.current) clearTimeout(tooltipTimeout.current);
    const { x } = localPoint(event) || { x: 0, y: 0 }; // relative to SVG
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
      tooltipData: getTooltipData({ key: stack.key, index }),
      tooltipTop: yScale(d.yTotal),
      tooltipLeft: left,
    });
  };

  const gridColor = color.gray["400"];
  const axesColor = color.gray["600"];

  const gradientId = useId();

  return (
    <div ref={parentRef} style={{ width: "100%", height: "100%" }}>
      <svg
        aria-label="Stacked area chart showing data trends over time"
        height={height}
        ref={containerRef}
        role="img"
        width={width}
      >
        <GridRows
          left={xRange[0]}
          numTicks={yAxisTicks}
          scale={yScale}
          stroke={gridColor}
          strokeDasharray="1,2"
          top={0}
          width={xRange[1] - yAxisWidth}
        />
        <GridColumns
          height={yRange[0] - margin.top - 1}
          numTicks={xAxisTicks}
          scale={xScale}
          stroke={gridColor}
          strokeDasharray="1,2"
          top={yRange[1]}
        />
        <LinearGradient
          from={chartStyle.colors.primaryMediumDark}
          id={gradientId}
          to={chartStyle.colors.primaryMediumLight}
          toOpacity={0.5}
        />
        <LinePath
          curve={curveMonotoneX}
          data={data}
          stroke={chartStyle.colors.primaryDark}
          strokeWidth={2}
          x={(d) => xScale(getX(d)) ?? 0}
          y={(d) => yScale(getTotalY(d)) ?? 0}
        />
        <AreaStack
          curve={curveMonotoneX}
          data={data.map(getAreaStackData)}
          keys={data.length ? getKeys(data[0]) : []}
          offset="diverging"
          x={(d: VisxAreaStackDataPoint) => xScale(getStackX(d)) ?? 0}
          y0={(d: VisxAreaStackDataPoint) => yScale(getStackY0(d)) ?? 0}
          y1={(d: VisxAreaStackDataPoint) => yScale(getStackY1(d)) ?? 0}
        >
          {({ stacks, path }) =>
            stacks.map((stack) => (
              <path
                d={path(stack) || ""}
                fill={`url(#${gradientId})`}
                key={`stack-${stack.key}`}
                onMouseLeave={() => {
                  tooltipTimeout.current = window.setTimeout(() => {
                    hideTooltip();
                  }, 300);
                }}
                onMouseMove={(event: React.PointerEvent<SVGRectElement>) =>
                  onMouseMove(event, stack as unknown as VisxAreaStack)
                }
                stroke={chartStyle.colors.primaryDark}
                strokeWidth={0.5}
              />
            ))
          }
        </AreaStack>
        <AxisLeft
          left={yAxisWidth}
          numTicks={yAxisTicks}
          scale={yScale}
          stroke={axesColor}
          tickFormat={tickFormat}
          tickLabelProps={{
            fill: axesColor,
            fontSize: 12,
          }}
          tickStroke={axesColor}
          tickValues={getTickValues(yDomain, yAxisTicks)}
        />
        <AxisBottom
          numTicks={xAxisTicks}
          scale={xScale}
          stroke={axesColor}
          tickLabelProps={{
            fill: axesColor,
            fontSize: 12,
            textAnchor: "middle",
          }}
          tickStroke={axesColor}
          top={xAxisTop}
        />
        {tooltipData && (
          <Crosshair
            height={yRange[0]}
            left={tooltipLeft || 0}
            top={tooltipTop}
            width={maxWidth}
            xOffset={xRange[0]}
            yOffset={margin.top}
          />
        )}
      </svg>
      {tooltipOpen && tooltipData && (
        <>
          <TooltipInPortal
            className="bg-card/90"
            left={tooltipLeft}
            style={{
              ...defaultTooltipStyles,
              minWidth: 72,
            }}
            top={tooltipTop - 60}
          >
            <Text weight="semibold">{tooltipData.label}</Text>
            <Text family="sans" numeric>
              {displayUsd(tooltipData.value)}
            </Text>
          </TooltipInPortal>

          <TooltipInPortal className="bg-card/90" left={tooltipLeft} style={defaultTooltipStyles} top={height - 35}>
            <Text weight="semibold">{tooltipData.date.formatted}</Text>
            <Separator className="my-1" />
            <span className="font-display">
              Total:{" "}
              <Text as="span" family="sans" numeric>
                {displayUsd(tooltipData.total)}
              </Text>
            </span>
          </TooltipInPortal>
        </>
      )}
    </div>
  );
};
