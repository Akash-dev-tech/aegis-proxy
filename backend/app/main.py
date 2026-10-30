import asyncio
import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from app.config import settings
from app.routers.proxy import router as proxy_router
from app.routers.shield import router as shield_router
from app.vault import vault

# Silence library loggers that could log prompt words in debug mode
logging.getLogger("presidio-analyzer").setLevel(logging.INFO)
logging.getLogger("presidio-anonymizer").setLevel(logging.INFO)
logging.getLogger("spacy").setLevel(logging.INFO)

logger = logging.getLogger("aegis.main")


async def purge_vault_task():
    """Background task to periodically purge expired vault entries every 60 seconds."""
    while True:
        try:
            await asyncio.sleep(60)
            purged = vault.clear_expired()
            if purged > 0:
                logger.info(f"Purged {purged} expired vault sessions")
        except asyncio.CancelledError:
            break
        except Exception as e:
            logger.error(f"Error during vault purge: {type(e).__name__}")


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Ensure log level integrity across process lifetime
    logging.getLogger("presidio-analyzer").setLevel(logging.INFO)
    logging.getLogger("presidio-anonymizer").setLevel(logging.INFO)
    logging.getLogger("spacy").setLevel(logging.INFO)

    # Refuse to start if insecure defaults are detected in production
    settings.validate_production_readiness()

    # Start background cleanup task
    cleanup_task = asyncio.create_task(purge_vault_task())
    try:
        yield
    finally:
        cleanup_task.cancel()
        try:
            await cleanup_task
        except asyncio.CancelledError:
            pass


app = FastAPI(
    title="Aegis Proxy",
    description="Reversible PII Pseudonymization & Threat Firewall",
    version="1.0.0",
    lifespan=lifespan,
)

# CORS configuration restricted strictly to ALLOWED_ORIGINS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    """Custom validation error handler that strictly avoids logging or echoing

    raw request bodies or sensitive input values.
    """
    sanitized_errors = []
    for err in exc.errors():
        sanitized_errors.append(
            {
                "loc": err.get("loc"),
                "msg": err.get("msg"),
                "type": err.get("type"),
            }
        )
    return JSONResponse(
        status_code=422,
        content={
            "detail": "Validation error in request payload",
            "errors": sanitized_errors,
        },
    )


@app.get("/health")
async def health_check():
    return {
        "status": "ok",
        "spacy_model": "en_core_web_sm",
        "vault_active_sessions": vault.active_sessions_count,
    }


app.include_router(shield_router)
app.include_router(proxy_router)
