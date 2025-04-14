from fastapi import FastAPI, HTTPException, UploadFile, File
from pydantic import BaseModel
from fastapi.middleware.cors import CORSMiddleware
from groq import Groq
import os
from dotenv import load_dotenv
from pdfplumber import open as pdf_open
import tempfile
from sentence_transformers import SentenceTransformer
import chromadb
from chromadb.utils import embedding_functions

# Load environment variables
load_dotenv()

app = FastAPI()

# CORS Configuration
FRONTEND_URL = "http://localhost:5173"  # Replace with your frontend URL
app.add_middleware(
    CORSMiddleware,
    allow_origins=[FRONTEND_URL],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Fetch API Key from environment variables
GROQ_API_KEY = os.getenv("GROQ_API_KEY")
if not GROQ_API_KEY:
    raise ValueError("GROQ_API_KEY is missing in the .env file!")

client = Groq(api_key=GROQ_API_KEY)

# Initialize ChromaDB client and embedding function
chroma_client = chromadb.Client()
embedding_function = embedding_functions.SentenceTransformerEmbeddingFunction(model_name="all-MiniLM-L6-v2")

# Create a collection for storing PDF embeddings
pdf_collection = chroma_client.create_collection(name="pdf_embeddings", embedding_function=embedding_function)

# In-memory storage for conversation history
conversation_history = {}

class ChatRequest(BaseModel):
    message: str

@app.post("/chat")
async def chat(request: ChatRequest):
    """
    Endpoint for general chat with memory management.
    """
    try:
        user_input = request.message

        # Retrieve conversation history
        history = conversation_history.get("general", [])
        history.append({"role": "user", "content": user_input})

        # Use Groq API to generate a response
        chat_completion = client.chat.completions.create(
            messages=history,
            model="llama-3.3-70b-versatile",
            stream=False,
        )

        # Extract and return the AI's response
        response_text = chat_completion.choices[0].message.content
        history.append({"role": "assistant", "content": response_text})
        conversation_history["general"] = history

        return {"response": response_text}

    except Exception as e:
        print(f"Error in /chat endpoint: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to process the request.")

@app.post("/uploadPdf")
async def upload_pdf(file: UploadFile = File(...)):
    """
    Endpoint for handling PDF uploads and storing embeddings in ChromaDB.
    """
    try:
        if not file.filename.lower().endswith(".pdf"):
            raise HTTPException(status_code=400, detail="Only PDF files are allowed.")

        # Save the uploaded file to a temporary location
        with tempfile.NamedTemporaryFile(delete=False, suffix=".pdf") as temp_file:
            temp_file.write(await file.read())
            temp_file_path = temp_file.name

        # Extract text from the PDF
        text = ""
        try:
            with pdf_open(temp_file_path) as pdf:
                for page in pdf.pages:
                    text += page.extract_text()
        finally:
            os.unlink(temp_file_path)

        if not text.strip():
            raise HTTPException(status_code=400, detail="Failed to extract text from the PDF.")

        # Split the text into chunks and store embeddings in ChromaDB
        chunks = [chunk.strip() for chunk in text.split("\n\n") if chunk.strip()]
        pdf_collection.add(
            documents=chunks,
            metadatas=[{"source": file.filename}] * len(chunks),
            ids=[f"{file.filename}_{i}" for i in range(len(chunks))],
        )

        return {"message": f"PDF '{file.filename}' uploaded successfully."}

    except HTTPException as http_err:
        raise http_err
    except Exception as e:
        print(f"Unexpected Error: {str(e)}")
        raise HTTPException(status_code=500, detail="An unexpected error occurred.")

@app.post("/queryPdf")
async def query_pdf(request: ChatRequest):
    """
    Endpoint for querying the content of an uploaded PDF using semantic search.
    """
    try:
        user_query = request.message

        # Perform a similarity search in ChromaDB
        results = pdf_collection.query(
            query_texts=[user_query],
            n_results=3,  # Retrieve top 3 most relevant chunks
        )

        retrieved_chunks = results["documents"][0]
        context = "\n".join(retrieved_chunks)

        # Use Groq API to generate a response based on the retrieved context
        chat_completion = client.chat.completions.create(
            messages=[
                {
                    "role": "user",
                    "content": f"Answer the following question based on the retrieved PDF content:\n\nQuestion: {user_query}\n\nRetrieved Content:\n{context}",
                }
            ],
            model="llama-3.3-70b-versatile",
            stream=False,
        )

        response_text = chat_completion.choices[0].message.content
        return {"response": response_text}

    except Exception as e:
        print(f"Error in /queryPdf endpoint: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to process the query.")

@app.post("/summarizePdf")
async def summarize_pdf():
    """
    Endpoint for summarizing the content of the uploaded PDF.
    """
    try:
        # Combine all stored PDF content into a single string
        pdf_text = "\n".join(pdf_collection.get()["documents"])

        # Truncate the PDF text if it's too long
        MAX_PDF_LENGTH = 5000
        if len(pdf_text) > MAX_PDF_LENGTH:
            pdf_text = pdf_text[:MAX_PDF_LENGTH] + "...\n[Content truncated due to length.]"

        # Use Groq API to generate a summary
        chat_completion = client.chat.completions.create(
            messages=[
                {
                    "role": "user",
                    "content": f"Summarize the following content in bullet points:\n\n{pdf_text}",
                }
            ],
            model="llama-3.3-70b-versatile",
            stream=False,
        )

        response_text = chat_completion.choices[0].message.content
        return {"summary": response_text}

    except Exception as e:
        print(f"Error in /summarizePdf endpoint: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to generate summary.")