import type { LegendListRef } from "@legendapp/list/react-native";
import { AnimatedLegendList } from "@legendapp/list/reanimated";
import { useId, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { View } from "react-native";
import Svg, { Defs, LinearGradient, Rect, Stop } from "react-native-svg";
import Animated, { useAnimatedStyle, useSharedValue } from "react-native-reanimated";
import { THREAD_WORK_ROW_MIN_HEIGHT, type deriveThreadWorkLogSizing } from "../../lib/layout";
import {
  resolveThreadWorkGroupInitialScroll,
  type ThreadWorkGroupScrollPosition,
} from "./thread-feed-scroll-position";

const WORK_ROW_GAP = 1;
export const WORK_GROUP_MAX_HEIGHT = 256;
export const WORK_GROUP_EDGE_FADE_HEIGHT = 12;

export function workLogRowsHeight(
  activities: ReadonlyArray<unknown>,
  rowHeight = THREAD_WORK_ROW_MIN_HEIGHT,
): number {
  return activities.length * rowHeight + Math.max(0, activities.length - 1) * WORK_ROW_GAP;
}

const WORK_GROUP_MAINTAIN_SCROLL_AT_END = {
  animated: false,
  on: { dataAppend: true },
} as const;

export function ThreadWorkGroupList<Row extends { readonly id: string }>(props: {
  readonly activities: ReadonlyArray<Row>;
  readonly edgeFadeColor: string;
  readonly expandedRows: Readonly<Record<string, boolean>>;
  readonly groupId: string;
  readonly rowSizing: ReturnType<typeof deriveThreadWorkLogSizing>;
  readonly scrollPositions: Map<string, ThreadWorkGroupScrollPosition>;
  readonly renderRow: (row: Row) => ReactNode;
}) {
  const estimatedRowsHeight = workLogRowsHeight(
    props.activities,
    props.rowSizing.estimatedRowHeight,
  );
  const savedPosition = props.scrollPositions.get(props.groupId);
  const initialPosition = props.activities.some((row) => row.id === savedPosition?.rowId)
    ? savedPosition
    : undefined;
  const initialScrollIndex = resolveThreadWorkGroupInitialScroll(props.activities, initialPosition);
  const listRef = useRef<LegendListRef>(null);
  const previousTextSize = useRef(props.rowSizing.textSizeKey);
  // oxlint-disable-next-line t3code/no-unreasoned-state-sync -- clears the list's cached row sizes when the text size changes
  useLayoutEffect(() => {
    if (previousTextSize.current === props.rowSizing.textSizeKey) return;
    previousTextSize.current = props.rowSizing.textSizeKey;
    listRef.current?.clearCaches({ mode: "sizes" });
  }, [props.rowSizing.textSizeKey]);
  const loadedRef = useRef(false);
  const [contentHeight, setContentHeight] = useState(estimatedRowsHeight);
  const height = Math.min(contentHeight, WORK_GROUP_MAX_HEIGHT);
  const scrollOffset = useSharedValue(initialPosition?.scrollOffset ?? 0);
  const sharedValues = { scrollOffset };

  const topFadeStyle = useAnimatedStyle(() => ({
    opacity: Math.min(1, Math.max(0, scrollOffset.value) / WORK_GROUP_EDGE_FADE_HEIGHT),
  }));
  const bottomFadeStyle = useAnimatedStyle(() => ({
    opacity: Math.min(
      1,
      Math.max(0, contentHeight - height - scrollOffset.value) / WORK_GROUP_EDGE_FADE_HEIGHT,
    ),
  }));
  const rememberPosition = (scroll: number) => {
    if (!loadedRef.current) return;
    const position = listRef.current?.anchorVisibleContent({ hold: false });
    if (!position) return;
    props.scrollPositions.set(props.groupId, {
      rowId: position.key,
      offsetWithinRow: position.offset,
      scrollOffset: scroll,
    });
  };
  const handleMetricsChange = () => {
    const metrics = listRef.current?.getState();
    if (!metrics) return;
    rememberPosition(metrics.scroll);
  };
  const handleReady = () => {
    loadedRef.current = true;
    handleMetricsChange();
  };
  // Fabric's synchronous measurements can feed back into the list during the same commit.
  const handleContentSizeChange = (_width: number, measuredHeight: number) => {
    if (!Number.isFinite(measuredHeight) || measuredHeight <= 0) return;
    setContentHeight(measuredHeight);
    handleMetricsChange();
  };
  const getFixedItemSize = (row: Row, index: number) =>
    props.expandedRows[row.id] || props.rowSizing.fixedRowHeight === undefined
      ? undefined
      : props.rowSizing.fixedRowHeight + (index < props.activities.length - 1 ? WORK_ROW_GAP : 0);
  const renderItem = ({ item, index }: { item: Row; index: number }) => (
    <View className={index < props.activities.length - 1 ? "pb-px" : undefined}>
      {props.renderRow(item)}
    </View>
  );

  return (
    <View style={{ height, overflow: "hidden" }}>
      {/* oxlint-disable-next-line t3code/require-registered-list-scroll -- Nested in a fixed-height card inside the thread feed, which owns the header's scroll view. */}
      <AnimatedLegendList
        ref={listRef}
        data={props.activities}
        dataKey={props.groupId}
        keyExtractor={workLogRowKey}
        estimatedItemSize={props.rowSizing.estimatedRowHeight + WORK_ROW_GAP}
        getFixedItemSize={getFixedItemSize}
        initialScrollIndex={initialScrollIndex}
        recycleItems={false}
        extraData={props.renderRow}
        renderItem={renderItem}
        sharedValues={sharedValues}
        onReady={handleReady}
        onContentSizeChange={handleContentSizeChange}
        onScroll={handleMetricsChange}
        onLayout={handleMetricsChange}
        maintainScrollAtEnd={WORK_GROUP_MAINTAIN_SCROLL_AT_END}
        maintainScrollAtEndThreshold={1 / Math.max(1, height)}
        maintainVisibleContentPosition
        nestedScrollEnabled
        directionalLockEnabled
        showsVerticalScrollIndicator
        scrollsToTop={false}
        bounces={false}
        keyboardShouldPersistTaps="handled"
        style={{ height }}
      />
      <Animated.View
        pointerEvents="none"
        className="absolute inset-x-0 top-0"
        style={[{ height: WORK_GROUP_EDGE_FADE_HEIGHT }, topFadeStyle]}
      >
        <EdgeFade color={props.edgeFadeColor} direction="down" />
      </Animated.View>
      <Animated.View
        pointerEvents="none"
        className="absolute inset-x-0 bottom-0"
        style={[{ height: WORK_GROUP_EDGE_FADE_HEIGHT }, bottomFadeStyle]}
      >
        <EdgeFade color={props.edgeFadeColor} direction="up" />
      </Animated.View>
    </View>
  );
}

/** A screen-colored gradient painted over the list edge that still has content past it. */
export function EdgeFade(props: { readonly color: string; readonly direction: "up" | "down" }) {
  const gradientId = `work-group-fade-${useId().replaceAll(":", "")}`;
  return (
    <Svg width="100%" height="100%">
      <Defs>
        <LinearGradient id={gradientId} x1="0%" x2="0%" y1="0%" y2="100%">
          <Stop
            offset={0}
            stopColor={props.color}
            stopOpacity={props.direction === "down" ? 1 : 0}
          />
          <Stop
            offset={1}
            stopColor={props.color}
            stopOpacity={props.direction === "down" ? 0 : 1}
          />
        </LinearGradient>
      </Defs>
      <Rect width="100%" height="100%" fill={`url(#${gradientId})`} />
    </Svg>
  );
}

function workLogRowKey(row: { readonly id: string }): string {
  return row.id;
}
