import httpx
from app.config import get_settings

settings = get_settings()


async def get_fuelhh(
    settlement_date_from,
    settlement_date_to,
    fuel_type="WIND",
    publish_from=None,
    publish_to=None,
    settlement_period=None,
):
    url = f"{settings.ELEXON_BASE_URL.rstrip('/')}/FUELHH/stream"
    params = {
        "settlementDateFrom": settlement_date_from,
        "settlementDateTo": settlement_date_to,
    }

    if fuel_type:
        params["fuelType"] = fuel_type
    if publish_from:
        params["publishDateTimeFrom"] = publish_from
    if publish_to:
        params["publishDateTimeTo"] = publish_to
    if settlement_period:
        params["settlementPeriod"] = settlement_period

    async with httpx.AsyncClient(timeout=60.0) as client:
        res = await client.get(url, params=params)
        res.raise_for_status()
        return res.json()


async def get_windfor(publish_from, publish_to):
    url = f"{settings.ELEXON_BASE_URL.rstrip('/')}/WINDFOR/stream"
    params = {
        "publishDateTimeFrom": publish_from,
        "publishDateTimeTo": publish_to,
    }

    async with httpx.AsyncClient(timeout=60.0) as client:
        res = await client.get(url, params=params)
        res.raise_for_status()
        return res.json()