from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from dotenv import load_dotenv
from typing import Annotated

from fastapi import Depends, HTTPException, Query
from sqlmodel import Field, Session, SQLModel, create_engine, select

import os

load_dotenv()

class User(SQLModel, table=True):
    id: int | None = Field(default=None, primary_key=True)
    name: str = Field(index=True)
    age: int | None = Field(default=None, index=True)
    username: str

# sqlite_file_name = "db.sqlite"
sqlite_url = os.getenv("DATABASE_URL")

connect_args = {"check_same_thread": False}
engine = create_engine(sqlite_url)

def create_db_and_tables():
    SQLModel.metadata.create_all(engine)

def get_session():
    with Session(engine) as session:
        yield session


SessionDep = Annotated[Session, Depends(get_session)]

app = FastAPI()

@app.on_event("startup")
def on_startup():
    create_db_and_tables()

@app.post("/users/") # ENDPOINT TIPO POST que me crea un user
def create_user(user: User, session: SessionDep) -> User: # Definir una función
    session.add(user)
    session.commit()
    session.refresh(user)
    return user

# Leer multiples y hacer paginación
@app.get("/users/")
def read_users(
    session: SessionDep,
    offset: int = 0,
    limit: Annotated[int, Query(le=100)] = 100,
) -> list[User]:
    users = session.exec(select(User).offset(offset).limit(limit)).all()
    return users

# Leer un único
@app.get("/users/{user_id}")
def read_user(user_id: int, session: SessionDep) -> User:
    user = session.get(User, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user

@app.delete("/users/{user_id}")
def delete_user(user_id: int, session: SessionDep):
    user = session.get(User, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    session.delete(user)
    session.commit()
    return {"ok": True}

# Enable CORS for development (adjust origins for production)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Serve static files from ./static at /static
app.mount("/static", StaticFiles(directory="static"), name="static")



@app.get("/")
async def homepage():
    return FileResponse("static/index.html")


@app.get("/llm/{prompt}")
async def read_root(prompt):
    # CREAR UNA LOGICA QUE ME PERMITA COMUNICARME CON UN LLM
    from google import genai

    # The client gets the API key from the environment variable `GEMINI_API_KEY`.
    client = genai.Client()

    response = client.models.generate_content(
        model="gemini-3-flash-preview", contents=prompt
    )
    print(response.text)

    return {"Respuesta": response.text}
