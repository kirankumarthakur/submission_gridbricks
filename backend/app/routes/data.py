from fastapi import APIRouter, Query
from app.data.db import get_clickhouse_client
from app.services.autosync import autosync
from app.services.sync import sync_windfor
from app.services.analytics import compute_and_store_aggregates

router = APIRouter(prefix="/data", tags=["data"])


@router.get("/actual")
async def get_actual_data(
    start_date: str = Query("2026-01-01", description="Start date (YYYY-MM-DD)"),
    end_date: str = Query("2026-01-01", description="End date (YYYY-MM-DD)"),
):
    await autosync(start_date, end_date, fuel="WIND")

    client = get_clickhouse_client()
    query = """
    SELECT start_time, publish_time, settlement_date, settlement_period, fuel_type, generation_mw
    FROM actual_data
    WHERE settlement_date >= {d_from:Date}
      AND settlement_date <= {d_to:Date}
      AND fuel_type = 'WIND'
    ORDER BY start_time ASC, publish_time DESC
    LIMIT 1 BY start_time
    """
    result = client.query(query, parameters={"d_from": start_date, "d_to": end_date})
    return result.result_rows


@router.get("/vintages")
async def get_vintages(
    start_date: str = Query("2026-01-01", description="Start date (YYYY-MM-DD)"),
    end_date: str = Query("2026-01-01", description="End date (YYYY-MM-DD)"),
):
    await autosync(start_date, end_date, fuel="WIND")

    client = get_clickhouse_client()
    query = """
    SELECT DISTINCT publish_time
    FROM forecast_data
    WHERE start_time >= {d_from:DateTime}
      AND start_time <= {d_to:DateTime}
    ORDER BY publish_time DESC
    """
    result = client.query(
        query,
        parameters={
            "d_from": f"{start_date} 00:00:00",
            "d_to": f"{end_date} 23:59:59",
        },
    )
    return result.result_rows


@router.get("/forecast")
async def get_forecast_data(
    start_date: str = Query("2026-01-01", description="Start date (YYYY-MM-DD)"),
    end_date: str = Query("2026-01-01", description="End date (YYYY-MM-DD)"),
    publish_time: str | None = Query(None, description="Specific vintage publish_time"),
    vintages: list[str] = Query(None, description="Optional publish_time filter"),
    fetch_missing: bool = Query(False, description="Fetch from Elexon if vintage is missing"),
):
    await autosync(start_date, end_date, fuel="WIND")

    client = get_clickhouse_client()

    selected_vintages = list(vintages) if vintages else []
    if publish_time and publish_time not in selected_vintages:
        selected_vintages.append(publish_time)

    if fetch_missing and publish_time:
        clean_pub = publish_time.replace("T", " ")[:19]
        check = client.query(
            "SELECT 1 FROM forecast_data WHERE publish_time = {pub:DateTime} LIMIT 1",
            parameters={"pub": clean_pub},
        ).result_rows
        if len(check) == 0:
            pub_iso = clean_pub.replace(" ", "T") + "Z"
            await sync_windfor(publish_from=pub_iso, publish_to=pub_iso)

    params = {
        "d_from": f"{start_date} 00:00:00",
        "d_to": f"{end_date} 23:59:59",
    }

    if selected_vintages:
        params["vintages"] = selected_vintages
        query = """
        SELECT start_time, publish_time, generation_mw
        FROM forecast_data
        WHERE start_time >= {d_from:DateTime}
          AND start_time <= {d_to:DateTime}
          AND publish_time IN {vintages:Array(DateTime)}
        ORDER BY start_time ASC, publish_time DESC
        LIMIT 1 BY start_time, publish_time
        """
    else:
        query = """
        SELECT start_time, publish_time, generation_mw
        FROM forecast_data
        WHERE start_time >= {d_from:DateTime}
          AND start_time <= {d_to:DateTime}
        ORDER BY start_time ASC, publish_time DESC
        LIMIT 1 BY start_time, publish_time
        """

    result = client.query(query, parameters=params)
    f_rows = result.result_rows

    await compute_and_store_aggregates(start_date, end_date)

    agg_query = """
    SELECT start_time, series_name, generation_mw
    FROM calculated_aggregates
    WHERE start_time >= {d_from:DateTime}
      AND start_time <= {d_to:DateTime}
    ORDER BY start_time ASC
    LIMIT 1 BY start_time, series_name
    """
    agg_rows = client.query(agg_query, parameters={"d_from": params["d_from"], "d_to": params["d_to"]}).result_rows

    return f_rows + agg_rows
