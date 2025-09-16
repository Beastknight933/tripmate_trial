from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app import models, schemas
from app.database import get_db
from typing import List
import logging

router = APIRouter()
logger = logging.getLogger(__name__)

@router.post("/{trip_id}/add", response_model=schemas.DestinationOut)
def add_destination(trip_id: int, dest: schemas.DestinationCreate, db: Session = Depends(get_db)):
    try:
        # Verify trip exists
        trip = db.query(models.Trip).filter(models.Trip.id == trip_id).first()
        if not trip:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Trip not found"
            )
        
        # Create destination
        db_dest = models.Destination(
            trip_id=trip_id, 
            name=dest.name, 
            lat=dest.lat, 
            lng=dest.lng
        )
        
        db.add(db_dest)
        db.commit()
        db.refresh(db_dest)
        
        logger.info(f"Destination added to trip {trip_id}: {dest.name}")
        return db_dest
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error adding destination: {str(e)}")
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error adding destination"
        )

@router.get("/{trip_id}/list", response_model=List[schemas.DestinationOut])
def list_destinations(trip_id: int, db: Session = Depends(get_db)):
    # Verify trip exists
    trip = db.query(models.Trip).filter(models.Trip.id == trip_id).first()
    if not trip:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Trip not found"
        )
    
    destinations = db.query(models.Destination).filter(
        models.Destination.trip_id == trip_id
    ).order_by(models.Destination.visited_at.asc()).all()
    
    return destinations

@router.delete("/{destination_id}")
def delete_destination(destination_id: int, db: Session = Depends(get_db)):
    try:
        destination = db.query(models.Destination).filter(
            models.Destination.id == destination_id
        ).first()
        
        if not destination:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Destination not found"
            )
        
        db.delete(destination)
        db.commit()
        
        logger.info(f"Destination deleted: {destination_id}")
        return {"message": "Destination deleted successfully"}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting destination: {str(e)}")
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error deleting destination"
        )
