import uuid
from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
from app.config import settings
from app.common.errors import AppError, InternalError

from app.api.v1.auth import router as auth_router
from app.api.v1.trips import router as trips_router
from app.api.v1.zones import router as zones_router
from app.api.v1.locations import router as locations_router
from app.core.redis import init_redis, close_redis
from contextlib import asynccontextmanager

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    await init_redis()
    yield
    # Shutdown
    await close_redis()

app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    openapi_url=f"{settings.API_V1_STR}/openapi.json",
    lifespan=lifespan
)

app.include_router(auth_router, prefix=settings.API_V1_STR)
app.include_router(trips_router, prefix=f"{settings.API_V1_STR}/trips", tags=["trips"])
app.include_router(zones_router, prefix=f"{settings.API_V1_STR}/zones", tags=["zones"])
app.include_router(locations_router, prefix=f"{settings.API_V1_STR}/locations", tags=["locations"])

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

@app.exception_handler(Exception)
async def unhandled_exception_handler(request: Request, exc: Exception):
    # Log the full traceback here in production
    request_id = getattr(request.state, "request_id", str(uuid.uuid4()))
    internal_error = InternalError(message="An unexpected error occurred.")
    return JSONResponse(
        status_code=internal_error.status_code,
        content=internal_error.to_dict(request_id)
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
