/**
 * Everything `<lw-insights-dashboard>` needs to talk to the search-analytics
 * API and turn a response into widget props: config, DTOs, fetchers, the
 * sample dataset, and the mapper.
 *
 * Deliberately self-contained -- it imports only the inner elements' own prop
 * types, so the dashboard element depends on nothing outside `lit-elements/`.
 * That means it does *not* share code with `src/insightsData.ts` (which backs
 * the React `InsightsPage`); the two are independent implementations of the
 * same contract and have to be kept in step by hand if the backend changes.
 */
import type { LwBreakdownSegment } from "./LwBreakdownBar";
import type { LwGaugeTrendDirection } from "./LwGaugeCard";
import type { LwMetricTrendDirection } from "./LwMetricCard";
import type { LwRankedItem } from "./LwRankedList";
import type { LwSourceFooter, LwSourceItem } from "./LwSourceList";
import type { LwStatRankedItem } from "./LwStatRankedList";
import type { LwTrendPoint } from "./LwTrendChart";

// -----------------------------------------------------------------------------
// Config
// -----------------------------------------------------------------------------

/** Empty = same-origin, which is what you want when calling through a proxy. */
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "";

/**
 * Read from `.env.local` (gitignored) as `VITE_SEARCH_ANALYTICS_API_KEY`.
 *
 * Note this lands in the browser bundle -- Vite inlines `VITE_*` at build
 * time -- so a private-admin key here is readable by any visitor. Fine against
 * a local proxy; a real deployment should keep the key server-side and have
 * the frontend call an endpoint of its own.
 */
const API_KEY = import.meta.env.VITE_SEARCH_ANALYTICS_API_KEY ?? "";

// -----------------------------------------------------------------------------
// Wire types -- mirror the backend response verbatim (camelCase, nullables
// kept nullable) so a type error surfaces if the shape drifts.
// -----------------------------------------------------------------------------

export type SearchAnalyticsRange = "24h" | "7d" | "30d" | "90d";

export interface SearchStatsDto {
  totalSearches: number;
  successfulSearches: number;
  zeroResultSearches: number;
  errorSearches: number;
  botSearches: number;
  abandonedSearches: number;
  keywordModeCount: number;
  semanticModeCount: number;
  hybridModeCount: number;
  filterTierPrimaryCount: number;
  filterTierFallbackCount: number;
  filterTierNoneCount: number;
  overviewEnabledCount: number;
  aiOverviewSuccessCount: number;
  unblockedSearchCount: number;
  unblockedCheckSampleCount: number;
  aiUnblockedQualifyingCount: number;
  sumRankingScoreTop: number;
  rankingScoreSampleCount: number;
  sumOverviewTimeMs: number;
  overviewTimeSampleCount: number;
  sumSearchTimeMs: number;
  searchTimeSampleCount: number;
  sumResponseTimeMs: number | null;
  minResponseTimeMs: number | null;
  maxResponseTimeMs: number | null;
}

export interface QueryStatsDto {
  normalizedQuery: string;
  sampleOriginalQuery: string;
  searchCount: number;
  zeroResultCount: number;
  sumRankingScoreTop: number;
  rankingScoreSampleCount: number;
  /** ISO UTC timestamp. */
  lastSearchedAt: string;
}

export interface LlmContextDocStatDto {
  externalId: string;
  llmContextCount: number;
  /** May be "" -- fall back to `externalId` for display in that case. */
  title: string;
  /** true = document no longer exists; still show the row, flagged. */
  isDeleted: boolean;
}

/** Response of `GET /api/v1/search-analytics/{indexLogicalName}/daily`. */
export interface SearchAnalyticsDailyDto {
  startDate: string;
  endDate: string;
  timeZone: string;
  /** null if there was no traffic in the whole range. */
  searchStats: SearchStatsDto | null;
  /** Top 20, already sorted searchCount desc. */
  topQueriesBySearchCount: QueryStatsDto[];
  /** Top 20, already sorted zeroResultCount desc, only where zeroResultCount > 0. */
  topZeroResultQueries: QueryStatsDto[];
  /** Total distinct queries -- NOT `topQueriesBySearchCount.length` (capped at 20). */
  distinctQueryCount: number;
  /** Already sorted llmContextCount desc, not paginated. */
  llmContextDocStats: LlmContextDocStatDto[];
}

export interface HourlyTrafficDto {
  /** 0-23, client-local. */
  hour: number;
  searchCount: number;
}

/** Response of `GET /api/v1/search-analytics/{indexLogicalName}/daily-raw`. */
export interface SearchAnalyticsDailyRawDto {
  startDate: string;
  endDate: string;
  timeZone: string;
  totalSearches: number;
  /** Always exactly 24 entries (0-23, client-local), zero-filled. */
  hourlyTraffic: HourlyTrafficDto[];
}

// -----------------------------------------------------------------------------
// Fetching
// -----------------------------------------------------------------------------

const request = async <T>(url: string, signal?: AbortSignal): Promise<T> => {
  const response = await fetch(url, { headers: { "X-API-Key": API_KEY }, signal });
  if (!response.ok) {
    throw new Error(`GET ${url} failed: ${response.status} ${response.statusText}`);
  }
  return (await response.json()) as T;
};

/** Cheap, pre-aggregated -- safe to call on every load / range change. */
export const fetchSearchAnalyticsDaily = (
  indexLogicalName: string,
  range: SearchAnalyticsRange,
  signal?: AbortSignal,
): Promise<SearchAnalyticsDailyDto> =>
  request<SearchAnalyticsDailyDto>(
    `${API_BASE_URL}/api/v1/search-analytics/${encodeURIComponent(indexLogicalName)}/daily?range=${range}`,
    signal,
  );

/** Live scan, not a cheap table read -- only needed for the hour-of-day chart. */
export const fetchSearchAnalyticsDailyRaw = (
  indexLogicalName: string,
  range: SearchAnalyticsRange,
  signal?: AbortSignal,
): Promise<SearchAnalyticsDailyRawDto> =>
  request<SearchAnalyticsDailyRawDto>(
    `${API_BASE_URL}/api/v1/search-analytics/${encodeURIComponent(indexLogicalName)}/daily-raw?range=${range}`,
    signal,
  );

/** Picker labels -> API `range` values. `"Custom"` has no API equivalent. */
export const RANGE_LABEL_TO_API_PARAM: Partial<Record<string, SearchAnalyticsRange>> =
  {
    "24 Hours": "24h",
    "7 Days": "7d",
    "30 Days": "30d",
    "90 Days": "90d",
  };

// -----------------------------------------------------------------------------
// Widget data
// -----------------------------------------------------------------------------

/**
 * Everything the dashboard renders, keyed by the same widget ids the grid
 * layout uses. Content only -- a widget's grid geometry lives with the layout
 * in the element, since that's hand-tuned per breakpoint and isn't something
 * a backend would supply.
 */
export interface InsightsData {
  page: { title: string; subtitle: string };
  /** Range-picker options, and which starts selected. */
  range: { options: string[]; initial: string };
  sections: {
    traffic: { title: string; subtitle: string };
    engagement: { title: string; subtitle: string };
  };
  widgets: {
    "total-searches": MetricWidget;
    "unique-searches": MetricWidget;
    "peak-usage": TrendWidget;
    "most-searched-queries": RankedWidget;
    "most-used-sources": SourceWidget;
    "searches-unblocked": GaugeWidget;
    "response-performance": ResponseWidget;
    "result-quality": BreakdownWidget;
    "zero-result-searches": StatRankedWidget;
  };
}

export interface MetricWidget {
  icon?: string;
  label: string;
  value: string;
  trendDirection?: LwMetricTrendDirection;
  trendPercent?: string;
  comparison?: string;
}
export interface TrendWidget {
  title: string;
  subtitle?: string;
  yAxisLabel?: string;
  data: LwTrendPoint[];
}
export interface RankedWidget {
  title: string;
  subtitle?: string;
  items: LwRankedItem[];
}
export interface SourceWidget {
  title: string;
  subtitle?: string;
  items: LwSourceItem[];
  footer?: LwSourceFooter;
}
export interface GaugeWidget {
  title: string;
  subtitle?: string;
  value: number;
  trendDirection?: LwGaugeTrendDirection;
  trendPercent?: string;
  comparisonLabel?: string;
}
export interface ResponseWidget {
  title?: string;
  subtitle?: string;
  responseTime?: number;
  maxResponseTime?: number;
  fastestResponse?: number;
  slowestResponse?: number;
  abandonmentRate?: number;
  abandonmentLabel?: string;
  abandonmentDescription?: string;
  severity?: string;
}
export interface BreakdownWidget {
  title: string;
  subtitle?: string;
  countUnit?: string;
  segments: LwBreakdownSegment[];
}
export interface StatRankedWidget {
  title: string;
  subtitle?: string;
  value: number;
  valueDescription?: string;
  badgePercent?: number;
  badgeLabel?: string;
  listTitle?: string;
  listLinkLabel?: string;
  items: LwStatRankedItem[];
}

export type InsightsWidgetId = keyof InsightsData["widgets"];

// -----------------------------------------------------------------------------
// Sample dataset
// -----------------------------------------------------------------------------

/** Daily points, oscillating like a weekly usage cycle. */
const generateTrend = (
  startMonth: number,
  startDay: number,
  days: number,
  base: number,
  amplitude: number,
  spikeAt?: number,
  spikeMultiplier = 1.6,
): LwTrendPoint[] => {
  const start = new Date(2026, startMonth, startDay);
  return Array.from({ length: days }, (_, i) => {
    const date = new Date(start);
    date.setDate(start.getDate() + i);
    const label = date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
    const wave = Math.sin((i / 5.5) * Math.PI) * amplitude;
    const spike = i === spikeAt ? amplitude * spikeMultiplier : 0;
    return { label, value: Math.max(300, Math.round(base + wave + spike)) };
  });
};

/**
 * What the dashboard shows before (or instead of) an API response: with no
 * `index-logical-name` set, this is the whole picture.
 */
export const defaultInsightsData: InsightsData = {
  page: {
    title: "DiscoverAI Insights",
    subtitle:
      "Understand what your visitors are searching for, what they engage with, and what's missing.",
  },
  range: {
    options: ["24 Hours", "7 Days", "30 Days", "90 Days", "Custom"],
    initial: "30 Days",
  },
  sections: {
    traffic: { title: "Traffic", subtitle: "What are users searching for?" },
    engagement: {
      title: "Engagement",
      subtitle: "Is DiscoverAI Search meaningfully helping users?",
    },
  },
  widgets: {
    "total-searches": {
      icon: "search",
      label: "Total Searches",
      value: "48,392",
      trendDirection: "up",
      trendPercent: "18.4%",
      comparison: "vs 40,872 previous 30 days",
    },
    "unique-searches": {
      icon: "list-search",
      label: "Unique Searches",
      value: "12,847",
      trendDirection: "up",
      trendPercent: "18.4%",
      comparison: "Different queries asked by visitors",
    },
    "peak-usage": {
      title: "Peak Usage",
      subtitle: "When visitors search most",
      yAxisLabel: "Searches",
      // Tuned so the chart's computed peak/average land on 9,450 / 6,863.
      data: generateTrend(6, 20, 27, 6663, 1300, 3, 1.1538),
    },
    "most-searched-queries": {
      title: "Most Searched Queries",
      subtitle: "See what your visitors are searching for most frequently",
      items: [
        { label: "how to reset my password", value: 3410 },
        { label: "pricing and billing", value: 2988 },
        { label: "api rate limits", value: 2145 },
        { label: "cancel subscription", value: 1806 },
        { label: "installation guide", value: 1502 },
        { label: "data retention policy", value: 1189 },
        { label: "data retention policy", value: 1189 },
      ],
    },
    "most-used-sources": {
      title: "Most Used Sources",
      subtitle: "Most frequently referenced content to answer visitor questions",
      items: [
        { label: "Getting Started Guide", value: "2,341" },
        { label: "Pricing & Plans", value: "1,872" },
        { label: "Integration Overview", value: "1,540" },
        { label: "Troubleshooting FAQ", value: "1,203" },
        { label: "API Reference", value: "965" },
      ],
      footer: {
        value: 40,
        valueLabel: "Out of 118",
        label: "Content Coverage",
        description: "Different sources used today",
      },
    },
    "searches-unblocked": {
      title: "Searches Unblocked",
      subtitle: "Would have been missed by keyword search",
      value: 87,
      trendDirection: "up",
      trendPercent: "4%",
    },
    // Every field optional; an empty object keeps the element's own defaults.
    "response-performance": {},
    "result-quality": {
      title: "Result Quality",
      subtitle: "Quality of content used in AI overviews",
      countUnit: "searches",
      segments: [
        { label: "Strong Matches", count: 27662, description: "AI found a confident answer" },
        {
          label: "Broader Matches",
          count: 9221,
          description: "No strong match, broader results shown",
        },
        { label: "No Results", count: 1537, description: "No relevant result was found" },
      ],
    },
    "zero-result-searches": {
      title: "Zero Result Searches",
      subtitle: "Identify searches that returned no results",
      value: 1248,
      valueDescription: "Count of searches with no results found",
      badgePercent: 8.4,
      badgeLabel: "of all searches",
      listTitle: "Top Zero-Result Queries",
      listLinkLabel: "View all",
      items: [
        { label: "best running shoes", value: 42 },
        { label: "summer collection", value: 31 },
        { label: "waterproof jacket", value: 27 },
        { label: "kids trail sneakers", value: 19 },
      ],
    },
  },
};

// -----------------------------------------------------------------------------
// Mapping API response -> widgets
// -----------------------------------------------------------------------------

/**
 * How many rows each list card shows, matching what its grid height fits --
 * the API returns more (top 20 for the query lists; `llmContextDocStats` isn't
 * paginated at all), so the surplus would sit behind an internal scrollbar.
 * Display-only: the server's ordering is used as-is, nothing is re-sorted.
 */
const MOST_SEARCHED_QUERIES_LIMIT = 7;
const MOST_USED_SOURCES_LIMIT = 5;
const ZERO_RESULT_QUERIES_LIMIT = 4;

const formatCount = (value: number): string => value.toLocaleString("en-US");

/** Percentage to one decimal place, guarding the empty-range divide-by-zero. */
const percentOf = (part: number, whole: number): number =>
  whole > 0 ? Math.round((part / whole) * 1000) / 10 : 0;

/** Milliseconds to seconds, 2dp -- the response card renders seconds. */
const msToSeconds = (ms: number | null): number =>
  ms == null ? 0 : Math.round((ms / 1000) * 100) / 100;

/** `0` -> `"12am"`, `9` -> `"9am"`, `12` -> `"12pm"`, `21` -> `"9pm"`. */
const formatHour = (hour: number): string =>
  `${hour % 12 === 0 ? 12 : hour % 12}${hour < 12 ? "am" : "pm"}`;

/** Presentation threshold -- the backend returns only the raw counts. */
const abandonmentSeverity = (rate: number): string =>
  rate < 10 ? "Low" : rate < 25 ? "Medium" : "High";

/**
 * Overlays an API response onto `baseWidgets`, returning what to render.
 *
 * Fields the contract can't supply are dropped rather than carried over from
 * the sample data:
 *
 * - **No trend/comparison.** Those describe a previous period, and the
 *   endpoint returns one window with `range` as a fixed enum, so there's no
 *   prior window to fetch. Keeping the base widget's values would leave an
 *   invented "up 18.4% vs 40,872 previous 30 days" beside a real total.
 * - **No "out of N" on the sources footer** -- that denominator is the index's
 *   total document count, which isn't in the response.
 *
 * Documented assumptions:
 * - `sumResponseTimeMs` is the only sum with no paired sample count, so the
 *   mean is taken over `totalSearches`.
 * - "Result Quality" uses the `filterTier*` counts; note `filterTierNoneCount`
 *   and `zeroResultSearches` are separate figures and need not agree.
 */
export const mapSearchAnalyticsToWidgets = (
  baseWidgets: InsightsData["widgets"],
  daily: SearchAnalyticsDailyDto | null,
  dailyRaw: SearchAnalyticsDailyRawDto | null = null,
): InsightsData["widgets"] => {
  if (!daily) return baseWidgets;

  const stats = daily.searchStats;
  const abandonment = stats
    ? percentOf(stats.abandonedSearches, stats.totalSearches)
    : 0;

  return {
    ...baseWidgets,

    "total-searches": stats
      ? {
          icon: baseWidgets["total-searches"].icon,
          label: baseWidgets["total-searches"].label,
          value: formatCount(stats.totalSearches),
        }
      : baseWidgets["total-searches"],

    "unique-searches": {
      icon: baseWidgets["unique-searches"].icon,
      label: baseWidgets["unique-searches"].label,
      // `distinctQueryCount`, not `topQueriesBySearchCount.length` -- that
      // array is capped at 20 by the backend.
      value: formatCount(daily.distinctQueryCount),
      comparison: baseWidgets["unique-searches"].comparison,
    },

    // Hour-of-day, not a date series: `/daily` carries no per-day breakdown,
    // so `/daily-raw`'s 24 zero-filled buckets are the only time-resolved data
    // available. Left on the base sample until that endpoint resolves.
    "peak-usage": dailyRaw
      ? {
          ...baseWidgets["peak-usage"],
          data: dailyRaw.hourlyTraffic.map((point) => ({
            label: formatHour(point.hour),
            value: point.searchCount,
          })),
        }
      : baseWidgets["peak-usage"],

    "most-searched-queries": {
      ...baseWidgets["most-searched-queries"],
      items: daily.topQueriesBySearchCount
        .slice(0, MOST_SEARCHED_QUERIES_LIMIT)
        .map((query) => ({
          label: query.normalizedQuery,
          value: query.searchCount,
        })),
    },

    "most-used-sources": {
      ...baseWidgets["most-used-sources"],
      items: daily.llmContextDocStats
        .slice(0, MOST_USED_SOURCES_LIMIT)
        .map((doc) => ({
          // `title` may be "" for a document that's since been removed.
          label: doc.isDeleted
            ? `${doc.title || doc.externalId} (deleted)`
            : doc.title || doc.externalId,
          value: formatCount(doc.llmContextCount),
        })),
      footer: {
        // The *full* count, not the trimmed list length -- this reports how
        // many distinct sources were used, which a display cap shouldn't change.
        value: daily.llmContextDocStats.length,
        valueLabel: "Sources used",
        label: baseWidgets["most-used-sources"].footer?.label ?? "Content Coverage",
        description:
          baseWidgets["most-used-sources"].footer?.description ??
          "Different sources used today",
      },
    },

    "searches-unblocked": stats
      ? {
          title: baseWidgets["searches-unblocked"].title,
          subtitle: baseWidgets["searches-unblocked"].subtitle,
          value: percentOf(stats.unblockedSearchCount, stats.unblockedCheckSampleCount),
        }
      : baseWidgets["searches-unblocked"],

    "response-performance": stats
      ? {
          ...baseWidgets["response-performance"],
          responseTime:
            stats.totalSearches > 0
              ? msToSeconds((stats.sumResponseTimeMs ?? 0) / stats.totalSearches)
              : 0,
          fastestResponse: msToSeconds(stats.minResponseTimeMs),
          slowestResponse: msToSeconds(stats.maxResponseTimeMs),
          abandonmentRate: abandonment,
          severity: abandonmentSeverity(abandonment),
        }
      : baseWidgets["response-performance"],

    "result-quality": stats
      ? {
          ...baseWidgets["result-quality"],
          segments: [
            {
              label: "Strong Matches",
              count: stats.filterTierPrimaryCount,
              description: "AI found a confident answer",
            },
            {
              label: "Broader Matches",
              count: stats.filterTierFallbackCount,
              description: "No strong match, broader results shown",
            },
            {
              label: "No Results",
              count: stats.filterTierNoneCount,
              description: "No relevant result was found",
            },
          ],
        }
      : baseWidgets["result-quality"],

    "zero-result-searches": {
      ...baseWidgets["zero-result-searches"],
      value: stats?.zeroResultSearches ?? 0,
      badgePercent: stats ? percentOf(stats.zeroResultSearches, stats.totalSearches) : 0,
      // Already filtered to `zeroResultCount > 0` and sorted desc server-side.
      items: daily.topZeroResultQueries
        .slice(0, ZERO_RESULT_QUERIES_LIMIT)
        .map((query) => ({
          label: query.normalizedQuery,
          value: query.zeroResultCount,
        })),
    },
  };
};
