# # this file handles all cryptography: password hashing and JWT operations
# # security gaurd
# from datetime import datetime, timedelta, timezone
# from typing import Any
# from jose import JWTError, jwt
# from passlib.context import CryptContext
# from app.core.config import get_settings

# settings = get_settings()

# # bcrypt hashing algorithm
# pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# # plain pw -> bycrypt hash
# def hash_password(password: str) -> str:
#     return pwd_context.hash(password)

# # check if plain pw == stored hash
# def verify_password(plain_password: str, hashed_password: str) -> bool:
#     return pwd_context.verify(plain_password, hashed_password)

# # short lived
# def create_access_token(data: dict[str, Any]) -> str:
#     to_encode = data.copy()
#     expire = datetime.now(timezone.utc) + timedelta(
#         minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES
#     )
#     to_encode.update({
#         "exp": expire,
#         "type": "access",  #custom so we do not use refresh token as access token
#     })
#     return jwt.encode(to_encode, settings.JWT_SECRET_KEY, algorithm=settings.JWT_ALGORITHM)

# # long lived
# def create_refresh_token(data: dict[str, Any]) -> str:
#     to_encode = data.copy()
#     expire = datetime.now(timezone.utc) + timedelta(days=7)
#     to_encode.update({
#         "exp": expire,
#         "type": "refresh", #custom 
#     })
#     return jwt.encode(to_encode, settings.JWT_SECRET_KEY, algorithm=settings.JWT_ALGORITHM)

# # verifies token
# def decode_token(token: str) -> dict[str, Any]:
#     return jwt.decode(
#         token,
#         settings.JWT_SECRET_KEY,
#         algorithms=[settings.JWT_ALGORITHM]
#     )


from datetime import datetime, timedelta, timezone
from typing import Any
import bcrypt  # Using bcrypt directly — passlib has Windows compatibility issues
from jose import JWTError, jwt
from app.core.config import get_settings

settings = get_settings()


def hash_password(password: str) -> str:
    password_bytes = password.encode("utf-8")                  # str → bytes
    hashed_bytes = bcrypt.hashpw(password_bytes, bcrypt.gensalt())
    return hashed_bytes.decode("utf-8")                        # bytes → str for DB storage


def verify_password(plain_password: str, hashed_password: str) -> bool:
    return bcrypt.checkpw(
        plain_password.encode("utf-8"),     # str → bytes
        hashed_password.encode("utf-8"),    # str → bytes (from DB)
    )


def create_access_token(data: dict[str, Any]) -> str:
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + timedelta(
        minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES
    )
    to_encode.update({
        "exp": expire,
        "type": "access",
    })
    return jwt.encode(to_encode, settings.JWT_SECRET_KEY, algorithm=settings.JWT_ALGORITHM)


def create_refresh_token(data: dict[str, Any]) -> str:
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + timedelta(days=7)
    to_encode.update({
        "exp": expire,
        "type": "refresh",
    })
    return jwt.encode(to_encode, settings.JWT_SECRET_KEY, algorithm=settings.JWT_ALGORITHM)


def decode_token(token: str) -> dict[str, Any]:
    return jwt.decode(
        token,
        settings.JWT_SECRET_KEY,
        algorithms=[settings.JWT_ALGORITHM]
    )