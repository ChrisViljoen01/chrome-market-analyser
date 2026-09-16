"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  Activity,
  ArrowDownRight,
  BookOpenCheck,
  Box,
  CheckCircle2,
  ChevronRight,
  CircleAlert,
  Database,
  Download,
  ExternalLink,
  FileCheck2,
  Gauge,
  Info,
  RefreshCw,
  RotateCcw,
  Ship,
  SlidersHorizontal,
  TrendingDown,
} from "lucide-react";
import {
  CartesianGrid,
  ComposedChart,
  Line,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  FREIGHT_MARKET,
  LCB_PRICES,
  MARKET_EVENTS,
  PRICE_HISTORY,
  SOURCES,
} from "./market-data";

const FX = 16.2718;
const CURRENT_PRICE = 282.5;
type DashboardTab = "overview" | "prices" | "flows" | "forecast" | "sources";

type ForecastInputs = {
  inventoryWoW: number;
  freight: number;
  fx: number;
  exportGrowth: number;
  tenderChange: number;
};

const initialInputs: ForecastInputs = {
  inventoryWoW: 1.89,
  freight: 35.5,
  fx: 16.27,
  exportGrowth: 10.3,
  tenderChange: -100,
};

const metrics = [
  {
    label: "SA 40–42 CIF",
    value: "$282.50",
    delta: "−2.25%",
    detail: "SMM · 16 Sep",
    sentiment: "negative",
    source: "Observed",
  },
  {
    label: "China port stock",
    value: "5.318 Mt",
    delta: "+1.89%",
    detail: "98.6 kt WoW build",
    sentiment: "negative",
    source: "Observed",
  },
  {
    label: "SA exports",
    value: "2.65 Mt",
    delta: "+10.3%",
    detail: "July · 2026 high",
    sentiment: "negative",
    source: "Observed",
  },
  {
    label: "Durban → Tianjin",
    value: "$35.50",
    delta: "$35–36",
    detail: "10kt SHINC bends",
    sentiment: "neutral",
    source: "Indication",
  },
  {
    label: "USD / ZAR",
    value: "16.2718",
    delta: "15 Sep",
    detail: "Reference FX",
    sentiment: "neutral",
    source: "Observed",
  },
] as const;

function DataBadge({
  children,
  tone = "slate",
}: {
  children: React.ReactNode;
  tone?: "cyan" | "amber" | "rose" | "emerald" | "slate";
}) {
  const colours = {
    cyan: "border-cyan-300/20 bg-cyan-300/8 text-cyan-200",
    amber: "border-amber-300/20 bg-amber-300/8 text-amber-200",
    rose: "border-rose-300/20 bg-rose-300/8 text-rose-200",
    emerald: "border-emerald-300/20 bg-emerald-300/8 text-emerald-200",
    slate: "border-white/10 bg-white/[0.04] text-slate-400",
  };
  return (
    <span className={`inline-flex items-center rounded-md border px-2 py-1 text-[9px] font-semibold uppercase tracking-[0.13em] ${colours[tone]}`}>
      {children}
    </span>
  );
}

function PanelHeader({
  eyebrow,
  title,
  meta,
  children,
}: {
  eyebrow: string;
  title: string;
  meta?: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-4 border-b border-white/7 px-5 py-4 sm:px-6">
      <div>
        <p className="text-[9px] font-semibold uppercase tracking-[0.2em] text-slate-500">{eyebrow}</p>
        <div className="mt-1 flex flex-wrap items-baseline gap-3">
          <h2 className="text-base font-semibold tracking-tight text-slate-100">{title}</h2>
          {meta ? <span className="font-mono text-[10px] text-slate-500">{meta}</span> : null}
        </div>
      </div>
      {children}
    </div>
  );
}

function MetricCard({ metric }: { metric: (typeof metrics)[number] }) {
  const isNegative = metric.sentiment === "negative";
  return (
    <article className="relative bg-[#0a1525] p-5 transition-colors hover:bg-[#0d192b]">
      <div className="flex items-center justify-between gap-2">
        <p className="text-[9px] font-semibold uppercase tracking-[0.17em] text-slate-500">{metric.label}</p>
        <span className={`font-mono text-[10px] ${isNegative ? "text-rose-300" : "text-slate-500"}`}>{metric.delta}</span>
      </div>
      <p className="mt-4 font-mono text-[26px] font-semibold leading-none tracking-tight text-white">{metric.value}</p>
      <div className="mt-3 flex items-center justify-between gap-3">
        <p className="text-[11px] text-slate-500">{metric.detail}</p>
        <span className="text-[8px] font-bold uppercase tracking-[0.16em] text-slate-600">{metric.source}</span>
      </div>
      {isNegative ? <span className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-rose-300/35 to-transparent" /> : null}
    </article>
  );
}

type PriceTooltipPayload = {
  value?: number | string;
  dataKey?: string | number;
  name?: string;
  color?: string;
};

function PriceTooltipContent({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: PriceTooltipPayload[];
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  const values = payload.filter((item) => item.value != null);
  return (
    <div className="min-w-40 rounded-xl border border-white/10 bg-[#0d192b]/95 p-3 shadow-2xl backdrop-blur-xl">
      <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-slate-500">{label}</p>
      {values.map((item) => (
        <div key={String(item.dataKey)} className="flex items-center justify-between gap-5 py-0.5 text-xs">
          <span style={{ color: item.color }}>{item.name}</span>
          <span className="font-mono font-semibold text-white">${Number(item.value).toFixed(1)}</span>
        </div>
      ))}
    </div>
  );
}

function PriceChart({ forecastTarget }: { forecastTarget: number }) {
  const data = useMemo(() => {
    const target = Number(forecastTarget.toFixed(1));
    const oct = Number((CURRENT_PRICE + (target - CURRENT_PRICE) * 0.34).toFixed(1));
    const nov = Number((CURRENT_PRICE + (target - CURRENT_PRICE) * 0.68).toFixed(1));
    return [
      ...PRICE_HISTORY,
      { month: "Oct · F", observed: null, base: oct, bull: oct + 12, bear: oct - 11 },
      { month: "Nov · F", observed: null, base: nov, bull: nov + 17, bear: nov - 15 },
      { month: "Dec · F", observed: null, base: target, bull: target + 21, bear: target - 19 },
    ];
  }, [forecastTarget]);

  return (
    <div className="h-[330px] w-full px-2 pb-3 pt-5 sm:px-4">
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={data} margin={{ top: 8, right: 18, left: -12, bottom: 0 }}>
          <CartesianGrid stroke="rgba(148,163,184,.10)" vertical={false} />
          <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fill: "#607089", fontSize: 10 }} interval={1} />
          <YAxis domain={[230, 340]} axisLine={false} tickLine={false} tick={{ fill: "#607089", fontSize: 10 }} tickFormatter={(v) => `$${v}`} />
          <RechartsTooltip content={<PriceTooltipContent />} cursor={{ stroke: "rgba(103,232,249,.18)", strokeDasharray: "4 4" }} />
          <ReferenceLine x="Sep" stroke="rgba(103,232,249,.24)" strokeDasharray="4 5" label={{ value: "DATA CUT", fill: "#4a5d76", fontSize: 9, position: "insideTopRight" }} />
          <Line type="monotone" dataKey="observed" name="Observed" stroke="#67e8f9" strokeWidth={2.5} dot={false} connectNulls={false} />
          <Line type="monotone" dataKey="base" name="Base" stroke="#fcd34d" strokeWidth={2.2} strokeDasharray="7 6" dot={false} />
          <Line type="monotone" dataKey="bull" name="Bull case" stroke="#34d399" strokeWidth={1.3} strokeDasharray="3 5" dot={false} />
          <Line type="monotone" dataKey="bear" name="Bear case" stroke="#fb7185" strokeWidth={1.3} strokeDasharray="3 5" dot={false} />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}

function SourceMark({ source, href }: { source: string; href: string }) {
  return (
    <a href={href} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-[10px] font-medium text-cyan-300/75 transition hover:text-cyan-200">
      {source}<ExternalLink className="size-2.5" />
    </a>
  );
}

function Overview({
  forecastTarget,
  setActiveTab,
}: {
  forecastTarget: number;
  setActiveTab: (tab: DashboardTab) => void;
}) {
  return (
    <div className="space-y-5">
      <div className="grid gap-px overflow-hidden rounded-2xl border border-white/8 bg-white/8 sm:grid-cols-2 xl:grid-cols-5">
        {metrics.map((metric) => <MetricCard key={metric.label} metric={metric} />)}
      </div>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_370px]">
        <article className="overflow-hidden rounded-2xl border border-white/8 bg-[#0a1525]/95">
          <PanelHeader eyebrow="Historic → current → scenario" title="SA 40–42% concentrate · CIF China" meta="USD / dry metric tonne">
            <div className="flex flex-wrap gap-3 text-[10px] text-slate-400">
              <span><i className="mr-1.5 inline-block h-0.5 w-4 bg-cyan-300 align-middle" />Observed</span>
              <span><i className="mr-1.5 inline-block h-0.5 w-4 border-t border-dashed border-amber-300 align-middle" />Base</span>
              <DataBadge tone="amber">Modelled after Sep</DataBadge>
            </div>
          </PanelHeader>
          <div className="grid border-b border-white/7 px-5 py-4 sm:grid-cols-[1fr_auto] sm:px-6">
            <div className="flex flex-wrap items-end gap-x-4 gap-y-2">
              <span className="font-mono text-3xl font-semibold">$282.50</span>
              <span className="mb-1 inline-flex items-center gap-1 font-mono text-xs text-rose-300"><ArrowDownRight className="size-3.5" />$6.50 day/day</span>
            </div>
            <div className="mt-3 text-left sm:mt-0 sm:text-right">
              <p className="text-[9px] uppercase tracking-[0.16em] text-slate-600">90-day base scenario</p>
              <p className="mt-1 font-mono text-lg font-semibold text-amber-200">${forecastTarget.toFixed(1)}</p>
            </div>
          </div>
          <PriceChart forecastTarget={forecastTarget} />
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-white/7 px-5 py-3 text-[10px] text-slate-600 sm:px-6">
            <span>Historic series compiled from public broker/assessment snapshots; methods differ by date.</span>
            <button onClick={() => setActiveTab("sources")} className="inline-flex items-center gap-1 text-cyan-300/70 hover:text-cyan-200">Audit sources <ChevronRight className="size-3" /></button>
          </div>
        </article>

        <div className="space-y-5">
          <aside className="rounded-2xl border border-white/8 bg-[#0a1525]/95">
            <PanelHeader eyebrow="Nowcast" title="Signal stack">
              <DataBadge tone="rose">Defensive</DataBadge>
            </PanelHeader>
            <div className="space-y-0 px-5">
              {[
                ["Inventory", "Port stocks rose 98.6kt WoW", "Bearish", "rose"],
                ["Supply", "SA exports reached a 2026 high", "Bearish", "rose"],
                ["Downstream", "Major FeCr tenders down RMB100/t", "Bearish", "rose"],
                ["Logistics", "Durban–Tianjin at $35–36/t", "Firm", "cyan"],
              ].map(([title, detail, signal, colour]) => (
                <div key={title} className="grid grid-cols-[8px_1fr_auto] items-start gap-3 border-b border-white/7 py-4 last:border-0">
                  <span className={`mt-1.5 h-2 w-2 rounded-full ${colour === "rose" ? "bg-rose-300" : "bg-cyan-300"}`} />
                  <div><p className="text-xs font-semibold text-slate-200">{title}</p><p className="mt-1 text-[11px] leading-5 text-slate-500">{detail}</p></div>
                  <span className={`text-[9px] font-semibold uppercase tracking-wider ${colour === "rose" ? "text-rose-300" : "text-cyan-300"}`}>{signal}</span>
                </div>
              ))}
            </div>
          </aside>

          <aside className="rounded-2xl border border-white/8 bg-gradient-to-br from-[#0d1b2d] to-[#0a1525] p-5">
            <div className="flex items-start justify-between gap-4">
              <div><p className="text-[9px] font-semibold uppercase tracking-[0.2em] text-slate-500">Decision lens</p><h3 className="mt-1 text-sm font-semibold">What matters next</h3></div>
              <Gauge className="size-5 text-amber-200" />
            </div>
            <p className="mt-4 text-sm leading-6 text-slate-400">Inventory has become the swing variable. A second weekly build above 1.5%, without a tender recovery, keeps the base case below <span className="font-mono text-slate-200">$275/dmt</span>.</p>
            <Button onClick={() => setActiveTab("forecast")} variant="outline" size="sm" className="mt-5 w-full border-white/10 bg-white/[0.03] text-slate-200 hover:bg-cyan-300/10 hover:text-cyan-100">
              Stress-test the outlook <SlidersHorizontal className="size-3.5" />
            </Button>
          </aside>
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-[1.05fr_.95fr]">
        <article className="rounded-2xl border border-white/8 bg-[#0a1525]/95">
          <PanelHeader eyebrow="Market tape" title="Latest verified events" meta="Newest first" />
          <div className="divide-y divide-white/7">
            {[...MARKET_EVENTS].reverse().map((item) => (
              <div key={item.event} className="grid grid-cols-[58px_1fr_auto] items-center gap-3 px-5 py-3.5 sm:px-6">
                <span className="font-mono text-[10px] text-slate-600">{item.date}</span>
                <div><p className="text-xs font-medium text-slate-300">{item.event}</p><p className="mt-0.5 font-mono text-[11px] text-slate-500">{item.value}</p></div>
                <DataBadge tone={item.impact === "Bearish" ? "rose" : item.impact === "Firm" ? "cyan" : "slate"}>{item.impact}</DataBadge>
              </div>
            ))}
          </div>
        </article>

        <article className="rounded-2xl border border-white/8 bg-[#0a1525]/95">
          <PanelHeader eyebrow="Verification layer" title="Evidence coverage">
            <DataBadge tone="emerald">7 of 8 current</DataBadge>
          </PanelHeader>
          <div className="grid gap-4 p-5 sm:grid-cols-2 sm:p-6">
            <div className="rounded-xl border border-white/7 bg-white/[0.025] p-4">
              <div className="flex items-center justify-between"><Database className="size-4 text-cyan-300" /><span className="font-mono text-2xl font-semibold">83%</span></div>
              <p className="mt-3 text-xs font-semibold text-slate-300">Source confidence</p>
              <p className="mt-1 text-[11px] leading-5 text-slate-500">Official and assessed data weighted above broker indications.</p>
            </div>
            <div className="rounded-xl border border-white/7 bg-white/[0.025] p-4">
              <div className="flex items-center justify-between"><RefreshCw className="size-4 text-amber-200" /><span className="font-mono text-2xl font-semibold">5d</span></div>
              <p className="mt-3 text-xs font-semibold text-slate-300">Oldest market input</p>
              <p className="mt-1 text-[11px] leading-5 text-slate-500">Inventory is weekly; trade volumes are monthly and lagged.</p>
            </div>
          </div>
          <div className="border-t border-white/7 px-5 py-3 text-[10px] leading-5 text-slate-600 sm:px-6">No automated site scraping. Production ingestion should use licensed APIs, email feeds, CSV uploads or approved connectors.</div>
        </article>
      </div>
    </div>
  );
}

function PricesTab() {
  const keyRows = LCB_PRICES.filter((row) => row.grade === "40/42" || row.origin === "Zimbabwe");
  const spread = [
    { label: "FOT Rustenburg 40/42", value: 156.71, width: 54, tone: "cyan" },
    { label: "Road to Richards Bay", value: 49.17, width: 17, tone: "slate" },
    { label: "Ocean freight indication", value: 35.5, width: 12, tone: "slate" },
    { label: "Unresolved basis / commercial gap", value: 46.62, width: 16, tone: "amber" },
  ];
  return (
    <div className="space-y-5">
      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.1fr)_minmax(380px,.9fr)]">
        <article className="overflow-hidden rounded-2xl border border-white/8 bg-[#0a1525]/95">
          <PanelHeader eyebrow="Broker price matrix" title="LCB chrome indications" meta="15 Sep 2026 batch">
            <DataBadge tone="amber">Indication · verify terms</DataBadge>
          </PanelHeader>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-left">
              <thead className="border-b border-white/7 bg-white/[0.02] text-[9px] uppercase tracking-[0.16em] text-slate-600">
                <tr><th className="px-5 py-3 font-semibold">Origin</th><th className="px-4 py-3 font-semibold">Grade</th><th className="px-4 py-3 font-semibold">Product</th><th className="px-4 py-3 font-semibold">Mode</th><th className="px-4 py-3 font-semibold">Basis</th><th className="px-5 py-3 text-right font-semibold">Quote</th><th className="px-5 py-3 text-right font-semibold">USD / mtu</th></tr>
              </thead>
              <tbody className="divide-y divide-white/6">
                {LCB_PRICES.map((row) => {
                  const midpoint = row.grade.split("/").map(Number).reduce((a, b) => a + b, 0) / 2;
                  const usd = row.currency === "USD" ? row.price : row.price / FX;
                  return (
                    <tr key={`${row.origin}-${row.grade}-${row.product}-${row.mode}-${row.basis}`} className="text-xs text-slate-400 transition hover:bg-white/[0.025]">
                      <td className="px-5 py-3 text-slate-300">{row.origin}</td><td className="px-4 py-3 font-mono">{row.grade}</td><td className="px-4 py-3">{row.product}</td><td className="px-4 py-3">{row.mode}</td><td className="px-4 py-3">{row.basis}</td>
                      <td className="px-5 py-3 text-right font-mono font-semibold text-slate-200">{row.currency === "USD" ? "$" : "R"}{row.price.toLocaleString(undefined, { maximumFractionDigits: 0 })}</td>
                      <td className="px-5 py-3 text-right font-mono text-cyan-200/80">${(usd / midpoint).toFixed(2)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="border-t border-white/7 px-5 py-3 text-[10px] text-slate-600">USD conversion uses 16.2718 USD/ZAR. USD/mtu is a normalization aid, not a replacement for full chemistry and sizing.</div>
        </article>

        <article className="rounded-2xl border border-white/8 bg-[#0a1525]/95">
          <PanelHeader eyebrow="Basis bridge" title="Rustenburg → CIF China" meta="40/42 concentrate">
            <Tooltip>
              <TooltipTrigger asChild><button aria-label="Basis bridge explanation" className="text-slate-500 hover:text-cyan-200"><Info className="size-4" /></button></TooltipTrigger>
              <TooltipContent className="max-w-72 bg-slate-100 text-slate-900">A reconciliation of quoted local value, logistics and the broker CIF indication. It is not a margin calculation.</TooltipContent>
            </Tooltip>
          </PanelHeader>
          <div className="p-5 sm:p-6">
            <div className="mb-6 flex items-end justify-between"><div><p className="text-[9px] uppercase tracking-[0.16em] text-slate-600">LCB CIF bulk quote</p><p className="mt-2 font-mono text-3xl font-semibold">$288.00</p></div><DataBadge tone="cyan">100% reconciled</DataBadge></div>
            <div className="space-y-4">
              {spread.map((row) => (
                <div key={row.label}>
                  <div className="mb-1.5 flex items-center justify-between gap-4 text-[11px]"><span className="text-slate-400">{row.label}</span><span className="font-mono text-slate-200">${row.value.toFixed(2)}</span></div>
                  <div className="h-2 overflow-hidden rounded-full bg-white/5"><div className={`h-full rounded-full ${row.tone === "cyan" ? "bg-cyan-300" : row.tone === "amber" ? "bg-amber-300" : "bg-slate-500"}`} style={{ width: `${row.width}%` }} /></div>
                </div>
              ))}
            </div>
            <div className="mt-6 rounded-xl border border-amber-300/15 bg-amber-300/[0.05] p-4">
              <div className="flex gap-3"><CircleAlert className="mt-0.5 size-4 shrink-0 text-amber-200" /><p className="text-[11px] leading-5 text-amber-100/70">The $46.62/t residual can contain route mismatch, stockpile and handling costs, moisture, sizing, finance, assay risk, seller premium and timing. It must not be treated as profit.</p></div>
            </div>
          </div>
        </article>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <article className="rounded-2xl border border-white/8 bg-[#0a1525]/95">
          <PanelHeader eyebrow="Cross-check" title="Same-day benchmark comparison" />
          <div className="p-5 sm:p-6">
            <div className="grid grid-cols-3 gap-px overflow-hidden rounded-xl bg-white/7">
              {[["LCB bulk 40/42", "$288.00", "Broker quote"], ["SMM midpoint", "$289.00", "15 Sep"], ["SMM midpoint", "$282.50", "16 Sep"]].map(([label, value, meta]) => (
                <div key={label + meta} className="bg-[#0d192b] p-4"><p className="text-[9px] uppercase tracking-wider text-slate-600">{label}</p><p className="mt-3 font-mono text-xl font-semibold">{value}</p><p className="mt-1 text-[10px] text-slate-500">{meta}</p></div>
              ))}
            </div>
            <p className="mt-4 text-xs leading-6 text-slate-500">LCB aligned closely with SMM on 15 September. The next-day SMM move implies a softer prompt market and reinforces the need to timestamp every quote.</p>
          </div>
        </article>

        <article className="rounded-2xl border border-white/8 bg-[#0a1525]/95">
          <PanelHeader eyebrow="Focused view" title="40/42 & Zimbabwe quotes" />
          <div className="divide-y divide-white/7">
            {keyRows.map((row) => (
              <div key={`${row.origin}-${row.grade}-${row.product}-${row.basis}-${row.mode}`} className="flex items-center justify-between gap-4 px-5 py-3.5 sm:px-6">
                <div><p className="text-xs font-medium text-slate-300">{row.origin} · {row.grade} {row.product}</p><p className="mt-1 text-[10px] text-slate-600">{row.basis} · {row.mode}</p></div>
                <p className="font-mono text-sm font-semibold text-slate-100">{row.currency === "USD" ? "$" : "R"}{row.price.toLocaleString()}</p>
              </div>
            ))}
          </div>
        </article>
      </div>
    </div>
  );
}

function FlowsTab() {
  return (
    <div className="space-y-5">
      <div className="grid gap-5 lg:grid-cols-3">
        {[
          { icon: Box, eyebrow: "China inventory", value: "5.318 Mt", delta: "+98.6 kt WoW", text: "Tianjin holds 4.6854 Mt, or 88% of tracked stocks.", tone: "rose" },
          { icon: Ship, eyebrow: "South Africa exports", value: "2.65 Mt", delta: "+10.3% MoM", text: "July reached the highest reported monthly level of 2026.", tone: "rose" },
          { icon: Activity, eyebrow: "FeCr tender pulse", value: "RMB 7,995", delta: "−100/t", text: "Tsingshan tender; TISCO reported at RMB 7,795/t.", tone: "amber" },
        ].map((card) => (
          <article key={card.eyebrow} className="rounded-2xl border border-white/8 bg-[#0a1525]/95 p-5 sm:p-6">
            <div className="flex items-start justify-between"><card.icon className="size-5 text-cyan-300" /><DataBadge tone={card.tone as "rose" | "amber"}>{card.delta}</DataBadge></div>
            <p className="mt-6 text-[9px] font-semibold uppercase tracking-[0.18em] text-slate-600">{card.eyebrow}</p><p className="mt-2 font-mono text-3xl font-semibold">{card.value}</p><p className="mt-3 text-xs leading-6 text-slate-500">{card.text}</p>
          </article>
        ))}
      </div>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_420px]">
        <article className="overflow-hidden rounded-2xl border border-white/8 bg-[#0a1525]/95">
          <PanelHeader eyebrow="Freight board" title="Southern Africa dry-bulk indications" meta="USD / mt">
            <DataBadge tone="amber">15 Sep broker sheet</DataBadge>
          </PanelHeader>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[700px] text-left">
              <thead className="border-b border-white/7 bg-white/[0.02] text-[9px] uppercase tracking-[0.16em] text-slate-600"><tr><th className="px-5 py-3">Vessel</th><th className="px-4 py-3">Route</th><th className="px-4 py-3">Cargo</th><th className="px-4 py-3">Terms</th><th className="px-5 py-3 text-right">Freight</th></tr></thead>
              <tbody className="divide-y divide-white/6">
                {FREIGHT_MARKET.map((row) => (
                  <tr key={`${row.size}-${row.route}`} className={`text-xs ${row.commodity === "Chrome" ? "bg-cyan-300/[0.045]" : ""}`}>
                    <td className="px-5 py-3 text-slate-400">{row.size}</td><td className="px-4 py-3 font-medium text-slate-300">{row.route}</td><td className="px-4 py-3 text-slate-500">{row.commodity}</td><td className="px-4 py-3 text-slate-500">{row.terms}</td><td className="px-5 py-3 text-right font-mono font-semibold text-slate-200">${row.low}/{row.high}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="border-t border-white/7 px-5 py-3 text-[10px] leading-5 text-slate-600">SHINC bends = load and discharge rates apply Sundays and holidays included at both ends. Confirm laycan, demurrage and vessel age.</div>
        </article>

        <div className="space-y-5">
          <article className="rounded-2xl border border-white/8 bg-[#0a1525]/95">
            <PanelHeader eyebrow="Supply chain" title="Pressure map" />
            <div className="p-5">
              {[
                ["Mine / plant", "High", "Export run-rate elevated", 78],
                ["Inland logistics", "Moderate", "R800/t FOT → Richards Bay", 54],
                ["Ocean freight", "Moderate", "$35–36/t broker indication", 47],
                ["China stocks", "High", "5.318 Mt and rising", 84],
                ["Smelter margins", "High", "Tender prices easing", 76],
              ].map(([node, level, detail, width]) => (
                <div key={node as string} className="mb-4 last:mb-0">
                  <div className="mb-1.5 flex items-center justify-between text-[11px]"><div><span className="font-medium text-slate-300">{node}</span><span className="ml-2 text-slate-600">{detail}</span></div><span className={level === "High" ? "text-rose-300" : "text-amber-200"}>{level}</span></div>
                  <div className="h-1.5 rounded-full bg-white/5"><div className={`h-full rounded-full ${level === "High" ? "bg-rose-300/75" : "bg-amber-200/75"}`} style={{ width: `${width}%` }} /></div>
                </div>
              ))}
            </div>
          </article>
          <article className="rounded-2xl border border-amber-300/15 bg-amber-300/[0.045] p-5">
            <div className="flex items-start gap-3"><FileCheck2 className="mt-0.5 size-5 shrink-0 text-amber-200" /><div><p className="text-[9px] font-semibold uppercase tracking-[0.18em] text-amber-200/60">Policy watch</p><h3 className="mt-1 text-sm font-semibold text-amber-100">South African export controls</h3><p className="mt-3 text-xs leading-6 text-amber-100/60">ITAC consultation is a structural risk item. Treat the linked government notice as the primary reference and verify the current gazetted position before making decisions.</p><SourceMark source="Official notice" href="https://www.gov.za/documents/notices/international-trade-administration-act-placing-chrome-ore-under-export-control-0" /></div></div>
          </article>
        </div>
      </div>
    </div>
  );
}

function DriverSlider({
  label,
  value,
  min,
  max,
  step,
  suffix,
  onChange,
  note,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  suffix: string;
  onChange: (v: number) => void;
  note: string;
}) {
  return (
    <div className="border-b border-white/7 py-5 last:border-0">
      <div className="mb-3 flex items-center justify-between gap-4"><div><p className="text-xs font-semibold text-slate-300">{label}</p><p className="mt-1 text-[10px] text-slate-600">{note}</p></div><span className="min-w-20 rounded-md border border-white/8 bg-white/[0.035] px-2.5 py-1.5 text-right font-mono text-xs text-cyan-100">{value > 0 && (label.includes("growth") || label.includes("change")) ? "+" : ""}{value.toFixed(step < 1 ? 2 : 1)}{suffix}</span></div>
      <Slider value={[value]} min={min} max={max} step={step} onValueChange={(v) => onChange(v[0])} aria-label={label} />
      <div className="mt-2 flex justify-between font-mono text-[9px] text-slate-700"><span>{min}{suffix}</span><span>{max}{suffix}</span></div>
    </div>
  );
}

function ForecastTab({
  inputs,
  setInputs,
  forecastTarget,
}: {
  inputs: ForecastInputs;
  setInputs: React.Dispatch<React.SetStateAction<ForecastInputs>>;
  forecastTarget: number;
}) {
  const contributions = [
    { label: "Inventory", value: -inputs.inventoryWoW * 1.2 },
    { label: "Exports", value: -inputs.exportGrowth * 0.35 },
    { label: "FeCr tender", value: inputs.tenderChange / 22 },
    { label: "Freight", value: (inputs.freight - 35.5) * 0.55 },
    { label: "FX", value: (16.27 - inputs.fx) * 2.2 },
  ];
  const bear = forecastTarget - 19;
  const bull = forecastTarget + 21;
  return (
    <div className="space-y-5">
      <div className="grid gap-5 xl:grid-cols-[390px_minmax(0,1fr)]">
        <article className="rounded-2xl border border-white/8 bg-[#0a1525]/95">
          <PanelHeader eyebrow="Scenario controls" title="Stress-test the 90-day view">
            <Button variant="ghost" size="xs" onClick={() => setInputs(initialInputs)} className="text-slate-500 hover:bg-white/5 hover:text-slate-200"><RotateCcw className="size-3" />Reset</Button>
          </PanelHeader>
          <div className="px-5">
            <DriverSlider label="China inventory change" value={inputs.inventoryWoW} min={-4} max={6} step={0.1} suffix="%" onChange={(v) => setInputs((p) => ({ ...p, inventoryWoW: v }))} note="Weekly port stock change" />
            <DriverSlider label="Durban → Tianjin freight" value={inputs.freight} min={25} max={50} step={0.5} suffix="/t" onChange={(v) => setInputs((p) => ({ ...p, freight: v }))} note="Ocean freight midpoint" />
            <DriverSlider label="USD / ZAR" value={inputs.fx} min={14.5} max={19} step={0.05} suffix="" onChange={(v) => setInputs((p) => ({ ...p, fx: v }))} note="Reference exchange rate" />
            <DriverSlider label="SA export growth" value={inputs.exportGrowth} min={-15} max={25} step={0.5} suffix="%" onChange={(v) => setInputs((p) => ({ ...p, exportGrowth: v }))} note="Month-on-month change" />
            <DriverSlider label="FeCr tender change" value={inputs.tenderChange} min={-400} max={300} step={10} suffix=" RMB" onChange={(v) => setInputs((p) => ({ ...p, tenderChange: v }))} note="Downstream demand proxy" />
          </div>
        </article>

        <div className="space-y-5">
          <article className="overflow-hidden rounded-2xl border border-white/8 bg-[#0a1525]/95">
            <PanelHeader eyebrow="Scenario output" title="90-day CIF range" meta="SA 40–42% concentrate">
              <DataBadge tone="amber">Model · not prediction</DataBadge>
            </PanelHeader>
            <div className="grid gap-px bg-white/7 sm:grid-cols-3">
              {[["Bear", bear, "Demand fades / stocks build", "rose"], ["Base", forecastTarget, "Current inputs persist", "amber"], ["Bull", bull, "Supply or logistics tighten", "emerald"]].map(([label, value, note, tone]) => (
                <div key={label as string} className="bg-[#0a1525] p-5 text-center"><DataBadge tone={tone as "rose" | "amber" | "emerald"}>{label}</DataBadge><p className="mt-4 font-mono text-3xl font-semibold">${Number(value).toFixed(1)}</p><p className="mt-2 text-[10px] text-slate-600">{note}</p></div>
              ))}
            </div>
            <PriceChart forecastTarget={forecastTarget} />
          </article>

          <div className="grid gap-5 lg:grid-cols-2">
            <article className="rounded-2xl border border-white/8 bg-[#0a1525]/95 p-5 sm:p-6">
              <p className="text-[9px] font-semibold uppercase tracking-[0.18em] text-slate-600">Driver decomposition</p>
              <div className="mt-5 space-y-3">
                {contributions.map((item) => (
                  <div key={item.label} className="grid grid-cols-[90px_1fr_52px] items-center gap-3 text-[11px]"><span className="text-slate-500">{item.label}</span><div className="relative h-1.5 rounded-full bg-white/5"><span className={`absolute top-0 h-full rounded-full ${item.value >= 0 ? "left-1/2 bg-emerald-300" : "right-1/2 bg-rose-300"}`} style={{ width: `${Math.min(50, Math.abs(item.value) * 5)}%` }} /></div><span className={`text-right font-mono ${item.value >= 0 ? "text-emerald-300" : "text-rose-300"}`}>{item.value >= 0 ? "+" : ""}{item.value.toFixed(1)}</span></div>
                ))}
              </div>
            </article>
            <article className="rounded-2xl border border-white/8 bg-[#0a1525]/95 p-5 sm:p-6">
              <p className="text-[9px] font-semibold uppercase tracking-[0.18em] text-slate-600">Model discipline</p>
              <div className="mt-4 space-y-3 text-[11px] leading-5 text-slate-500">
                <p className="flex gap-2"><CheckCircle2 className="mt-0.5 size-3.5 shrink-0 text-emerald-300" />Uses transparent, editable drivers.</p>
                <p className="flex gap-2"><CheckCircle2 className="mt-0.5 size-3.5 shrink-0 text-emerald-300" />Starts from the latest observed SMM midpoint.</p>
                <p className="flex gap-2"><CircleAlert className="mt-0.5 size-3.5 shrink-0 text-amber-200" />Does not include chemistry, moisture, seller credit or unpublished deals.</p>
              </div>
              <p className="mt-5 rounded-lg bg-white/[0.025] p-3 text-[10px] leading-5 text-slate-600">Confidence: 62%. Recalibrate weights after at least 12 months of clean weekly observations.</p>
            </article>
          </div>
        </div>
      </div>
    </div>
  );
}

function SourcesTab() {
  return (
    <div className="space-y-5">
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_340px]">
        <article className="overflow-hidden rounded-2xl border border-white/8 bg-[#0a1525]/95">
          <PanelHeader eyebrow="Data provenance" title="Source ledger" meta="Observed, indicated and modelled are kept separate">
            <DataBadge tone="emerald">8 mapped sources</DataBadge>
          </PanelHeader>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[880px] text-left">
              <thead className="border-b border-white/7 bg-white/[0.02] text-[9px] uppercase tracking-[0.16em] text-slate-600"><tr><th className="px-5 py-3">Source</th><th className="px-4 py-3">Dataset</th><th className="px-4 py-3">As of</th><th className="px-4 py-3">Method</th><th className="px-4 py-3">Confidence</th><th className="px-5 py-3 text-right">Status</th></tr></thead>
              <tbody className="divide-y divide-white/6">
                {SOURCES.map((source) => (
                  <tr key={source.id} className="align-top text-xs transition hover:bg-white/[0.02]">
                    <td className="px-5 py-4"><SourceMark source={source.source} href={source.url} /><p className="mt-2 max-w-[260px] text-[10px] leading-5 text-slate-600">{source.note}</p></td>
                    <td className="px-4 py-4 text-slate-300">{source.dataset}</td><td className="px-4 py-4 font-mono text-[11px] text-slate-500">{source.asOf}<p className="mt-1 text-[9px] text-slate-700">{source.freshness}</p></td><td className="px-4 py-4 text-slate-500">{source.method}</td>
                    <td className="px-4 py-4"><DataBadge tone={source.confidence === "High" ? "emerald" : "amber"}>{source.confidence}</DataBadge></td><td className="px-5 py-4 text-right"><DataBadge tone={source.status === "Verified" ? "cyan" : "slate"}>{source.status}</DataBadge></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </article>

        <div className="space-y-5">
          <article className="rounded-2xl border border-white/8 bg-[#0a1525]/95 p-5">
            <div className="flex items-start gap-3"><BookOpenCheck className="mt-0.5 size-5 shrink-0 text-cyan-300" /><div><p className="text-[9px] font-semibold uppercase tracking-[0.18em] text-slate-600">Benchmark definition</p><h3 className="mt-1 text-sm font-semibold">Fastmarkets MB-CHO-0003</h3><p className="mt-3 text-xs leading-6 text-slate-500">Weekly CIF Tianjin assessment for 40–42% chrome concentrate in bulk, normalized to a minimum 5,000-tonne parcel.</p><SourceMark source="Methodology PDF" href="https://www.fastmarkets.com/uploads/2025/02/fm-mb-non-ferrous-methodology-specifications.pdf" /></div></div>
          </article>
          <article className="rounded-2xl border border-white/8 bg-[#0a1525]/95 p-5">
            <p className="text-[9px] font-semibold uppercase tracking-[0.18em] text-slate-600">Verification hierarchy</p>
            <div className="mt-4 space-y-3">
              {[["1", "Government / customs", "Volumes, policy, legal status"], ["2", "Price reporting agency", "Benchmarks, surveys, methodology"], ["3", "Broker indication", "Tradable market colour, time-sensitive"], ["4", "Internal deal evidence", "Best execution check; access controlled"]].map(([num, title, detail]) => (
                <div key={num} className="grid grid-cols-[28px_1fr] gap-3"><span className="grid h-7 w-7 place-items-center rounded-lg border border-white/8 bg-white/[0.03] font-mono text-[10px] text-cyan-200">{num}</span><div><p className="text-xs font-medium text-slate-300">{title}</p><p className="mt-0.5 text-[10px] text-slate-600">{detail}</p></div></div>
              ))}
            </div>
          </article>
          <article className="rounded-2xl border border-rose-300/15 bg-rose-300/[0.04] p-5">
            <p className="text-[9px] font-semibold uppercase tracking-[0.18em] text-rose-200/60">Data governance</p><p className="mt-3 text-xs leading-6 text-rose-100/65">Do not bypass robots controls or repeatedly poll public pages. Use licensed subscriptions, approved APIs, monitored inboxes or deliberate file uploads with rate limits and caching.</p>
          </article>
        </div>
      </div>
    </div>
  );
}

export default function Dashboard() {
  const [activeTab, setActiveTab] = useState<DashboardTab>("overview");
  const [inputs, setInputs] = useState<ForecastInputs>(initialInputs);
  const activeTabRef = useRef(activeTab);

  useEffect(() => {
    activeTabRef.current = activeTab;
  }, [activeTab]);

  const forecastTarget = useMemo(() => {
    const value =
      CURRENT_PRICE -
      inputs.inventoryWoW * 1.2 -
      inputs.exportGrowth * 0.35 +
      inputs.tenderChange / 22 +
      (inputs.freight - 35.5) * 0.55 +
      (16.27 - inputs.fx) * 2.2;
    return Math.max(220, Math.min(340, Number(value.toFixed(1))));
  }, [inputs]);

  useEffect(() => {
    const modelContext = (document as unknown as {
      modelContext?: {
        registerTool: (tool: Record<string, unknown>, options?: { signal?: AbortSignal }) => void | Promise<void>;
      };
    }).modelContext;
    if (!modelContext?.registerTool) return;
    const lifecycle = new AbortController();
    const report = () => undefined;
    try {
      void Promise.resolve(modelContext.registerTool({
        name: "read_chrome_market_snapshot",
        title: "Read chrome market snapshot",
        description: "Read the latest verified chrome price, inventory, export, freight and market-posture values shown in the dashboard.",
        inputSchema: { type: "object", properties: {}, additionalProperties: false },
        annotations: { readOnlyHint: true, untrustedContentHint: false },
        execute: () => ({
          asOf: "2026-09-16T17:00:00+02:00",
          activeView: activeTabRef.current,
          cifUsdPerDmt: 282.5,
          chinaPortInventoryMt: 5.318,
          southAfricaExportsMt: 2.65,
          durbanTianjinFreightUsdPerMt: 35.5,
          posture: "defensive",
        }),
      }, { signal: lifecycle.signal })).catch(report);
      void Promise.resolve(modelContext.registerTool({
        name: "configure_chrome_forecast_scenario",
        title: "Configure chrome forecast scenario",
        description: "Set one or more visible forecast drivers and open the Forecast Lab. Values must stay inside the dashboard slider ranges.",
        inputSchema: {
          type: "object",
          properties: {
            inventoryWoW: { type: "number", minimum: -4, maximum: 6 },
            freight: { type: "number", minimum: 25, maximum: 50 },
            fx: { type: "number", minimum: 14.5, maximum: 19 },
            exportGrowth: { type: "number", minimum: -15, maximum: 25 },
            tenderChange: { type: "number", minimum: -400, maximum: 300 },
          },
          additionalProperties: false,
        },
        annotations: { readOnlyHint: false, untrustedContentHint: false },
        execute: (input: unknown) => {
          if (!input || typeof input !== "object" || Array.isArray(input)) throw new Error("Expected a scenario object");
          const next = input as Partial<ForecastInputs>;
          const ranges: Record<keyof ForecastInputs, [number, number]> = {
            inventoryWoW: [-4, 6], freight: [25, 50], fx: [14.5, 19], exportGrowth: [-15, 25], tenderChange: [-400, 300],
          };
          for (const [key, value] of Object.entries(next)) {
            if (!(key in ranges) || typeof value !== "number" || value < ranges[key as keyof ForecastInputs][0] || value > ranges[key as keyof ForecastInputs][1]) throw new Error(`Invalid scenario value: ${key}`);
          }
          setInputs((previous) => ({ ...previous, ...next }));
          setActiveTab("forecast");
          return { status: "configured", visibleView: "forecast", updatedDrivers: next };
        },
      }, { signal: lifecycle.signal })).catch(report);
    } catch {
      return () => lifecycle.abort();
    }
    return () => lifecycle.abort();
  }, []);

  const exportCsv = () => {
    const rows = [
      ["dataset", "as_of", "metric", "value", "unit", "source"],
      ["price", "2026-09-16", "SA 40-42 concentrate CIF China", "282.5", "USD/dmt", "SMM"],
      ["inventory", "2026-09-11", "China chrome ore port inventory", "5.318", "Mt", "SMM"],
      ["exports", "2026-07", "South Africa chrome ore exports", "2.65", "Mt", "SMM"],
      ["freight", "2026-09-15", "Durban-Tianjin chrome", "35.5", "USD/mt", "Nexus/LCB"],
      ...LCB_PRICES.map((row) => ["lcb_quote", "2026-09-15", `${row.origin} ${row.grade} ${row.product} ${row.mode} ${row.basis}`, String(row.price), row.currency + "/mt", "LCB"]),
    ];
    const csv = rows.map((row) => row.map((cell) => `"${String(cell).replaceAll('"', '""')}"`).join(",")).join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = "chrome-market-snapshot-2026-09-16.csv";
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <TooltipProvider>
      <main className="min-h-screen bg-[#07101d] text-[#eef6ff]">
        <div className="ore-grid min-h-screen">
          <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as DashboardTab)} className="gap-0">
            <header className="sticky top-0 z-40 border-b border-white/8 bg-[#07101d]/90 backdrop-blur-xl">
              <div className="mx-auto max-w-[1560px] px-4 lg:px-8">
                <div className="flex min-h-16 items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="grid h-9 w-9 place-items-center rounded-xl border border-cyan-300/25 bg-cyan-300/10 font-mono text-sm font-semibold text-cyan-200">Cr</div>
                    <div><p className="text-sm font-semibold tracking-tight">Chrome Market Analyser</p><p className="hidden text-[9px] font-medium uppercase tracking-[0.19em] text-slate-600 sm:block">Connect Logistics Intelligence</p></div>
                  </div>
                  <div className="hidden flex-1 justify-center lg:flex">
                    <TabsList variant="line" className="h-12 gap-2">
                      {[["overview", "Overview"], ["prices", "Prices & basis"], ["flows", "Flows & freight"], ["forecast", "Forecast Lab"], ["sources", "Source ledger"]].map(([value, label]) => (
                        <TabsTrigger key={value} value={value} className="h-12 px-3 text-xs text-slate-500 after:bg-cyan-300 data-[state=active]:text-cyan-100">{label}</TabsTrigger>
                      ))}
                    </TabsList>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="hidden items-center gap-2 rounded-md border border-emerald-400/15 bg-emerald-400/[0.06] px-2.5 py-1.5 text-[9px] font-semibold uppercase tracking-wider text-emerald-300 md:inline-flex"><span className="h-1.5 w-1.5 rounded-full bg-emerald-300 shadow-[0_0_9px_#6ee7b7]" />7 / 8 current</span>
                    <Button onClick={exportCsv} variant="outline" size="sm" className="border-white/10 bg-white/[0.025] text-slate-300 hover:bg-cyan-300/10 hover:text-cyan-100"><Download className="size-3.5" /><span className="hidden sm:inline">Export data</span></Button>
                  </div>
                </div>
                <div className="overflow-x-auto lg:hidden">
                  <TabsList variant="line" className="h-11 min-w-max">
                    {[["overview", "Overview"], ["prices", "Prices"], ["flows", "Flows"], ["forecast", "Forecast"], ["sources", "Sources"]].map(([value, label]) => <TabsTrigger key={value} value={value} className="h-11 px-3 text-xs text-slate-500 after:bg-cyan-300 data-[state=active]:text-cyan-100">{label}</TabsTrigger>)}
                  </TabsList>
                </div>
              </div>
            </header>

            <section className="mx-auto max-w-[1560px] px-4 pb-16 pt-7 lg:px-8">
              <div className="mb-6 flex flex-col justify-between gap-4 xl:flex-row xl:items-end">
                <div>
                  <div className="mb-3 flex items-center gap-2 font-mono text-[9px] uppercase tracking-[0.22em] text-cyan-300"><span className="h-px w-7 bg-cyan-300/70" />Executive market control room</div>
                  <h1 className="max-w-3xl text-[28px] font-semibold leading-tight tracking-[-0.035em] sm:text-[34px]">South African chrome, from pit gate to port.</h1>
                  <p className="mt-2 max-w-2xl text-xs leading-6 text-slate-500">Observed benchmarks, logistics spreads and forward scenarios—with evidence attached to every signal.</p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <div className="mr-2 hidden text-right md:block"><p className="text-[9px] uppercase tracking-[0.16em] text-slate-700">Data cut</p><p className="mt-1 font-mono text-[10px] text-slate-500">16 Sep 2026 · 17:00 SAST</p></div>
                  <div className="flex items-center gap-3 rounded-xl border border-amber-300/15 bg-amber-300/[0.055] px-4 py-2.5"><TrendingDown className="size-4 text-amber-200" /><div><p className="text-[8px] font-semibold uppercase tracking-[0.17em] text-amber-200/55">Market posture</p><p className="text-xs font-semibold text-amber-100">Defensive · supply pressure</p></div></div>
                </div>
              </div>

              <TabsContent value="overview"><Overview forecastTarget={forecastTarget} setActiveTab={setActiveTab} /></TabsContent>
              <TabsContent value="prices"><PricesTab /></TabsContent>
              <TabsContent value="flows"><FlowsTab /></TabsContent>
              <TabsContent value="forecast"><ForecastTab inputs={inputs} setInputs={setInputs} forecastTarget={forecastTarget} /></TabsContent>
              <TabsContent value="sources"><SourcesTab /></TabsContent>
            </section>
          </Tabs>

          <footer className="border-t border-white/7 px-4 py-5 text-center text-[9px] uppercase tracking-[0.14em] text-slate-700">
            Market intelligence only · Not a tradable quote or financial advice · Verify grade, moisture, sizing, basis and terms before execution
          </footer>
        </div>
      </main>
    </TooltipProvider>
  );
}
