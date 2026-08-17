import logging
from fastapi import FastAPI, Request, status, HTTPException
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from sqlalchemy.exc import SQLAlchemyError

from app.core.exceptions import SileException

logger = logging.getLogger("sile.backend")


def register_exception_handlers(app: FastAPI) -> None:
    @app.exception_handler(SileException)
    async def sile_exception_handler(request: Request, exc: SileException):
        return JSONResponse(
            status_code=exc.status_code,
            content={
                "success": False,
                "error": {
                    "code": exc.__class__.__name__,
                    "message": exc.message,
                    "details": exc.details,
                },
            },
        )

    @app.exception_handler(RequestValidationError)
    async def validation_exception_handler(request: Request, exc: RequestValidationError):
        # Format user-friendly validation error details
        formatted_errors = []
        for err in exc.errors():
            loc = " -> ".join(str(l) for l in err.get("loc", []) if l != "body")
            msg = err.get("msg", "Invalid value")
            formatted_errors.append({"field": loc, "message": msg})

        first_msg = formatted_errors[0]["message"] if formatted_errors else "Invalid request data"
        if formatted_errors and formatted_errors[0]["field"]:
            first_msg = f"{formatted_errors[0]['field']}: {first_msg}"

        return JSONResponse(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            content={
                "success": False,
                "error": {
                    "code": "ValidationError",
                    "message": first_msg,
                    "details": formatted_errors,
                },
            },
        )

    @app.exception_handler(HTTPException)
    async def http_exception_handler(request: Request, exc: HTTPException):
        return JSONResponse(
            status_code=exc.status_code,
            content={
                "success": False,
                "error": {
                    "code": "HttpError",
                    "message": exc.detail if isinstance(exc.detail, str) else "An HTTP error occurred",
                    "details": exc.detail if isinstance(exc.detail, dict) else {},
                },
            },
        )

    @app.exception_handler(SQLAlchemyError)
    async def db_exception_handler(request: Request, exc: SQLAlchemyError):
        # Log internal database error without leaking SQL/tables to client
        logger.error(f"Database error on {request.method} {request.url.path}: {exc}", exc_info=True)
        return JSONResponse(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            content={
                "success": False,
                "error": {
                    "code": "DatabaseError",
                    "message": "A database operation error occurred. Please try again later.",
                    "details": {},
                },
            },
        )

    @app.exception_handler(Exception)
    async def generic_exception_handler(request: Request, exc: Exception):
        logger.error(f"Unhandled exception on {request.method} {request.url.path}: {exc}", exc_info=True)
        return JSONResponse(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            content={
                "success": False,
                "error": {
                    "code": "InternalServerError",
                    "message": "An unexpected server error occurred. Please try again later.",
                    "details": {},
                },
            },
        )
