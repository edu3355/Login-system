from fastapi import FastAPI, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from passlib.context import CryptContext
import httpx
import os
from dotenv import load_dotenv
from supabase import create_client, Client
from jose import JWTError, jwt
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from datetime import datetime, timedelta

load_dotenv()

app = FastAPI()

# CORS 미들웨어 추가
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # 프로덕션에서는 특정 도메인만 허용하세요
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_API_KEY = os.getenv("SUPABASE_API_KEY")
SECRET_KEY = os.getenv("SECRET_KEY")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30

missing_vars = []
if not SUPABASE_URL:
    missing_vars.append("SUPABASE_URL")
if not SUPABASE_API_KEY:
    missing_vars.append("SUPABASE_API_KEY")
if not SECRET_KEY:
    missing_vars.append("SECRET_KEY")
if missing_vars:
    raise Exception(f'다음 환경 변수가 설정되지 않았습니다: {', '.join(missing_vars)}')

supabase: Client = create_client(SUPABASE_URL, SUPABASE_API_KEY)
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="login")

class UserCreate(BaseModel):
    username: str
    password: str
    password_verify: str

class UserLogin(BaseModel):
    username: str
    password: str

class UserSignout(BaseModel):
    password: str

headers = {
    "apikey": SUPABASE_API_KEY,
    "Authorization": f"Bearer {SUPABASE_API_KEY}",
    "Content-Type": "application/json"
}

def create_access_token(data: dict):
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

async def get_current_user(token: str = Depends(oauth2_scheme)):
    credentials_exception = HTTPException(
        status_code=401,
        detail="Could not validate credentials.",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        username: str = payload.get("sub")
        if username is None:
            raise credentials_exception
    except JWTError as e:
        raise credentials_exception from e
    async with httpx.AsyncClient() as client:
        response = await client.get(
            f"{SUPABASE_URL}/rest/v1/users",
            params={"username": f"eq.{username}", "select": "*"},
            headers=headers
        )
        users = response.json()
        if not users:
            raise credentials_exception
        return users[0]

@app.get("/")
def root():
    print('API is running.')
    return {"message": "API is running."}

@app.post("/signup")
async def signup(user: UserCreate):
    if user.password != user.password_verify:
        raise HTTPException(status_code=400, detail="Passwords do not match.")
    
    hashed_password = pwd_context.hash(user.password)

    async with httpx.AsyncClient() as client:
        check = await client.get(
            f"{SUPABASE_URL}/rest/v1/users",
            params={
                "username": f"eq.{user.username}",
                "select": "*"
            },
            headers=headers
        )
        if check.json():
            raise HTTPException(status_code=400, detail="Username already exists.")
        
        response = await client.post(
            f"{SUPABASE_URL}/rest/v1/users",
            json={"username": user.username, "password": hashed_password},
            headers=headers
        )

        if response.status_code != 201:
            raise HTTPException(status_code=500, detail="Failed to register user.")
        
    return {"message": "User registered successfully."}

@app.post("/login")
async def login(form_data: OAuth2PasswordRequestForm = Depends()):
    async with httpx.AsyncClient() as client:
        response = await client.get(
            f"{SUPABASE_URL}/rest/v1/users",
            params={"username": f"eq.{form_data.username}"},
            headers=headers
        )
        users = response.json()
        if not users:
            raise HTTPException(status_code=401, detail="Invalid credentials.")
        
        db_user = users[0]
        if not pwd_context.verify(form_data.password, db_user["password"]):
            raise HTTPException(status_code=401, detail="Invalid credentials.")
        
        access_token = create_access_token(data={"sub": form_data.username})
        return {"access_token": access_token, "token_type": "bearer", "message": "Login successful."}

@app.post("/signout")
async def signout(user: UserSignout, current_user: dict = Depends(get_current_user)):
    """
    현재 로그인된 사용자를 탈퇴시킵니다.
    Authorization 헤더에 Bearer 토큰과 비밀번호 확인이 필요합니다.
    """
    username = current_user["username"]

    # 비밀번호 확인
    async with httpx.AsyncClient() as client:
        check = await client.get(
            f"{SUPABASE_URL}/rest/v1/users",
            params={"username": f"eq.{username}", "select": "*"},
            headers=headers
        )
        users = check.json()
        if not users:
            raise HTTPException(status_code=404, detail="User not found.")
        
        db_user = users[0]
        if not pwd_context.verify(user.password, db_user["password"]):
            raise HTTPException(status_code=401, detail="비밀번호가 일치하지 않습니다.")
        
        # 비밀번호가 맞으면 계정 삭제
        response = await client.delete(
            f"{SUPABASE_URL}/rest/v1/users",
            params={"username": f"eq.{username}"},
            headers=headers
        )

        if response.status_code != 204:
            raise HTTPException(status_code=500, detail="Failed to delete user.")
        return {"message": "User deleted successfully."}