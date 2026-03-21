// ============================================================
// Dashboard View Row Types
//
// codegen-db 가 dashboard.v_* 뷰를 introspect 하면
// 아래와 동일한 타입이 자동 생성됩니다.
// 그 전까지는 이 파일의 타입을 사용합니다.
// ============================================================

/** 1. Pipeline 단계별 요약 */
export interface DashboardVSignoffPipelineRow {
  stage: string;
  task_count: number;
}

/** 2. Launcher 상태 분포 */
export interface DashboardVLauncherStatusRow {
  status: string;
  task_count: number;
}

/** 3. Review 전체 Waiver 진행률 */
export interface DashboardVReviewProgressRow {
  total_pending: number;
  total_fixed: number;
  total_waiver: number;
  total_items: number;
  waiver_pct: number;
}

/** 4. 일별 Launcher 실행 추이 */
export interface DashboardVDailyTrendRow {
  run_date: string;
  total_count: number;
  pass_count: number;
  fail_count: number;
  running_count: number;
}

/** 5. Cell 별 상태 요약 */
export interface DashboardVCellSummaryRow {
  cellname: string;
  pass_count: number;
  fail_count: number;
  running_count: number;
  total_count: number;
}

/** 6. Owner 별 업무량 */
export interface DashboardVOwnerWorkloadRow {
  owner: string;
  total_tasks: number;
  pass_count: number;
  fail_count: number;
  running_count: number;
}
