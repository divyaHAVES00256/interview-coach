# security checkpoint : every protected route passes through this file first
# checks whether incoming request already belongs to a logged-in user.
from fastapi import Depends, HTTPException, Request, status
from sqlalchemy.orm import Session
from jose import JWTError

from app.db.database import get_db
from app.core.security import decode_token
from app.models.user import User


async def get_current_user(
    request: Request,
    db: Session = Depends(get_db),
) -> User:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},  
    )

    token: str | None = None

    #1 check authorization header first (set by Next.js BFF layer)
    auth_header = request.headers.get("Authorization")
    if auth_header and auth_header.startswith("Bearer "):
        token = auth_header[7:]  
    
    #2 fallback: check cookie (useful for direct API testing via browser/Swagger)
    if not token:
        token = request.cookies.get("access_token") #access token

    if not token:
        raise credentials_exception #raise error if no token accessed

    try:
        payload = decode_token(token) #decodes token data

        # reject refresh tokens being used as access tokens
        if payload.get("type") != "access":
            raise credentials_exception

        user_id_str: str | None = payload.get("sub")
        if user_id_str is None:
            raise credentials_exception

        user_id = int(user_id_str) 

    except (JWTError, ValueError, TypeError):
        # jwt exception handling
        raise credentials_exception

    user = db.query(User).filter(User.id == user_id).first()

    if user is None:
        raise credentials_exception  

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account is deactivated"
        )

    return user