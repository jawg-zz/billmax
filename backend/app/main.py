from contextlib import asynccontextmanager

from fastapi import FastAPI, Response
from fastapi.middleware.cors import CORSMiddleware

from app.api.v1.router import api_router
from app.config import settings
from app.database import engine
from app.models import *  # noqa: F401,F403
from app.logging_config import get_logger

logger = get_logger("main")


def _validate_not_default(name: str, value: str, default_substring: str):
    """Log a critical warning if a setting still has its default value."""
    if default_substring in value.lower():
        logger.critical(
            "%s is still set to the default value '%s...' — update it in .env for production",
            name, value[:40],
        )


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Validate critical security settings at startup
    _validate_not_default("SECRET_KEY", settings.SECRET_KEY, "change-me")
    _validate_not_default("JWT_SECRET", settings.JWT_SECRET, "change-me")
    if settings.SENTRY_DSN:
        try:
            import sentry_sdk
            sentry_sdk.init(dsn=settings.SENTRY_DSN, traces_sample_rate=0.1)
            logger.info("Sentry initialized")
        except ImportError:
            logger.warning("Sentry DSN set but sentry_sdk not installed")

    # Load DB-persisted settings (admin-configured) on startup.
    try:
        from sqlalchemy import select
        from app.models.settings import OrgSettings
        async with engine.connect() as conn:
            result = await conn.execute(select(OrgSettings).limit(1))
            row = result.scalar_one_or_none()
            if row and row.config:
                settings.load_from_db(row.config)
                logger.info("DB settings loaded")
    except Exception:
        logger.warning("DB not ready yet — using env defaults")
        pass  # DB not ready yet or table doesn't exist — use env defaults

    yield


app = FastAPI(
    title=settings.APP_NAME,
    version="0.1.0",
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(api_router)


@app.get("/health")
async def health():
    import time
    from sqlalchemy import text
    from app.database import async_session
    db_ok = False
    try:
        async with async_session() as conn:
            await conn.execute(text("SELECT 1"))
        db_ok = True
    except Exception:
        pass
    return {
        "status": "ok" if db_ok else "degraded",
        "app": settings.APP_NAME,
        "database": "connected" if db_ok else "error",
        "timestamp": time.time(),
    }


try:
    from prometheus_client import generate_latest, CONTENT_TYPE_LATEST
    from prometheus_client import Counter, Histogram
    REQUEST_COUNT = Counter("http_requests_total", "Total HTTP requests", ["method", "endpoint"])
    REQUEST_LATENCY = Histogram("http_request_duration_seconds", "HTTP request latency", ["method", "endpoint"])

    @app.middleware("http")
    async def metrics_middleware(request, call_next):
        import time
        start = time.time()
        response = await call_next(request)
        duration = time.time() - start
        REQUEST_COUNT.labels(method=request.method, endpoint=request.url.path).inc()
        REQUEST_LATENCY.labels(method=request.method, endpoint=request.url.path).observe(duration)
        return response

    @app.get("/metrics")
    async def metrics():
        return Response(content=generate_latest(), media_type=CONTENT_TYPE_LATEST)
except ImportError:
    pass
