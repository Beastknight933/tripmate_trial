from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app import models, schemas
from app.database import get_db

router = APIRouter()

@router.post("/{trip_id}/add", response_model=schemas.DestinationOut)
def add_destination(trip_id: int, dest: schemas.DestinationCreate, db: Session = Depends(get_db)):
    db_dest = models.Destination(
        trip_id=trip_id, name=dest.name, lat=dest.lat, lng=dest.lng
    )
    db.add(db_dest)
    db.commit()
    db.refresh(db_dest)
    return db_dest

@router.get("/{trip_id}/list", response_model=list[schemas.DestinationOut])
def list_destinations(trip_id: int, db: Session = Depends(get_db)):
    return db.query(models.Destination).filter(models.Destination.trip_id == trip_id).all()
