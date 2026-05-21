from pydantic import BaseModel, EmailStr, field_validator, ConfigDict
from datetime import datetime

# POST /api/v1/auth/register (register schema)
class UserCreate(BaseModel):
    name: str
    email: EmailStr  
    password: str

    # field_validator runs BEFORE the model is created
    @field_validator("password")
    @classmethod
    def password_min_length(cls, v: str) -> str:
        if len(v) < 8:
            raise ValueError("Password must be at least 8 characters long")
        return v

    @field_validator("name")
    @classmethod
    def name_not_empty(cls, v: str) -> str:
        if not v.strip():
            raise ValueError("Name cannot be empty")
        return v.strip()  # remove accidental leading/trailing spaces

# POST /login (login schema)
class UserLogin(BaseModel):
    email: EmailStr
    password: str

# (this schema controls what frontend receives)
class UserResponse(BaseModel):
    id: int
    name: str
    email: str
    is_active: bool
    created_at: datetime

    model_config = ConfigDict(from_attributes=True) # pydantic expect dict while sqlalc return obj

# response shape after login/register
# frontend's store them as httpOnly cookies
class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    user: UserResponse