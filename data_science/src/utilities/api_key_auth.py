import os
from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.security import APIKeyHeader

API_KEY = os.getenv("DATA_SCIENCE_API_KEY")  # Get the API key from an environment variable
API_KEY_NAME = "X-API-KEY"

api_key_header = APIKeyHeader(name=API_KEY_NAME, auto_error=False)

async def get_api_key(api_key_header: str = Depends(api_key_header)):
    if api_key_header == API_KEY:
        return api_key_header
    else:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid API Key",
        )