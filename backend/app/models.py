from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey, Enum, Index
from sqlalchemy.orm import relationship
from datetime import datetime
from app.database import Base
import enum

class TransportMode(str, enum.Enum):
    bike = "bike"
    car = "car"
    train = "train"
    metro = "metro"
    walk = "walk"

class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    email = Column(String, unique=True, index=True, nullable=False)
    password = Column(String, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    trips = relationship("Trip", back_populates="user")

    # Add index for email lookups
    __table_args__ = (
        Index('idx_user_email', 'email'),
    )

class Trip(Base):
    __tablename__ = "trips"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    mode = Column(Enum(TransportMode), nullable=False)
    start_time = Column(DateTime, default=datetime.utcnow)
    end_time = Column(DateTime, nullable=True)
    status = Column(String, default="active")
    start_lat = Column(Float, nullable=True)
    start_lng = Column(Float, nullable=True)
    end_lat = Column(Float, nullable=True)
    end_lng = Column(Float, nullable=True)

    user = relationship("User", back_populates="trips")
    destinations = relationship("Destination", back_populates="trip", cascade="all, delete-orphan")

    # Add indexes for common queries
    __table_args__ = (
        Index('idx_trip_user_status', 'user_id', 'status'),
        Index('idx_trip_start_time', 'start_time'),
    )

class Destination(Base):
    __tablename__ = "destinations"
    id = Column(Integer, primary_key=True, index=True)
    trip_id = Column(Integer, ForeignKey("trips.id", ondelete="CASCADE"), nullable=False)
    name = Column(String, nullable=False)
    lat = Column(Float, nullable=False)
    lng = Column(Float, nullable=False)
    visited_at = Column(DateTime, default=datetime.utcnow)

    trip = relationship("Trip", back_populates="destinations")

    # Add index for trip lookups
    __table_args__ = (
        Index('idx_destination_trip', 'trip_id'),
    )

