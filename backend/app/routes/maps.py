from fastapi import APIRouter, Query
import requests, os

router = APIRouter()

MAPMYINDIA_KEY = os.getenv("MAPMYINDIA_KEY", "demo-api-key")

@router.get("/search")
def search(query: str = Query(...)):
    url = f"https://atlas.mapmyindia.com/api/places/search/json"
    headers = {"Authorization": f"Bearer {MAPMYINDIA_KEY}"}
    params = {"query": query}
    r = requests.get(url, headers=headers, params=params)
    return r.json()

@router.get("/nearby")
def nearby(lat: float, lng: float, type: str = "fuel"):
    url = f"https://atlas.mapmyindia.com/api/places/nearby/json"
    headers = {"Authorization": f"Bearer {MAPMYINDIA_KEY}"}
    params = {"keywords": type, "refLocation": f"{lat},{lng}"}
    r = requests.get(url, headers=headers, params=params)
    return r.json()
