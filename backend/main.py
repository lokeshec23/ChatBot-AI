from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from fastapi.middleware.cors import CORSMiddleware
from groq import Groq
import os

app = FastAPI()

# Allow frontend to access backend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allow all origins (or use ["http://localhost:5173"] for security)
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize the Groq client
GROQ_API_KEY = "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"  # Replace with your actual Groq API key
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