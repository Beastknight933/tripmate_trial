from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app import models, schemas
from app.database import get_db
from passlib.hash import bcrypt
import logging

router = APIRouter()
logger = logging.getLogger(__name__)

@router.post("/signup", response_model=schemas.UserOut)
def signup(user: schemas.UserCreate, db: Session = Depends(get_db)):
  try:
        # Check if user already exists
        db_user = db.query(models.User).filter(models.User.email == user.email).first()
        if db_user:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST, 
                detail="Email already registered"
            )
        
        # Hash password and create user
        hashed_pw = bcrypt.hash(user.password)
        db_user = models.User(
            name=user.name, 
            email=user.email, 
            password=hashed_pw
        )
        
        db.add(db_user)
        db.commit()
        db.refresh(db_user)
        
        logger.info(f"New user created: {user.email}")
        return db_user
        
  except HTTPException:
        raise
  except Exception as e:
        logger.error(f"Error creating user: {str(e)}")
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error creating user"
        )

@router.post("/login")
def login(user: schemas.UserLogin, db: Session = Depends(get_db)):
  try:
        # Find user by email
        db_user = db.query(models.User).filter(models.User.email == user.email).first()
        
        if not db_user or not bcrypt.verify(user.password, db_user.password):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST, 
                detail="Invalid credentials"
            )
        
        logger.info(f"User logged in: {user.email}")
        return {
            "message": "Login successful", 
            "user_id": db_user.id,
            "name": db_user.name,
            "email": db_user.email
        }
        
  except HTTPException:
        raise
  except Exception as e:
        logger.error(f"Error during login: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error during login"
        )

@router.get("/profile/{user_id}", response_model=schemas.UserOut)
def get_profile(user_id: int, db: Session = Depends(get_db)):
    db_user = db.query(models.User).filter(models.User.id == user_id).first()
    if not db_user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, 
            detail="User not found"
        )
    return db_user
