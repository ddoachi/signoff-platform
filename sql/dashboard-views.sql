-- ============================================================
-- Dashboard Aggregation Views
-- Schema: dashboard
--
-- 이 뷰들은 signoff platform 의 전체 통계를 제공합니다.
-- codegen-db 로 생성된 hook 으로 데이터를 조회합니다.
-- ============================================================

CREATE SCHEMA IF NOT EXISTS dashboard;

-- signoff 유저에게 dashboard 스키마 및 향후 생성되는 모든 뷰 권한 부여
GRANT USAGE ON SCHEMA dashboard TO signoff;
ALTER DEFAULT PRIVILEGES IN SCHEMA dashboard GRANT SELECT ON TABLES TO signoff;

-- ────────────────────────────────────────────────────────────
-- 1. v_signoff_pipeline: 전체 Signoff Pipeline 단계별 요약
--    Chart: Donut / Pie
-- ────────────────────────────────────────────────────────────
CREATE OR REPLACE VIEW dashboard.v_signoff_pipeline AS
WITH review_progress AS (
  SELECT
    p.taskid,
    SUM(p.pending + p.fixed + p.waiver) AS total_items,
    SUM(p.waiver) AS total_waiver,
    CASE
      WHEN SUM(p.pending + p.fixed + p.waiver) > 0
        THEN ROUND(SUM(p.waiver)::numeric / SUM(p.pending + p.fixed + p.waiver) * 100, 1)
      ELSE 0
    END AS waiver_pct
  FROM sorv.progress p
  GROUP BY p.taskid
)
SELECT
  CASE
    WHEN sol.status IN ('FAIL', 'ERROR') THEN 'launcher_fail'
    WHEN sol.status = 'RUNNING'          THEN 'launcher_running'
    WHEN sol.status = 'PASS' AND rp.total_items IS NULL THEN 'review_pending'
    WHEN sol.status = 'PASS' AND rp.waiver_pct < 100   THEN 'review_in_progress'
    WHEN sol.status = 'PASS' AND rp.waiver_pct = 100   THEN 'review_complete'
    ELSE 'unknown'
  END AS stage,
  COUNT(*) AS task_count
FROM public.signoff_task st
JOIN sol.task sol ON st.sol_task_id = sol.id
LEFT JOIN sorv.task sorv ON st.sorv_task_id = sorv.id
LEFT JOIN review_progress rp ON sorv.id = rp.taskid
GROUP BY stage;


-- ────────────────────────────────────────────────────────────
-- 2. v_launcher_status: Launcher 실행 상태 분포
--    Chart: Pie
-- ────────────────────────────────────────────────────────────
CREATE OR REPLACE VIEW dashboard.v_launcher_status AS
SELECT
  sol.status,
  COUNT(*) AS task_count
FROM public.signoff_task st
JOIN sol.task sol ON st.sol_task_id = sol.id
GROUP BY sol.status;


-- ────────────────────────────────────────────────────────────
-- 3. v_review_progress: Review 전체 Waiver 진행률
--    Chart: RadialBar (Gauge)
-- ────────────────────────────────────────────────────────────
CREATE OR REPLACE VIEW dashboard.v_review_progress AS
SELECT
  SUM(p.pending)                        AS total_pending,
  SUM(p.fixed)                          AS total_fixed,
  SUM(p.waiver)                         AS total_waiver,
  SUM(p.pending + p.fixed + p.waiver)   AS total_items,
  CASE
    WHEN SUM(p.pending + p.fixed + p.waiver) > 0
      THEN ROUND(SUM(p.waiver)::numeric / SUM(p.pending + p.fixed + p.waiver) * 100, 1)
    ELSE 0
  END AS waiver_pct
FROM sorv.progress p
JOIN sorv.task st ON p.taskid = st.id
JOIN public.signoff_task sot ON sot.sorv_task_id = st.id;


-- ────────────────────────────────────────────────────────────
-- 4. v_daily_trend: 일별 Launcher 실행 추이
--    Chart: Area / Line
-- ────────────────────────────────────────────────────────────
CREATE OR REPLACE VIEW dashboard.v_daily_trend AS
SELECT
  CAST(sol.starttime AS date)                                    AS run_date,
  COUNT(*)                                                       AS total_count,
  COUNT(*) FILTER (WHERE sol.status = 'PASS')                    AS pass_count,
  COUNT(*) FILTER (WHERE sol.status IN ('FAIL', 'ERROR'))        AS fail_count,
  COUNT(*) FILTER (WHERE sol.status = 'RUNNING')                 AS running_count
FROM public.signoff_task st
JOIN sol.task sol ON st.sol_task_id = sol.id
WHERE sol.starttime IS NOT NULL
GROUP BY CAST(sol.starttime AS date)
ORDER BY run_date;


-- ────────────────────────────────────────────────────────────
-- 5. v_cell_summary: Cell 별 상태 요약
--    Chart: Stacked Bar
-- ────────────────────────────────────────────────────────────
CREATE OR REPLACE VIEW dashboard.v_cell_summary AS
SELECT
  sol.cellname,
  COUNT(*) FILTER (WHERE sol.status = 'PASS')                    AS pass_count,
  COUNT(*) FILTER (WHERE sol.status IN ('FAIL', 'ERROR'))        AS fail_count,
  COUNT(*) FILTER (WHERE sol.status = 'RUNNING')                 AS running_count,
  COUNT(*)                                                       AS total_count
FROM public.signoff_task st
JOIN sol.task sol ON st.sol_task_id = sol.id
WHERE sol.cellname IS NOT NULL
GROUP BY sol.cellname
ORDER BY total_count DESC;


-- ────────────────────────────────────────────────────────────
-- 6. v_owner_workload: Owner 별 업무량
--    Chart: Horizontal Bar
-- ────────────────────────────────────────────────────────────
CREATE OR REPLACE VIEW dashboard.v_owner_workload AS
SELECT
  sol.owner,
  COUNT(*)                                                       AS total_tasks,
  COUNT(*) FILTER (WHERE sol.status = 'PASS')                    AS pass_count,
  COUNT(*) FILTER (WHERE sol.status IN ('FAIL', 'ERROR'))        AS fail_count,
  COUNT(*) FILTER (WHERE sol.status = 'RUNNING')                 AS running_count
FROM public.signoff_task st
JOIN sol.task sol ON st.sol_task_id = sol.id
WHERE sol.owner IS NOT NULL
GROUP BY sol.owner
ORDER BY total_tasks DESC;


-- ────────────────────────────────────────────────────────────
-- 기존 뷰에 대한 SELECT 권한 부여
-- (ALTER DEFAULT PRIVILEGES 는 향후 생성분만 적용되므로)
-- ────────────────────────────────────────────────────────────
GRANT SELECT ON ALL TABLES IN SCHEMA dashboard TO signoff;
