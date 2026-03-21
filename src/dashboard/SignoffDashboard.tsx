// ============================================================
// Signoff Dashboard — Aggregated Statistics
//
// 6개의 차트로 전체 signoff pipeline 상태를 한눈에 보여줍니다.
// recharts 라이브러리 필요: npm install recharts
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
  useSignoffPipeline,
  useLauncherStatus,
  useReviewProgress,
  useDailyTrend,
  useCellSummary,
  useOwnerWorkload,
} from './hooks';

// ── Color Palette ──────────────────────────────────────────

const PIPELINE_COLORS: Record<string, string> = {
  launcher_fail: '#ef4444',       // red
  launcher_running: '#f59e0b',    // amber
  review_pending: '#a78bfa',      // violet
  review_in_progress: '#3b82f6',  // blue
  review_complete: '#22c55e',     // green
  unknown: '#9ca3af',             // gray
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
  PASS: '#22c55e',
  FAIL: '#ef4444',
  ERROR: '#dc2626',
  RUNNING: '#f59e0b',
};

const STACK_COLORS = {
  pass: '#22c55e',
  fail: '#ef4444',
  running: '#f59e0b',
};

// ── Shared Styles ──────────────────────────────────────────

const cardStyle: React.CSSProperties = {
  background: '#fff',
  borderRadius: 12,
  padding: 24,
  boxShadow: '0 1px 3px rgba(0,0,0,0.08), 0 1px 2px rgba(0,0,0,0.06)',
  border: '1px solid #e5e7eb',
};

const titleStyle: React.CSSProperties = {
  fontSize: 14,
  fontWeight: 600,
  color: '#374151',
  marginBottom: 16,
  letterSpacing: '-0.01em',
};

const gridStyle: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(420px, 1fr))',
  gap: 20,
  padding: 20,
};

const headerStyle: React.CSSProperties = {
  fontSize: 20,
  fontWeight: 700,
  color: '#111827',
  padding: '20px 20px 0',
  letterSpacing: '-0.02em',
};

// ── Custom Tooltip ─────────────────────────────────────────

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{
      background: '#fff',
      border: '1px solid #e5e7eb',
      borderRadius: 8,
      padding: '8px 12px',
      fontSize: 12,
      boxShadow: '0 4px 6px rgba(0,0,0,0.07)',
    }}>
      {label && <div style={{ fontWeight: 600, marginBottom: 4 }}>{label}</div>}
      {payload.map((p: any, i: number) => (
        <div key={i} style={{ color: p.color, lineHeight: 1.6 }}>
          {p.name}: {p.value}
        </div>
      ))}
    </div>
  );
};

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
            innerRadius={60}
            outerRadius={100}
            paddingAngle={2}
            label={({ stage, task_count }) =>
              `${PIPELINE_LABELS[stage] ?? stage} (${task_count})`
            }
            labelLine={{ strokeWidth: 1 }}
          >
            {data.map((entry) => (
              <Cell
                key={entry.stage}
                fill={PIPELINE_COLORS[entry.stage] ?? '#9ca3af'}
              />
            ))}
          </Pie>
          <Tooltip content={<CustomTooltip />} />
        </PieChart>
      </ResponsiveContainer>
      <div style={{ textAlign: 'center', fontSize: 13, color: '#6b7280' }}>
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
            outerRadius={100}
            label={({ status, task_count }) => `${status} (${task_count})`}
            labelLine={{ strokeWidth: 1 }}
          >
            {data.map((entry) => (
              <Cell
                key={entry.status}
                fill={STATUS_COLORS[entry.status] ?? '#9ca3af'}
              />
            ))}
          </Pie>
          <Tooltip content={<CustomTooltip />} />
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
    { name: 'Waiver', value: progress.waiver_pct, fill: '#22c55e' },
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
            cornerRadius={8}
            background={{ fill: '#f3f4f6' }}
          />
        </RadialBarChart>
      </ResponsiveContainer>
      <div style={{ textAlign: 'center', marginTop: -60 }}>
        <div style={{ fontSize: 36, fontWeight: 700, color: '#111827' }}>
          {progress.waiver_pct}%
        </div>
        <div style={{ fontSize: 12, color: '#6b7280', marginTop: 4 }}>
          {progress.total_waiver.toLocaleString()} / {progress.total_items.toLocaleString()} items waived
        </div>
        <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 2 }}>
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
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis
            dataKey="run_date"
            tick={{ fontSize: 11 }}
            tickLine={false}
          />
          <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
          <Tooltip content={<CustomTooltip />} />
          <Legend
            iconType="circle"
            iconSize={8}
            wrapperStyle={{ fontSize: 12 }}
          />
          <Area
            type="monotone"
            dataKey="pass_count"
            name="Pass"
            stackId="1"
            stroke="#22c55e"
            fill="#22c55e"
            fillOpacity={0.6}
          />
          <Area
            type="monotone"
            dataKey="fail_count"
            name="Fail"
            stackId="1"
            stroke="#ef4444"
            fill="#ef4444"
            fillOpacity={0.6}
          />
          <Area
            type="monotone"
            dataKey="running_count"
            name="Running"
            stackId="1"
            stroke="#f59e0b"
            fill="#f59e0b"
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
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" horizontal={false} />
          <XAxis type="number" tick={{ fontSize: 11 }} tickLine={false} />
          <YAxis
            type="category"
            dataKey="cellname"
            tick={{ fontSize: 11 }}
            tickLine={false}
            width={70}
          />
          <Tooltip content={<CustomTooltip />} />
          <Legend
            iconType="circle"
            iconSize={8}
            wrapperStyle={{ fontSize: 12 }}
          />
          <Bar dataKey="pass_count" name="Pass" stackId="a" fill={STACK_COLORS.pass} radius={[0, 0, 0, 0]} />
          <Bar dataKey="fail_count" name="Fail" stackId="a" fill={STACK_COLORS.fail} />
          <Bar dataKey="running_count" name="Running" stackId="a" fill={STACK_COLORS.running} radius={[0, 4, 4, 0]} />
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
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" horizontal={false} />
          <XAxis type="number" tick={{ fontSize: 11 }} tickLine={false} />
          <YAxis
            type="category"
            dataKey="owner"
            tick={{ fontSize: 11 }}
            tickLine={false}
            width={70}
          />
          <Tooltip content={<CustomTooltip />} />
          <Legend
            iconType="circle"
            iconSize={8}
            wrapperStyle={{ fontSize: 12 }}
          />
          <Bar dataKey="pass_count" name="Pass" stackId="a" fill={STACK_COLORS.pass} />
          <Bar dataKey="fail_count" name="Fail" stackId="a" fill={STACK_COLORS.fail} />
          <Bar dataKey="running_count" name="Running" stackId="a" fill={STACK_COLORS.running} radius={[0, 4, 4, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

// ── Loading Skeleton ───────────────────────────────────────

function ChartSkeleton() {
  return (
    <div style={{ ...cardStyle, display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 340 }}>
      <div style={{ color: '#9ca3af', fontSize: 13 }}>Loading...</div>
    </div>
  );
}

// ── Main Dashboard ─────────────────────────────────────────

export default function SignoffDashboard() {
  return (
    <div style={{ background: '#f9fafb', minHeight: '100vh' }}>
      <div style={headerStyle}>Signoff Dashboard</div>
      <div style={{ padding: '4px 20px 0', fontSize: 13, color: '#6b7280' }}>
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
