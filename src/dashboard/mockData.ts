// ============================================================
// Mock Data for Dashboard Charts
//
// DB 연결 후 이 파일은 더 이상 사용되지 않습니다.
// hooks.ts 에서 USE_MOCK = false 로 변경하면
// codegen-db 가 생성한 hook 으로 자동 전환됩니다.
// ============================================================

import type {
  DashboardVSignoffPipelineRow,
  DashboardVLauncherStatusRow,
  DashboardVReviewProgressRow,
  DashboardVDailyTrendRow,
  DashboardVCellSummaryRow,
  DashboardVOwnerWorkloadRow,
} from './types';

/** 1. Pipeline 단계별 요약 */
export const MOCK_SIGNOFF_PIPELINE: DashboardVSignoffPipelineRow[] = [
  { stage: 'launcher_fail', task_count: 23 },
  { stage: 'launcher_running', task_count: 8 },
  { stage: 'review_pending', task_count: 5 },
  { stage: 'review_in_progress', task_count: 34 },
  { stage: 'review_complete', task_count: 67 },
];

/** 2. Launcher 상태 분포 */
export const MOCK_LAUNCHER_STATUS: DashboardVLauncherStatusRow[] = [
  { status: 'PASS', task_count: 106 },
  { status: 'FAIL', task_count: 18 },
  { status: 'ERROR', task_count: 5 },
  { status: 'RUNNING', task_count: 8 },
];

/** 3. Review 전체 Waiver 진행률 */
export const MOCK_REVIEW_PROGRESS: DashboardVReviewProgressRow[] = [
  {
    total_pending: 142,
    total_fixed: 58,
    total_waiver: 823,
    total_items: 1023,
    waiver_pct: 80.4,
  },
];

/** 4. 일별 추이 (최근 14일) */
export const MOCK_DAILY_TREND: DashboardVDailyTrendRow[] = [
  { run_date: '2026-03-08', total_count: 12, pass_count: 8, fail_count: 3, running_count: 1 },
  { run_date: '2026-03-09', total_count: 15, pass_count: 11, fail_count: 4, running_count: 0 },
  { run_date: '2026-03-10', total_count: 18, pass_count: 14, fail_count: 3, running_count: 1 },
  { run_date: '2026-03-11', total_count: 9, pass_count: 6, fail_count: 2, running_count: 1 },
  { run_date: '2026-03-12', total_count: 22, pass_count: 18, fail_count: 3, running_count: 1 },
  { run_date: '2026-03-13', total_count: 14, pass_count: 10, fail_count: 4, running_count: 0 },
  { run_date: '2026-03-14', total_count: 20, pass_count: 16, fail_count: 3, running_count: 1 },
  { run_date: '2026-03-15', total_count: 11, pass_count: 8, fail_count: 2, running_count: 1 },
  { run_date: '2026-03-16', total_count: 16, pass_count: 13, fail_count: 2, running_count: 1 },
  { run_date: '2026-03-17', total_count: 25, pass_count: 20, fail_count: 4, running_count: 1 },
  { run_date: '2026-03-18', total_count: 19, pass_count: 15, fail_count: 3, running_count: 1 },
  { run_date: '2026-03-19', total_count: 13, pass_count: 10, fail_count: 2, running_count: 1 },
  { run_date: '2026-03-20', total_count: 17, pass_count: 14, fail_count: 2, running_count: 1 },
  { run_date: '2026-03-21', total_count: 10, pass_count: 7, fail_count: 1, running_count: 2 },
];

/** 5. Cell 별 상태 요약 */
export const MOCK_CELL_SUMMARY: DashboardVCellSummaryRow[] = [
  { cellname: 'CELL_A', pass_count: 32, fail_count: 5, running_count: 2, total_count: 39 },
  { cellname: 'CELL_B', pass_count: 28, fail_count: 4, running_count: 1, total_count: 33 },
  { cellname: 'CELL_C', pass_count: 21, fail_count: 6, running_count: 3, total_count: 30 },
  { cellname: 'CELL_D', pass_count: 15, fail_count: 2, running_count: 1, total_count: 18 },
  { cellname: 'CELL_E', pass_count: 10, fail_count: 1, running_count: 1, total_count: 12 },
];

/** 6. Owner 별 업무량 */
export const MOCK_OWNER_WORKLOAD: DashboardVOwnerWorkloadRow[] = [
  { owner: 'kim.jh', total_tasks: 28, pass_count: 22, fail_count: 4, running_count: 2 },
  { owner: 'lee.sy', total_tasks: 24, pass_count: 19, fail_count: 3, running_count: 2 },
  { owner: 'park.ms', total_tasks: 22, pass_count: 18, fail_count: 3, running_count: 1 },
  { owner: 'choi.jw', total_tasks: 18, pass_count: 14, fail_count: 3, running_count: 1 },
  { owner: 'jung.hs', total_tasks: 15, pass_count: 12, fail_count: 2, running_count: 1 },
  { owner: 'hwang.dk', total_tasks: 12, pass_count: 9, fail_count: 2, running_count: 1 },
];
