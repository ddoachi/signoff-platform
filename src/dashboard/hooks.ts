// ============================================================
// Dashboard Data Hooks
//
// Mock ↔ Real 전환 방법:
//   1. USE_MOCK = false 로 변경
//   2. codegen-db 가 생성한 hook import 주석 해제
//   3. 이 파일의 mock import 제거
//
// codegen-db 가 생성하는 hook 이름 규칙:
//   dashboard.v_signoff_pipeline → useDashboardVSignoffPipelineList()
// ============================================================

import { useMemo } from 'react';
import type {
  DashboardVSignoffPipelineRow,
  DashboardVLauncherStatusRow,
  DashboardVReviewProgressRow,
  DashboardVDailyTrendRow,
  DashboardVCellSummaryRow,
  DashboardVOwnerWorkloadRow,
} from './types';
import {
  MOCK_SIGNOFF_PIPELINE,
  MOCK_LAUNCHER_STATUS,
  MOCK_REVIEW_PROGRESS,
  MOCK_DAILY_TREND,
  MOCK_CELL_SUMMARY,
  MOCK_OWNER_WORKLOAD,
} from './mockData';

// ──────────────────────────────────────────────────────────
// ★ DB 연결 후 false 로 변경
// ──────────────────────────────────────────────────────────
const USE_MOCK = true;

// ──────────────────────────────────────────────────────────
// ★ DB 연결 후 아래 import 주석 해제
// ──────────────────────────────────────────────────────────
// import {
//   useDashboardVSignoffPipelineList,
//   useDashboardVLauncherStatusList,
//   useDashboardVReviewProgressList,
//   useDashboardVDailyTrendList,
//   useDashboardVCellSummaryList,
//   useDashboardVOwnerWorkloadList,
// } from '@/generated/db/hooks';

/** Mock 데이터를 React Query 호환 형태로 감싸는 helper */
function useMockQuery<T>(data: T) {
  return useMemo(
    () => ({ data, isLoading: false, isError: false, error: null }),
    [],
  );
}

/** 1. Pipeline 단계별 요약 */
export function useSignoffPipeline() {
  const mock = useMockQuery<DashboardVSignoffPipelineRow[]>(MOCK_SIGNOFF_PIPELINE);
  if (USE_MOCK) return mock;
  // return useDashboardVSignoffPipelineList();
  return mock; // fallback — 위 주석 해제 후 이 줄 제거
}

/** 2. Launcher 상태 분포 */
export function useLauncherStatus() {
  const mock = useMockQuery<DashboardVLauncherStatusRow[]>(MOCK_LAUNCHER_STATUS);
  if (USE_MOCK) return mock;
  // return useDashboardVLauncherStatusList();
  return mock;
}

/** 3. Review Waiver 진행률 */
export function useReviewProgress() {
  const mock = useMockQuery<DashboardVReviewProgressRow[]>(MOCK_REVIEW_PROGRESS);
  if (USE_MOCK) return mock;
  // return useDashboardVReviewProgressList();
  return mock;
}

/** 4. 일별 추이 */
export function useDailyTrend() {
  const mock = useMockQuery<DashboardVDailyTrendRow[]>(MOCK_DAILY_TREND);
  if (USE_MOCK) return mock;
  // return useDashboardVDailyTrendList();
  return mock;
}

/** 5. Cell 별 상태 */
export function useCellSummary() {
  const mock = useMockQuery<DashboardVCellSummaryRow[]>(MOCK_CELL_SUMMARY);
  if (USE_MOCK) return mock;
  // return useDashboardVCellSummaryList();
  return mock;
}

/** 6. Owner 별 업무량 */
export function useOwnerWorkload() {
  const mock = useMockQuery<DashboardVOwnerWorkloadRow[]>(MOCK_OWNER_WORKLOAD);
  if (USE_MOCK) return mock;
  // return useDashboardVOwnerWorkloadList();
  return mock;
}
