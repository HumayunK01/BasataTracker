import { lazy } from "react";

// Centralized route chunks so navigation can prefetch on hover/focus intent.
const importers = {
  "/": () => import("@/pages/Console.tsx"),
  "/log": () => import("@/pages/DailyLog.tsx"),
  "/settings": () => import("@/pages/Settings.tsx"),
  "/report": () => import("@/pages/Report.tsx"),
  "/counter": () => import("@/pages/Counter.tsx"),
  "/tracker": () => import("@/pages/FaxTracker.tsx"),
  "/fax-tracker": () => import("@/pages/FaxTracker.tsx"),
  "*": () => import("@/pages/NotFound.tsx"),
} as const;

export const ConsolePage = lazy(importers["/"]);
export const DailyLogPage = lazy(importers["/log"]);
export const SettingsPage = lazy(importers["/settings"]);
export const ReportPage = lazy(importers["/report"]);
export const CounterPage = lazy(importers["/counter"]);
export const FaxTrackerPage = lazy(importers["/tracker"]);
export const NotFound = lazy(importers["*"]);

export function prefetchRoute(path: string) {
  // ponytail: thunk returns a cached promise, so repeated hovers are no-ops
  const fn = (importers as Record<string, (() => Promise<unknown>) | undefined>)[path];
  if (fn) void fn();
}
