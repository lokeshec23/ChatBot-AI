from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from transformers import AutoModelForSeq2SeqLM, AutoTokenizer
from fastapi.middleware.cors import CORSMiddleware
import torch

app = FastAPI()

# Allow frontend to access backend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allow all origins (or use ["http://localhost:5173"] for security)
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Load a better AI model (BlenderBot)
MODEL_NAME = "facebook/blenderbot-400M-distill"
tokenizer = AutoTokenizer.from_pretrained(MODEL_NAME)
model = AutoModelForSeq2SeqLM.from_pretrained(MODEL_NAME)

class ChatRequest(BaseModel):
    message: str

@app.post("/chat")
async def chat(request: ChatRequest):
    
    try:
        user_input = request.message

        # Tokenize input
        input_ids = tokenizer(user_input, return_tensors="pt").input_ids

        # Generate response
        response_ids = model.generate(input_ids, max_length=100)
        response_text = tokenizer.decode(response_ids[0], skip_special_tokens=True)

        return {"response": response_text}

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/")
def home():
    return {"message": "Chatbot API is running!"}
