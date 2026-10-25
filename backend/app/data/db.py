import clickhouse_connect
from app.config import get_settings

settings = get_settings()
_client = None


def get_clickhouse_client():
    global _client
    if _client is None:
        _client = clickhouse_connect.get_client(
            host=settings.CLICKHOUSE_HOST,
            port=settings.CLICKHOUSE_PORT,
            username=settings.CLICKHOUSE_USER,
            password=settings.CLICKHOUSE_PASSWORD,
            database=settings.CLICKHOUSE_DB,
        )
    return _client


def init_db():
    client = get_clickhouse_client()

    client.command("""
    CREATE TABLE IF NOT EXISTS actual_data (
        start_time DateTime64(0, 'UTC'),
        publish_time DateTime64(0, 'UTC'),
        settlement_date Date,
        settlement_period UInt8,
        fuel_type LowCardinality(String),
        generation_mw Float64
    ) ENGINE = ReplacingMergeTree()
    ORDER BY (fuel_type, start_time)
    """)

    client.command("""
    CREATE TABLE IF NOT EXISTS forecast_data (
        start_time DateTime64(0, 'UTC'),
        publish_time DateTime64(0, 'UTC'),
        generation_mw Float64
    ) ENGINE = ReplacingMergeTree()
    ORDER BY (start_time, publish_time)
    """)

    client.command("""
    CREATE TABLE IF NOT EXISTS calculated_aggregates (
        start_time DateTime64(0, 'UTC'),
        series_name LowCardinality(String),
        generation_mw Float64
    ) ENGINE = ReplacingMergeTree()
    ORDER BY (series_name, start_time)
    """)
