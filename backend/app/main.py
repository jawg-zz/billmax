from contextlib import asynccontextmanager

from fastapi import FastAPI, Response
from fastapi.middleware.cors import CORSMiddleware

from app.api.v1.router import api_router
from app.config import settings


@asynccontextmanager
async def lifespan(app: FastAPI):
    if settings.SENTRY_DSN:
        try:
            import sentry_sdk
            sentry_sdk.init(dsn=settings.SENTRY_DSN, traces_sample_rate=0.1)
        except ImportError:
            pass
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
    return {"status": "ok", "app": settings.APP_NAME}


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
