from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.database import Base, engine
from app.routes import users, trips, destination, maps

# Create DB tables
Base.metadata.create_all(bind=engine)

app = FastAPI(title="TripMate API", version="1.0")

# Add CORS middleware for mobile app
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Configure this properly in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Routers
app.include_router(users.router, prefix="/auth", tags=["Auth"])
app.include_router(trips.router, prefix="/trip", tags=["Trips"])
app.include_router(destination.router, prefix="/destinations", tags=["Destinations"])
app.include_router(maps.router, prefix="/map", tags=["Maps"])

@app.get("/")
def root():
    return {"message": "TripMate API is running 🚀"}
