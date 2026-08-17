from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api.v1.api_router import api_router
from app.core.config import settings
from app.core.handlers import register_exception_handlers
from app.db.base import Base
from app.db.session import engine, async_session_factory
from app.db.seeds.demo_seed import seed_all_demo_data


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Auto-create tables if not existing
    try:
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)
        # Auto-seed baseline math diagnostic questions and demo account
        async with async_session_factory() as session:
            await seed_all_demo_data(session)
    except Exception as e:
        print(f"Database initialization notice: {e}")
    yield


def create_application() -> FastAPI:
    application = FastAPI(
        title=settings.PROJECT_NAME,
        version="1.0.0",
        openapi_url=f"{settings.API_V1_STR}/openapi.json",
        docs_url=f"{settings.API_V1_STR}/docs",
        redoc_url=f"{settings.API_V1_STR}/redoc",
        lifespan=lifespan,
    )

    # Configure CORS for the React frontend
    if settings.BACKEND_CORS_ORIGINS:
        application.add_middleware(
            CORSMiddleware,
            allow_origins=[str(origin) for origin in settings.BACKEND_CORS_ORIGINS],
            allow_credentials=True,
            allow_methods=["*"],
            allow_headers=["*"],
        )

    # Register custom and global exception handlers
    register_exception_handlers(application)

    # Health-check endpoint: GET /api/health
    @application.get("/api/health", tags=["Health"])
    async def health_check():
        return {
            "status": "ok",
            "service": "sile-backend"
        }

    # Mount versioned API routes under /api/v1/
    application.include_router(api_router, prefix=settings.API_V1_STR)

    return application


app = create_application()
