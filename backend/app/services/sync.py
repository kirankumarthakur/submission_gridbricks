from datetime import datetime
from app.data.db import get_clickhouse_client
from app.services.elexon import get_fuelhh, get_windfor


async def sync_fuelhh(date_from, date_to, fuel_type="WIND"):
    records = await get_fuelhh(
        settlement_date_from=date_from,
        settlement_date_to=date_to,
        fuel_type=fuel_type,
    )

    dedup = {}
    for r in records:
        if r["generation"] is not None and (not fuel_type or r["fuelType"].upper() == fuel_type.upper()):
            key = (r["startTime"], r["fuelType"].upper())
            if key not in dedup or (r.get("publishTime") and r["publishTime"] > dedup[key].get("publishTime", "")):
                dedup[key] = r

    rows = [
        [
            datetime.fromisoformat(r["startTime"]),
            datetime.fromisoformat(r["publishTime"]) if r.get("publishTime") else datetime.fromisoformat(r["startTime"]),
            datetime.strptime(r["settlementDate"], "%Y-%m-%d").date(),
            r["settlementPeriod"],
            r["fuelType"].upper(),
            float(r["generation"]),
        ]
        for r in dedup.values()
    ]

    if rows:
        get_clickhouse_client().insert(
            table="actual_data",
            data=rows,
            column_names=[
                "start_time",
                "publish_time",
                "settlement_date",
                "settlement_period",
                "fuel_type",
                "generation_mw",
            ],
        )

    return len(rows)


async def sync_windfor(publish_from, publish_to):
    records = await get_windfor(
        publish_from=publish_from,
        publish_to=publish_to,
    )

    dedup = {}
    for r in records:
        if r["generation"] is not None:
            key = (r["startTime"], r["publishTime"])
            dedup[key] = r

    rows = [
        [
            datetime.fromisoformat(r["startTime"]),
            datetime.fromisoformat(r["publishTime"]),
            float(r["generation"]),
        ]
        for r in dedup.values()
    ]

    if rows:
        get_clickhouse_client().insert(
            table="forecast_data",
            data=rows,
            column_names=[
                "start_time",
                "publish_time",
                "generation_mw",
            ],
        )

    return len(rows)
