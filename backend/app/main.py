import uuid
from fastapi import FastAPI, Request, APIRouter
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
from app.config import settings
from app.common.errors import AppError, InternalError

from app.api.v1.auth import router as auth_router
from app.api.v1.trips import router as trips_router
from app.api.v1.zones import router as zones_router
from app.api.v1.locations import router as locations_router
from app.api.v1.identity import router as identity_router
from app.api.v1.users import router as users_router
from app.api.v1.sos import router as sos_router
from app.api.v1.incidents import router as incidents_router
from app.api.v1.facilities import router as facilities_router
from app.api.v1.risk import router as risk_router
from app.api.v1.analytics import router as analytics_router
from app.api.v1.system import router as system_router
from app.api.v1.voice import router as voice_router
from app.api.v1 import blockchain
from app.core.redis import init_redis, close_redis
from app.services.sweeper import start_scheduler
from app.services.anchor_batcher import start_anchor_batcher
from contextlib import asynccontextmanager

def run_db_migrations():
    try:
        import os
        from alembic.config import Config
        from alembic import command
        base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
        alembic_ini_path = os.path.join(base_dir, "alembic.ini")
        if os.path.exists(alembic_ini_path):
            alembic_cfg = Config(alembic_ini_path)
            alembic_cfg.set_main_option("script_location", os.path.join(base_dir, "alembic"))
            if settings.sync_database_url:
                alembic_cfg.set_main_option("sqlalchemy.url", settings.sync_database_url)
            command.upgrade(alembic_cfg, "head")
            logger.info("Database migrations applied successfully on startup!")
    except Exception as e:
        logger.warning(f"Database auto-migration warning: {e}")

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    run_db_migrations()
    await init_redis()
    start_scheduler()
    start_anchor_batcher()
    yield
    # Shutdown
    await close_redis()

from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    openapi_url=f"{settings.API_V1_STR}/openapi.json",
    lifespan=lifespan
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

api_router = APIRouter()
api_router.include_router(system_router, prefix="/system", tags=["system"])
api_router.include_router(blockchain.router, prefix="/blockchain", tags=["blockchain"])

app.include_router(api_router, prefix=settings.API_V1_STR)

app.include_router(auth_router, prefix=settings.API_V1_STR)
app.include_router(trips_router, prefix=f"{settings.API_V1_STR}/trips", tags=["trips"])
app.include_router(zones_router, prefix=f"{settings.API_V1_STR}/zones", tags=["zones"])
app.include_router(locations_router, prefix=f"{settings.API_V1_STR}/locations", tags=["locations"])
app.include_router(identity_router, prefix=f"{settings.API_V1_STR}/identity", tags=["identity"])
app.include_router(users_router, prefix=f"{settings.API_V1_STR}/users", tags=["users"])
app.include_router(sos_router, prefix=f"{settings.API_V1_STR}/sos", tags=["sos"])
app.include_router(incidents_router, prefix=f"{settings.API_V1_STR}/incidents", tags=["incidents"])
app.include_router(facilities_router, prefix=f"{settings.API_V1_STR}/facilities", tags=["facilities"])
app.include_router(risk_router, prefix=f"{settings.API_V1_STR}/risk", tags=["risk"])
app.include_router(analytics_router, prefix=f"{settings.API_V1_STR}/analytics", tags=["analytics"])
app.include_router(system_router, prefix=f"{settings.API_V1_STR}/system", tags=["system"])
app.include_router(voice_router, prefix=f"{settings.API_V1_STR}/voice", tags=["voice"])

# --- Global Exception Handlers ---

@app.exception_handler(AppError)
async def app_error_handler(request: Request, exc: AppError):
    # Retrieve request ID if set by middleware, otherwise generate one for the error
    request_id = getattr(request.state, "request_id", str(uuid.uuid4()))
    return JSONResponse(
        status_code=exc.status_code,
        content=exc.to_dict(request_id)
    )

@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    request_id = getattr(request.state, "request_id", str(uuid.uuid4()))
    details = [{"field": ".".join(map(str, err["loc"])), "issue": err["msg"]} for err in exc.errors()]
    
    error_dict = {
        "error": {
            "code": "VALIDATION_FAILED",
            "message": "Request body failed validation",
            "details": details,
            "requestId": request_id,
            "retryable": False
        }
    }
    return JSONResponse(status_code=400, content=error_dict)

@app.exception_handler(HTTPException)
async def http_exception_handler(request: Request, exc: HTTPException):
    request_id = getattr(request.state, "request_id", str(uuid.uuid4()))
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "detail": str(exc.detail),
            "error": {
                "code": "HTTP_ERROR",
                "message": str(exc.detail),
                "details": [],
                "requestId": request_id,
                "retryable": False
            }
        }
    )

import logging
logger = logging.getLogger(__name__)

@app.exception_handler(Exception)
async def unhandled_exception_handler(request: Request, exc: Exception):
    logger.exception(f"Unhandled exception during {request.method} {request.url.path}: {exc}")
    request_id = getattr(request.state, "request_id", str(uuid.uuid4()))
    err_msg = f"{type(exc).__name__}: {str(exc)}"
    return JSONResponse(
        status_code=500,
        content={
            "error": {
                "code": "INTERNAL_ERROR",
                "message": err_msg,
                "details": [],
                "requestId": request_id,
                "retryable": True
            }
        }
    )

# --- Middleware ---
@app.middleware("http")
async def add_request_id_and_correlation(request: Request, call_next):
    # Basic request ID generation
    request_id = str(uuid.uuid4())
    request.state.request_id = request_id
    
    # Correlation ID (passed by client or generated)
    correlation_id = request.headers.get("X-Correlation-Id", request_id)
    request.state.correlation_id = correlation_id
    
    # Execute route
    response = await call_next(request)
    
    # Add correlation ID to response headers
    response.headers["X-Correlation-Id"] = correlation_id
    return response

# --- Basic Health Check ---
@app.get("/health")
async def health_check():
    return {"status": "ok", "version": settings.VERSION}

# Wrap the FastAPI application with Socket.IO ASGI App
from app.core.socket import sio
import socketio
socket_app = socketio.ASGIApp(socketio_server=sio, other_asgi_app=app)
