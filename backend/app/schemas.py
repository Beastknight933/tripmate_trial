from pydantic import BaseModel, EmailStr, validator
from datetime import datetime
from typing import Optional
from app.models import TransportMode

class UserCreate(BaseModel):
    name: str
    email: EmailStr
    password: str

    @validator('name')
    def name_must_not_be_empty(cls, v):
        if not v.strip():
            raise ValueError('Name cannot be empty')
        return v.strip()

    @validator('password')
    def password_length(cls, v):
        if len(v) < 6:
            raise ValueError('Password must be at least 6 characters')
        return v

class UserOut(BaseModel):
    id: int
    name: str
    email: EmailStr
    created_at: datetime
    
    class Config:
        orm_mode = True

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class TripBase(BaseModel):
    mode: TransportMode
    start_lat: Optional[float] = None
    start_lng: Optional[float] = None

class TripCreate(TripBase):
    pass

class TripOut(TripBase):
    id: int
    user_id: int
    status: str
    start_time: datetime
    end_time: Optional[datetime] = None
    end_lat: Optional[float] = None
    end_lng: Optional[float] = None
    
    class Config:
        orm_mode = True

class TripStop(BaseModel):
    end_lat: Optional[float] = None
    end_lng: Optional[float] = None

class DestinationCreate(BaseModel):
    name: str
    lat: float
    lng: float

    @validator('name')
    def name_must_not_be_empty(cls, v):
        if not v.strip():
            raise ValueError('Destination name cannot be empty')
        return v.strip()

class DestinationOut(DestinationCreate):
    id: int
    trip_id: int
    visited_at: datetime
    
    class Config:
        orm_mode = True
