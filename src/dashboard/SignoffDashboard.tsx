// ============================================================
// Signoff Dashboard — Aggregated Statistics
//
// 6개의 차트로 전체 signoff pipeline 상태를 한눈에 보여줍니다.
// Design tokens from signoff-design-system applied.
// ============================================================

import React from 'react';
import {
  PieChart, Pie, Cell,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  AreaChart, Area,
  RadialBarChart, RadialBar,
  ResponsiveContainer,
} from 'recharts';
import {
  fontFamilies,
  statusColors,
  radii,
  shadows,
  mantineSpacing,
} from '@signoff/design-system/src/tokens';
import {
  useSignoffPipeline,
  useLauncherStatus,
  useReviewProgress,
  useDailyTrend,
  useCellSummary,
  useOwnerWorkload,
} from './hooks';

// ── Design Tokens (from @signoff/design-system) ────────────

const fontFamily = fontFamilies.sans;
const sc = statusColors.light;

const colors = {
  // Status (from statusColors)
  pass: sc.pass,
  fail: sc.fail,
  running: sc.running,
  pending: sc.pending,
  error: sc.error,
  skipped: sc.skipped,
  na: sc.na,
  // Surface / Layout — Minimal Flat Light theme values
  // (theme colors are not exported as standalone tokens,
  //  so we keep these in sync with the theme definition)
  background: '#FFFFFF',
  surface: '#F9FAFB',
  surfaceHover: '#F3F4F6',
  border: '#D1D5DB',
  borderSubtle: '#E5E7EB',
  text: '#111827',
  textSecondary: '#4B5563',
  textMuted: '#9CA3AF',
  primary: '#2563EB',
  primarySubtle: '#EFF6FF',
};

const spacing = {
  xs: parseInt(mantineSpacing.xs) * 16,   // 8px
  sm: parseInt(mantineSpacing.sm) * 16,   // 12px
  md: parseInt(mantineSpacing.md) * 16,   // 16px
  lg: parseInt(mantineSpacing.lg) * 16,   // 24px
  xl: parseInt(mantineSpacing.xl) * 16,   // 32px
} as const;

/** CSS border-radius (string, for style props) */
const radius = {
  sm: radii.sm,     // '0.25rem'
  md: radii.md,     // '0.375rem'
  lg: radii.lg,     // '0.5rem'
  xl: radii.xl,     // '0.75rem'
};

/** Numeric px values for recharts props (cornerRadius, bar radius) */
const radiusPx = { sm: 4, md: 6, lg: 8, xl: 12 } as const;

const shadow = {
  sm: shadows.sm,
  md: shadows.md,
};

// ── Chart Color Mappings ───────────────────────────────────

const PIPELINE_COLORS: Record<string, string> = {
  launcher_fail: colors.fail,
  launcher_running: colors.pending,
  review_pending: colors.skipped,
  review_in_progress: colors.running,
  review_complete: colors.pass,
  unknown: colors.na,
};

const PIPELINE_LABELS: Record<string, string> = {
  launcher_fail: 'Launcher Fail',
  launcher_running: 'Launcher Running',
  review_pending: 'Review Pending',
  review_in_progress: 'Review In Progress',
  review_complete: 'Review Complete',
  unknown: 'Unknown',
};

const STATUS_COLORS: Record<string, string> = {
  PASS: colors.pass,
  FAIL: colors.fail,
  ERROR: colors.error,
  RUNNING: colors.running,
};

const STACK_COLORS = {
  pass: colors.pass,
  fail: colors.fail,
  running: colors.running,
};

// ── Shared Styles ──────────────────────────────────────────

const cardStyle: React.CSSProperties = {
  fontFamily,
  background: colors.background,
  borderRadius: radius.xl,
  padding: spacing.lg,
  boxShadow: shadow.sm,
  border: `1px solid ${colors.borderSubtle}`,
};

const titleStyle: React.CSSProperties = {
  fontFamily,
  fontSize: 14,       // bodyMd
  fontWeight: 600,     // semibold
  color: colors.textSecondary,
  marginBottom: spacing.md,
  letterSpacing: '0.01em',  // label
};

const gridStyle: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(420px, 1fr))',
  gap: spacing.lg,
  padding: spacing.lg,
};

const headerStyle: React.CSSProperties = {
  fontFamily,
  fontSize: 20,        // h3
  fontWeight: 600,
  color: colors.text,
  padding: `${spacing.lg}px ${spacing.lg}px 0`,
};

// ── Custom Tooltip ─────────────────────────────────────────

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{
      fontFamily,
      background: colors.background,
      border: `1px solid ${colors.borderSubtle}`,
      borderRadius: radius.lg,
      padding: `${spacing.sm}px ${spacing.md}px`,
      fontSize: 14,
      boxShadow: shadow.md,
    }}>
      {label && <div style={{ fontWeight: 700, marginBottom: spacing.xs / 2, color: colors.text, fontSize: 14 }}>{label}</div>}
      {payload.map((p: any, i: number) => (
        <div key={i} style={{ color: p.color, lineHeight: 1.6, fontWeight: 500 }}>
          {p.name}: <strong>{p.value}</strong>
        </div>
      ))}
    </div>
  );
};

// ── Recharts shared tick style ─────────────────────────────

const tickStyle = { fontFamily, fontSize: 11, fontWeight: 500, fill: colors.textSecondary };
const legendStyle = { fontFamily, fontSize: 12, fontWeight: 600, color: colors.textSecondary };
const pieLabelStyle = { fontFamily, fontSize: 12, fontWeight: 600, fill: colors.text };

// ── 1. Pipeline Overview (Donut) ───────────────────────────

function PipelineOverviewChart() {
  const { data, isLoading } = useSignoffPipeline();
  if (isLoading || !data) return <ChartSkeleton />;

  const total = data.reduce((s, d) => s + d.task_count, 0);

  return (
    <div style={cardStyle}>
      <div style={titleStyle}>Pipeline Overview</div>
      <ResponsiveContainer width="100%" height={280}>
        <PieChart>
          <Pie
            data={data}
            dataKey="task_count"
            nameKey="stage"
            cx="50%"
            cy="50%"
            innerRadius={50}
            outerRadius={85}
            paddingAngle={2}
            label={({ stage, task_count, x, y, textAnchor }) => (
              <text x={x} y={y} textAnchor={textAnchor} style={pieLabelStyle}>
                {PIPELINE_LABELS[stage] ?? stage} ({task_count})
              </text>
            )}
            labelLine={{ strokeWidth: 1 }}
          >
            {data.map((entry) => (
              <Cell
                key={entry.stage}
                fill={PIPELINE_COLORS[entry.stage] ?? colors.na}
              />
            ))}
          </Pie>
          <Tooltip content={<CustomTooltip />} isAnimationActive={false} cursor={{ fill: 'rgba(0, 0, 0, 0.04)' }} />
        </PieChart>
      </ResponsiveContainer>
      <div style={{ textAlign: 'center', fontSize: 12, color: colors.textMuted }}>
        Total: {total} tasks
      </div>
    </div>
  );
}

// ── 2. Launcher Status (Pie) ───────────────────────────────

function LauncherStatusChart() {
  const { data, isLoading } = useLauncherStatus();
  if (isLoading || !data) return <ChartSkeleton />;

  return (
    <div style={cardStyle}>
      <div style={titleStyle}>Launcher Status Distribution</div>
      <ResponsiveContainer width="100%" height={280}>
        <PieChart>
          <Pie
            data={data}
            dataKey="task_count"
            nameKey="status"
            cx="50%"
            cy="50%"
            outerRadius={85}
            label={({ status, task_count, x, y, textAnchor }) => (
              <text x={x} y={y} textAnchor={textAnchor} style={pieLabelStyle}>
                {status} ({task_count})
              </text>
            )}
            labelLine={{ strokeWidth: 1 }}
          >
            {data.map((entry) => (
              <Cell
                key={entry.status}
                fill={STATUS_COLORS[entry.status] ?? colors.na}
              />
            ))}
          </Pie>
          <Tooltip content={<CustomTooltip />} isAnimationActive={false} cursor={{ fill: 'rgba(0, 0, 0, 0.04)' }} />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}

// ── 3. Review Progress (Gauge) ─────────────────────────────

function ReviewProgressChart() {
  const { data, isLoading } = useReviewProgress();
  if (isLoading || !data?.length) return <ChartSkeleton />;

  const progress = data[0];
  const gaugeData = [
    { name: 'Waiver', value: progress.waiver_pct, fill: colors.pass },
  ];

  return (
    <div style={cardStyle}>
      <div style={titleStyle}>Review Waiver Progress</div>
      <ResponsiveContainer width="100%" height={280}>
        <RadialBarChart
          cx="50%"
          cy="50%"
          innerRadius="60%"
          outerRadius="90%"
          startAngle={180}
          endAngle={0}
          data={gaugeData}
        >
          <RadialBar
            dataKey="value"
            cornerRadius={radiusPx.lg}
            background={{ fill: colors.surfaceHover }}
          />
        </RadialBarChart>
      </ResponsiveContainer>
      <div style={{ textAlign: 'center', marginTop: -60 }}>
        <div style={{ fontFamily, fontSize: 36, fontWeight: 700, color: colors.text }}>
          {progress.waiver_pct}%
        </div>
        <div style={{ fontFamily, fontSize: 12, color: colors.textSecondary, marginTop: spacing.xs / 2 }}>
          {progress.total_waiver.toLocaleString()} / {progress.total_items.toLocaleString()} items waived
        </div>
        <div style={{ fontFamily, fontSize: 11, color: colors.textMuted, marginTop: 2 }}>
          Pending: {progress.total_pending.toLocaleString()} | Fixed: {progress.total_fixed.toLocaleString()}
        </div>
      </div>
    </div>
  );
}

// ── 4. Daily Trend (Area) ──────────────────────────────────

function DailyTrendChart() {
  const { data, isLoading } = useDailyTrend();
  if (isLoading || !data) return <ChartSkeleton />;

  const formatted = data.map((d) => ({
    ...d,
    run_date: d.run_date.slice(5), // "03-08" format
  }));

  return (
    <div style={cardStyle}>
      <div style={titleStyle}>Daily Launcher Trend (Last 14 Days)</div>
      <ResponsiveContainer width="100%" height={280}>
        <AreaChart data={formatted}>
          <CartesianGrid strokeDasharray="3 3" stroke={colors.borderSubtle} />
          <XAxis dataKey="run_date" tick={tickStyle} tickLine={false} />
          <YAxis tick={tickStyle} tickLine={false} axisLine={false} />
          <Tooltip content={<CustomTooltip />} isAnimationActive={false} cursor={{ fill: 'rgba(0, 0, 0, 0.04)' }} />
          <Legend iconType="circle" iconSize={8} wrapperStyle={legendStyle} />
          <Area
            type="monotone"
            dataKey="pass_count"
            name="Pass"
            stackId="1"
            stroke={colors.pass}
            fill={colors.pass}
            fillOpacity={0.6}
          />
          <Area
            type="monotone"
            dataKey="fail_count"
            name="Fail"
            stackId="1"
            stroke={colors.fail}
            fill={colors.fail}
            fillOpacity={0.6}
          />
          <Area
            type="monotone"
            dataKey="running_count"
            name="Running"
            stackId="1"
            stroke={colors.running}
            fill={colors.running}
            fillOpacity={0.6}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

// ── 5. Cell Summary (Stacked Bar) ──────────────────────────

function CellSummaryChart() {
  const { data, isLoading } = useCellSummary();
  if (isLoading || !data) return <ChartSkeleton />;

  return (
    <div style={cardStyle}>
      <div style={titleStyle}>Cell-wise Status Summary</div>
      <ResponsiveContainer width="100%" height={280}>
        <BarChart data={data} layout="vertical">
          <CartesianGrid strokeDasharray="3 3" stroke={colors.borderSubtle} horizontal={false} />
          <XAxis type="number" tick={tickStyle} tickLine={false} />
          <YAxis type="category" dataKey="cellname" tick={tickStyle} tickLine={false} width={70} />
          <Tooltip content={<CustomTooltip />} isAnimationActive={false} cursor={{ fill: 'rgba(0, 0, 0, 0.04)' }} />
          <Legend iconType="circle" iconSize={8} wrapperStyle={legendStyle} />
          <Bar dataKey="pass_count" name="Pass" stackId="a" fill={STACK_COLORS.pass} radius={[0, 0, 0, 0]} />
          <Bar dataKey="fail_count" name="Fail" stackId="a" fill={STACK_COLORS.fail} />
          <Bar dataKey="running_count" name="Running" stackId="a" fill={STACK_COLORS.running} radius={[0, radiusPx.sm, radiusPx.sm, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

// ── 6. Owner Workload (Horizontal Bar) ─────────────────────

function OwnerWorkloadChart() {
  const { data, isLoading } = useOwnerWorkload();
  if (isLoading || !data) return <ChartSkeleton />;

  return (
    <div style={cardStyle}>
      <div style={titleStyle}>Owner Workload</div>
      <ResponsiveContainer width="100%" height={280}>
        <BarChart data={data} layout="vertical">
          <CartesianGrid strokeDasharray="3 3" stroke={colors.borderSubtle} horizontal={false} />
          <XAxis type="number" tick={tickStyle} tickLine={false} />
          <YAxis type="category" dataKey="owner" tick={tickStyle} tickLine={false} width={70} />
          <Tooltip content={<CustomTooltip />} isAnimationActive={false} cursor={{ fill: 'rgba(0, 0, 0, 0.04)' }} />
          <Legend iconType="circle" iconSize={8} wrapperStyle={legendStyle} />
          <Bar dataKey="pass_count" name="Pass" stackId="a" fill={STACK_COLORS.pass} />
          <Bar dataKey="fail_count" name="Fail" stackId="a" fill={STACK_COLORS.fail} />
          <Bar dataKey="running_count" name="Running" stackId="a" fill={STACK_COLORS.running} radius={[0, radiusPx.sm, radiusPx.sm, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

// ── Loading Skeleton ───────────────────────────────────────

function ChartSkeleton() {
  return (
    <div style={{ ...cardStyle, display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 340 }}>
      <div style={{ color: colors.textMuted, fontSize: 12 }}>Loading...</div>
    </div>
  );
}

// ── Main Dashboard ─────────────────────────────────────────

export default function SignoffDashboard() {
  return (
    <div style={{ fontFamily, background: colors.surface, minHeight: '100vh' }}>
      <div style={headerStyle}>Signoff Dashboard</div>
      <div style={{ fontFamily, padding: `${spacing.xs / 2}px ${spacing.lg}px 0`, fontSize: 14, color: colors.textSecondary }}>
        Aggregated statistics across all signoff tasks
      </div>
      <div style={gridStyle}>
        <PipelineOverviewChart />
        <LauncherStatusChart />
        <ReviewProgressChart />
        <DailyTrendChart />
        <CellSummaryChart />
        <OwnerWorkloadChart />
      </div>
    </div>
  );
}
