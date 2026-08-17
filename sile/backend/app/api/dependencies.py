import uuid
from typing import AsyncGenerator
from fastapi import Depends
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import AuthenticationFailedException, ForbiddenOperationException
from app.core.security import decode_token
from app.db.session import get_db
from app.models.user import User
from app.services.auth_service import AuthService

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/v1/auth/login")


async def get_current_user(
    token: str = Depends(oauth2_scheme),
    db: AsyncSession = Depends(get_db),
) -> User:
    payload = decode_token(token)
    user_id_str: str = payload.get("sub")
    if not user_id_str:
        raise AuthenticationFailedException("Invalid token payload: missing subject identifier.")

    try:
        user_uuid = uuid.UUID(user_id_str)
    except ValueError:
        raise AuthenticationFailedException("Invalid subject identifier in token.")

    user = await AuthService.get_user_by_id(db, user_uuid)
    if not user:
        raise AuthenticationFailedException("User not found or session revoked.")

    if not user.is_active:
        raise ForbiddenOperationException("Account is deactivated.")

    return user
