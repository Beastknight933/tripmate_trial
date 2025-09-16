from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app import models, schemas
from app.database import get_db
from datetime import datetime
from typing import List
import logging

router = APIRouter()
logger = logging.getLogger(__name__)

@router.post("/start", response_model=schemas.TripOut)
def start_trip(trip: schemas.TripCreate, user_id: int, db: Session = Depends(get_db)):
    try:
        # Verify user exists
        user = db.query(models.User).filter(models.User.id == user_id).first()
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found"
            )
        
        # Check if user has an active trip
        active_trip = db.query(models.Trip).filter(
            models.Trip.user_id == user_id,
            models.Trip.status == "active"
        ).first()
        
        if active_trip:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="User already has an active trip"
            )
        
        # Create new trip
        db_trip = models.Trip(
            user_id=user_id,
            mode=trip.mode,
            start_lat=trip.start_lat,
            start_lng=trip.start_lng,
            status="active"
        )
        
        db.add(db_trip)
        db.commit()
        db.refresh(db_trip)
        
        logger.info(f"Trip started for user {user_id}: {db_trip.id}")
        return db_trip
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error starting trip: {str(e)}")
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error starting trip"
        )

@router.post("/stop/{trip_id}")
def stop_trip(trip_id: int, trip_data: schemas.TripStop, db: Session = Depends(get_db)):
    try:
        db_trip = db.query(models.Trip).filter(models.Trip.id == trip_id).first()
        if not db_trip:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, 
                detail="Trip not found"
            )
        
        if db_trip.status == "completed":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Trip already completed"
            )
        
        # Update trip
        db_trip.status = "completed"
        db_trip.end_time = datetime.utcnow()
        db_trip.end_lat = trip_data.end_lat
        db_trip.end_lng = trip_data.end_lng
        
        db.commit()
        
        logger.info(f"Trip stopped: {trip_id}")
        return {
            "message": "Trip stopped successfully", 
            "trip_id": db_trip.id,
            "duration_minutes": int((db_trip.end_time - db_trip.start_time).total_seconds() / 60)
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error stopping trip: {str(e)}")
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error stopping trip"
        )

@router.get("/user/{user_id}", response_model=List[schemas.TripOut])
def get_user_trips(user_id: int, db: Session = Depends(get_db)):
    # Verify user exists
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    trips = db.query(models.Trip).filter(
        models.Trip.user_id == user_id
    ).order_by(models.Trip.start_time.desc()).all()
    
    return trips

@router.get("/active/{user_id}", response_model=schemas.TripOut)
def get_active_trip(user_id: int, db: Session = Depends(get_db)):
    active_trip = db.query(models.Trip).filter(
        models.Trip.user_id == user_id,
        models.Trip.status == "active"
    ).first()
    
    if not active_trip:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No active trip found"
        )
    
    return active_trip
