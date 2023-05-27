# auth.py
from typing import Annotated, Optional
from fastapi import Depends, Header, HTTPException, status, FastAPI, Request
from fastapi.security import HTTPBasic, HTTPBearer, HTTPAuthorizationCredentials, HTTPBasicCredentials, OAuth2PasswordBearer, OAuth2PasswordRequestForm
from jose import jwt, JWTError
from passlib.context import CryptContext
from pydantic import BaseModel
from typing import Optional
from datetime import datetime, timedelta

security = HTTPBasic()
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token") 
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
service_accounts_db = {
    "service_account1": {
        "username": "service_account1",
        "hashed_password": "$2b$12$PVjpmnkR9nCLf0nqKOZH8.cr.9h1xYMcHLE3puIP2GLzWA6uEdTgC",  # Hashed password: "password"
    }
}
SECRET_KEY = "your-secret-key"
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30

class TokenData(BaseModel):
    username: Optional[str] = None

def hash_password():
    password = "password"
    hashed_password = pwd_context.hash(password)
    return(hashed_password)

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    to_encode = {"sub": data["username"]}
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=15)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt


async def verify_token(authorization: str = Header(...)):
    token = authorization.split("Bearer ")[1]
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        username = payload.get("sub")
        if username is None:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid authentication credentials",
                headers={"WWW-Authenticate": "Bearer"},
            )
    except JWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )

    user = service_accounts_db.get(username)
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )

    return user

def authenticate_service_account(username: str, password: str):
    # You can store service_account data somewhere else, in a database for example

    if username in service_accounts_db and pwd_context.verify(password, service_accounts_db[username]["hashed_password"]):
        return service_accounts_db[username]
    else:
        return None


def get_current_username(
    credentials: Annotated[HTTPBasicCredentials, Depends(security)]
):
    current_username_bytes = credentials.username.encode("utf8")
    correct_username_bytes = b"stanleyjobson"
    is_correct_username = secrets.compare_digest(
        current_username_bytes, correct_username_bytes
    )
    current_password_bytes = credentials.password.encode("utf8")
    correct_password_bytes = b"swordfish"
    is_correct_password = secrets.compare_digest(
        current_password_bytes, correct_password_bytes
    )
    if not (is_correct_username and is_correct_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Basic"},
        )
    return credentials.username
