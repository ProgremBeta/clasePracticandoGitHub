from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from dotenv import load_dotenv

app = FastAPI()

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

load_dotenv()


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


