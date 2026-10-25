import asyncio
from datetime import date, timedelta
from app.data.db import get_clickhouse_client
from app.services.sync import sync_fuelhh, sync_windfor

lock = asyncio.Lock()
_synced_actual_days: set[date] = set()
_synced_forecast_dates: set[str] = set()


def get_synced_days(start_date, end_date, fuel="WIND"):
    client = get_clickhouse_client()
    query = """
    SELECT settlement_date
    FROM actual_data
    WHERE settlement_date >= {d_from:Date} 
      AND settlement_date <= {d_to:Date}
      AND fuel_type = {fuel:String}
    GROUP BY settlement_date
    HAVING count() >= 46
    """
    rows = client.query(
        query,
        parameters={"d_from": start_date, "d_to": end_date, "fuel": fuel},
    ).result_rows

    found = {row[0] for row in rows}
    _synced_actual_days.update(found)
    return found


def get_missing_ranges(start_date, end_date, synced):
    cur = date.fromisoformat(start_date)
    stop = date.fromisoformat(end_date)

    ranges = []
    chunk_start = None
    chunk_end = None

    while cur <= stop:
        if cur not in synced:
            if not chunk_start:
                chunk_start = cur
            chunk_end = cur
        elif chunk_start:
            ranges.append((chunk_start.isoformat(), chunk_end.isoformat()))
            chunk_start = None
            chunk_end = None
        cur += timedelta(days=1)

    if chunk_start:
        ranges.append((chunk_start.isoformat(), chunk_end.isoformat()))

    return ranges


def get_missing_forecast_days(start_date, end_date):
    client = get_clickhouse_client()
    query = """
    SELECT DISTINCT toDate(start_time)
    FROM forecast_data
    WHERE start_time >= {d_from:DateTime}
      AND start_time <= {d_to:DateTime}
    """
    rows = client.query(
        query,
        parameters={
            "d_from": f"{start_date} 00:00:00",
            "d_to": f"{end_date} 23:59:59",
        },
    ).result_rows
    existing_days = {r[0] for r in rows}
    _synced_forecast_dates.update(d.isoformat() for d in existing_days)

    cur = date.fromisoformat(start_date)
    stop = date.fromisoformat(end_date)
    missing = []
    while cur <= stop:
        if cur not in existing_days:
            missing.append(cur)
        cur += timedelta(days=1)
    return missing


async def autosync(start_date, end_date, fuel="WIND"):
    cur = date.fromisoformat(start_date)
    stop = date.fromisoformat(end_date)
    all_cached = True
    while cur <= stop:
        if cur not in _synced_actual_days or cur.isoformat() not in _synced_forecast_dates:
            all_cached = False
            break
        cur += timedelta(days=1)

    if all_cached:
        return

    synced_actual = get_synced_days(start_date, end_date, fuel)
    missing_actual = get_missing_ranges(start_date, end_date, synced_actual)
    missing_forecast = get_missing_forecast_days(start_date, end_date)

    if not missing_actual and not missing_forecast:
        return

    async with lock:
        if missing_actual:
            for d_from, d_to in missing_actual:
                await sync_fuelhh(date_from=d_from, date_to=d_to, fuel_type=fuel)

        if missing_forecast:
            min_miss = min(missing_forecast)
            max_miss = max(missing_forecast)
            sync_from = (min_miss - timedelta(days=1)).isoformat()
            sync_to = max_miss.isoformat()
            pub_from = f"{sync_from}T00:00:00Z"
            pub_to = f"{sync_to}T23:59:59Z"
            await sync_windfor(publish_from=pub_from, publish_to=pub_to)
