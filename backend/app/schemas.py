from pydantic import BaseModel, EmailStr
from datetime import datetime
from typing import Optional, List

class UserCreate(BaseModel):
    name: str
    email: EmailStr
    password: str

class UserOut(BaseModel):
    id: int
    name: str
    email: EmailStr
    class Config:
        orm_mode = True

class TripBase(BaseModel):
    mode: str
    start_lat: Optional[float]
    start_lng: Optional[float]

class TripCreate(TripBase):
    pass

class TripOut(TripBase):
    id: int
    status: str
    start_time: datetime
    end_time: Optional[datetime]
    class Config:
        orm_mode = True

class DestinationCreate(BaseModel):
    name: str
    lat: float
    lng: float

class DestinationOut(DestinationCreate):
    id: int
    class Config:
        orm_mode = True
