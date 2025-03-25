from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from fastapi.middleware.cors import CORSMiddleware
from groq import Groq
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

app = FastAPI()

# Allow frontend to access backend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allow all origins (or use ["http://localhost:5173"] for security)
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Fetch API Key from environment variables
GROQ_API_KEY = os.getenv("GROQ_API_KEY")
if not GROQ_API_KEY:
    raise ValueError("GROQ_API_KEY is missing in the .env file!")

client = Groq(api_key=GROQ_API_KEY)

class ChatRequest(BaseModel):
    message: str

@app.post("/chat")
async def chat(request: ChatRequest):
    try:
        user_input = request.message

        # Use Groq API to generate a response
        chat_completion = client.chat.completions.create(
            messages=[
                {
                    "role": "user",
                    "content": user_input,  # Pass the user's input to the API
                }
            ],
            model="llama-3.3-70b-versatile",  # Specify the Groq model
            stream=False,  # Disable streaming for simplicity
        )

        # Extract and return the AI's response
        response_text = chat_completion.choices[0].message.content
        return {"response": response_text}

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/")
def home():
    return {"message": "Chatbot API is running!"}