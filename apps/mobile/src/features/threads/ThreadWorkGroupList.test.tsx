import { act, useImperativeHandle, useLayoutEffect, type ReactNode, type Ref } from "react";
import { createRoot } from "react-dom/client";
import type { LegendListRef } from "@legendapp/list/react-native";
import { expect, it, vi } from "vite-plus/test";
import type { ThreadWorkGroupScrollPosition } from "./thread-feed-scroll-position";
import { ThreadWorkGroupList } from "./ThreadWorkGroupList";

const harness = vi.hoisted(() => ({
  contentLength: 57,
  scroll: 0,
  remainingMeasurements: 0,
  listeners: new Set<() => void>(),
  reportContentSize: (_width: number, _height: number) => {},
  scrollList: () => {},
}));

vi.mock("react-native", () => ({
  View: ({ children, style }: { children?: ReactNode; style?: { height?: number } }) => (
    <div style={style}>{children}</div>
  ),
}));
vi.mock("react-native-svg", () => {
  const Passthrough = ({ children }: { children?: ReactNode }) => children;
  return {
    default: Passthrough,
    Defs: Passthrough,
    LinearGradient: Passthrough,
    Rect: () => null,
    Stop: () => null,
  };
});
vi.mock("react-native-reanimated", async () => {
  const { useState } = await import("react");
  return {
    default: { View: ({ children }: { children?: ReactNode }) => children },
    useAnimatedStyle: () => ({}),
    useSharedValue: (value: number) => useState(() => ({ value }))[0],
  };
});
vi.mock("../../lib/layout", () => ({ THREAD_WORK_ROW_MIN_HEIGHT: 28 }));
vi.mock("@legendapp/list/reanimated", () => ({
  AnimatedLegendList: (props: {
    ref: Ref<Pick<LegendListRef, "getState" | "anchorVisibleContent" | "clearCaches">>;
    style: { height: number };
    onScroll: () => void;
    onReady: () => void;
    onContentSizeChange?: (width: number, height: number) => void;
  }) => {
    harness.reportContentSize = (width, height) => props.onContentSizeChange?.(width, height);
    harness.scrollList = props.onScroll;
    useImperativeHandle(props.ref, () => ({
      getState: () =>
        ({
          contentLength: harness.contentLength,
          scroll: harness.scroll,
          listen: (_signal: string, notify: () => void) => {
            harness.listeners.add(notify);
            return () => {
              harness.listeners.delete(notify);
            };
          },
        }) as ReturnType<LegendListRef["getState"]>,
      anchorVisibleContent: () => ({ key: "second", offset: 12 }),
      clearCaches: () => {},
    }));
    // Fabric can report intermediate sizes on successive commits during a row transition.
    useLayoutEffect(() => {
      if (harness.remainingMeasurements > 0) {
        harness.remainingMeasurements--;
        harness.contentLength++;
        for (const notify of harness.listeners) notify();
      }
    });
    useLayoutEffect(props.onReady, []);
    return <div data-testid="list" style={props.style} />;
  },
}));

it("settles animated tool measurements without a synchronous render loop and keeps scroll restoration", async () => {
  (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
  harness.contentLength = 57;
  harness.scroll = 0;
  harness.remainingMeasurements = 64;
  harness.listeners.clear();
  const container = document.createElement("div");
  const root = createRoot(container);
  const scrollPositions = new Map<string, ThreadWorkGroupScrollPosition>();
  const rows = [{ id: "first" }, { id: "second" }];
  try {
    await act(async () =>
      root.render(
        <ThreadWorkGroupList
          activities={rows}
          edgeFadeColor="#fff"
          expandedRows={{ second: true }}
          groupId="tools"
          rowSizing={{ estimatedRowHeight: 28, fixedRowHeight: 28, textSizeKey: "14:1" }}
          scrollPositions={scrollPositions}
          renderRow={() => null}
        />,
      ),
    );
    expect(container.querySelector<HTMLElement>('[data-testid="list"]')?.style.height).toBe("57px");

    await act(async () => harness.reportContentSize(320, 190));
    expect(container.querySelector<HTMLElement>('[data-testid="list"]')?.style.height).toBe(
      "190px",
    );
    await act(async () => harness.reportContentSize(320, 900));
    expect(container.querySelector<HTMLElement>('[data-testid="list"]')?.style.height).toBe(
      "256px",
    );
    await act(async () => harness.reportContentSize(320, 57));
    expect(container.querySelector<HTMLElement>('[data-testid="list"]')?.style.height).toBe("57px");

    await act(async () => {
      harness.reportContentSize(320, Number.NaN);
      harness.reportContentSize(320, Number.POSITIVE_INFINITY);
      harness.reportContentSize(0, 0);
    });
    expect(container.querySelector<HTMLElement>('[data-testid="list"]')?.style.height).toBe("57px");

    harness.scroll = 120;
    await act(async () => harness.scrollList());
    expect(scrollPositions.get("tools")).toEqual({
      rowId: "second",
      offsetWithinRow: 12,
      scrollOffset: 120,
    });
  } finally {
    await act(async () => root.unmount());
    expect(harness.listeners.size).toBe(0);
  }
});
