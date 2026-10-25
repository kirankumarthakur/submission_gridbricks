from datetime import date, datetime, timedelta
import numpy as np
import pandas as pd
from app.data.db import get_clickhouse_client


async def compute_and_store_aggregates(start_date: str, end_date: str):
    client = get_clickhouse_client()

    d_start_dt = f"{start_date} 00:00:00"
    d_end_dt = f"{end_date} 23:59:59"

    hist_start = (date.fromisoformat(start_date) - timedelta(days=7)).isoformat()
    d_from_dt = f"{hist_start} 00:00:00"
    d_to_dt = f"{end_date} 23:59:59"

    f_query = """
    SELECT start_time, publish_time, generation_mw
    FROM forecast_data
    WHERE start_time >= {d_from:DateTime}
      AND start_time <= {d_to:DateTime}
    ORDER BY start_time ASC, publish_time DESC
    """
    f_rows = client.query(f_query, parameters={"d_from": d_from_dt, "d_to": d_to_dt}).result_rows

    if not f_rows:
        return

    a_query = """
    SELECT start_time, generation_mw
    FROM actual_data
    WHERE settlement_date >= {d_from:Date}
      AND settlement_date <= {d_to:Date}
      AND fuel_type = 'WIND'
    ORDER BY start_time ASC, publish_time DESC
    LIMIT 1 BY start_time
    """
    a_rows = client.query(a_query, parameters={"d_from": hist_start, "d_to": end_date}).result_rows

    df_f = pd.DataFrame(f_rows, columns=["start_time", "publish_time", "generation_mw"])
    df_f["start_time"] = pd.to_datetime(df_f["start_time"])
    df_f["publish_time"] = pd.to_datetime(df_f["publish_time"])
    df_f["lead_hours"] = (df_f["start_time"] - df_f["publish_time"]).dt.total_seconds() / 3600.0

    actual_map = {}
    if a_rows:
        for r in a_rows:
            st = pd.to_datetime(r[0])
            actual_map[st] = float(r[1])

    target_start = pd.to_datetime(f"{start_date} 00:00:00")
    target_end = pd.to_datetime(f"{end_date} 23:59:59")

    grouped = df_f.groupby("start_time")
    unique_times = sorted([t for t in grouped.groups.keys() if target_start <= t <= target_end])

    if not unique_times:
        return

    benchmark_means = {}
    for st, group in grouped:
        group_48c = group[(group["lead_hours"] >= 0) & (group["lead_hours"] <= 24)]
        val = group_48c["generation_mw"].mean() if len(group_48c) > 0 else group["generation_mw"].mean()
        if not np.isnan(val):
            benchmark_means[st] = float(val)

    overall_errors = []
    for st, act_val in actual_map.items():
        if st in benchmark_means and act_val > 0:
            overall_errors.append(benchmark_means[st] - act_val)
    global_bias = float(np.mean(overall_errors)) if len(overall_errors) >= 4 else 0.0

    rows_to_insert = []

    for st in unique_times:
        group = grouped.get_group(st)
        vals_all = group["generation_mw"].values
        lead_all = group["lead_hours"].values

        group_48c = group[(group["lead_hours"] >= 0) & (group["lead_hours"] <= 24)]
        vals_48c = group_48c["generation_mw"].values if len(group_48c) > 0 else vals_all

        group_3d = group[(group["lead_hours"] >= 0) & (group["lead_hours"] <= 72)]
        vals_3d = group_3d["generation_mw"].values if len(group_3d) > 0 else vals_all

        group_7d = group[(group["lead_hours"] >= 0) & (group["lead_hours"] <= 168)]
        vals_7d = group_7d["generation_mw"].values if len(group_7d) > 0 else vals_all

        mean_48c = float(np.mean(vals_48c))
        mean_3d = float(np.mean(vals_3d))
        mean_7d = float(np.mean(vals_7d))

        weights = np.exp(-0.05 * np.maximum(0.5, lead_all))
        best_fit = float(np.sum(vals_all * weights) / np.sum(weights)) if len(vals_all) > 0 else mean_48c

        delivered_errors = []
        for past_st, act_val in actual_map.items():
            if past_st < st and past_st in benchmark_means and act_val > 0:
                delivered_errors.append(benchmark_means[past_st] - act_val)

        if len(delivered_errors) >= 6:
            recent_bias = float(np.mean(delivered_errors[-48:]))
        else:
            recent_bias = global_bias

        calibrated = max(0.0, mean_48c - recent_bias)

        sigma = max(float(np.std(vals_all)), 0.12 * mean_48c)
        p10 = max(0.0, float(mean_48c - 1.28 * sigma))
        p90 = float(mean_48c + 1.28 * sigma)

        st_dt = st.to_pydatetime()
        rows_to_insert.append([st_dt, "AGG_MEAN_48C", mean_48c])
        rows_to_insert.append([st_dt, "AGG_MEAN_3D", mean_3d])
        rows_to_insert.append([st_dt, "AGG_MEAN_7D", mean_7d])
        rows_to_insert.append([st_dt, "AGG_BEST_FIT", best_fit])
        rows_to_insert.append([st_dt, "AGG_CALIBRATED", calibrated])
        rows_to_insert.append([st_dt, "AGG_P10", p10])
        rows_to_insert.append([st_dt, "AGG_P90", p90])

    if rows_to_insert:
        client.insert(
            table="calculated_aggregates",
            data=rows_to_insert,
            column_names=["start_time", "series_name", "generation_mw"],
        )
