from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app import models, schemas
from app.database import get_db
from datetime import datetime

router = APIRouter()

@router.post("/start", response_model=schemas.TripOut)
def start_trip(trip: schemas.TripCreate, user_id: int, db: Session = Depends(get_db)):
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
    return db_trip

@router.post("/stop")
def stop_trip(trip_id: int, db: Session = Depends(get_db)):
    db_trip = db.query(models.Trip).filter(models.Trip.id == trip_id).first()
    if not db_trip:
        raise HTTPException(status_code=404, detail="Trip not found")
    db_trip.status = "completed"
    db_trip.end_time = datetime.utcnow()
    db.commit()
    return {"message": "Trip stopped", "trip_id": db_trip.id}
