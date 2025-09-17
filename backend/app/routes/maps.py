from fastapi import APIRouter, Query, HTTPException, status
import requests
import os
import logging

router = APIRouter()
logger = logging.getLogger(__name__)

MAPMYINDIA_KEY = os.getenv("MAPMYINDIA_KEY", "demo-api-key")

@router.get("/search")
def search(query: str = Query(..., min_length=1)):
    try:
        url = "https://atlas.mapmyindia.com/api/places/search/json"
        headers = {"Authorization": f"Bearer {MAPMYINDIA_KEY}"}
        params = {"query": query}
        
        response = requests.get(url, headers=headers, params=params, timeout=10)
        
        if response.status_code == 401:
            logger.error("MapMyIndia API authentication failed")
            return {"error": "Map service authentication failed", "results": []}
        
        response.raise_for_status()
        return response.json()
        
    except requests.RequestException as e:
        logger.error(f"Map search API error: {str(e)}")
        return {"error": "Map search service unavailable", "results": []}
    except Exception as e:
        logger.error(f"Unexpected error in map search: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error searching locations"
        )

@router.get("/nearby")
def nearby(lat: float, lng: float, type: str = Query(default="fuel", regex="^[a-zA-Z_]+$")):
    try:
        url = "https://atlas.mapmyindia.com/api/places/nearby/json"
        headers = {"Authorization": f"Bearer {MAPMYINDIA_KEY}"}
        params = {"keywords": type, "refLocation": f"{lat},{lng}"}
        
        response = requests.get(url, headers=headers, params=params, timeout=10)
        
        if response.status_code == 401:
            logger.error("MapMyIndia API authentication failed")
            return {"error": "Map service authentication failed", "results": []}
        
        response.raise_for_status()
        return response.json()
        
    except requests.RequestException as e:
        logger.error(f"Nearby places API error: {str(e)}")
        return {"error": "Nearby places service unavailable", "results": []}
    except Exception as e:
        logger.error(f"Unexpected error in nearby search: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error finding nearby places"
        )

@router.get("/directions")
def get_directions(
    start_lat: float,
    start_lng: float,
    end_lat: float,
    end_lng: float,
    mode: str = Query(default="driving", regex="^(driving|walking|cycling)$")
):
    try:
        # This is a placeholder for directions API
        # You'll need to implement with actual MapMyIndia directions API
        return {
            "message": "Directions API not implemented yet",
            "start": {"lat": start_lat, "lng": start_lng},
            "end": {"lat": end_lat, "lng": end_lng},
            "mode": mode
        }
    except Exception as e:
        logger.error(f"Error getting directions: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error getting directions"
        )
