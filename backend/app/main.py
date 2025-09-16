from fastapi import FastAPI
from app.database import Base, engine
from app.routes import users, trips, destinations, maps

# Create DB tables
Base.metadata.create_all(bind=engine)

app = FastAPI(title="TripMate API", version="1.0")

# Routers
app.include_router(users.router, prefix="/auth", tags=["Auth"])
app.include_router(trips.router, prefix="/trip", tags=["Trips"])
app.include_router(destinations.router, prefix="/destinations", tags=["Destinations"])
app.include_router(maps.router, prefix="/map", tags=["Maps"])

@app.get("/")
def root():
    return {"message": "TripMate API is running 🚀"}
