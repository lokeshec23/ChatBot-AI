from fastapi import FastAPI, HTTPException, UploadFile, File
from pydantic import BaseModel
from fastapi.middleware.cors import CORSMiddleware
from groq import Groq
import os
from dotenv import load_dotenv
from pdfplumber import open as pdf_open  # For extracting text from PDFs
import tempfile
import logging
from logging.handlers import RotatingFileHandler
import httpx
# ----------------------------------------
# Logging Setup
# ----------------------------------------
LOG_DIR = "log"
LOG_FILE = os.path.join(LOG_DIR, "error.log")

# Create the log directory if it doesn't exist
os.makedirs(LOG_DIR, exist_ok=True)

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(levelname)s - %(message)s",
    handlers=[
        RotatingFileHandler(LOG_FILE, maxBytes=5 * 1024 * 1024, backupCount=2),
        logging.StreamHandler()
    ]
)

logger = logging.getLogger(__name__)

# ----------------------------------------
# Load environment variables
# ----------------------------------------
load_dotenv()

app = FastAPI()

# Allow frontend to access backend
FRONTEND_URL = "*"
app.add_middleware(
    CORSMiddleware,
    allow_origins=[FRONTEND_URL],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Fetch API Key
GROQ_API_KEY = os.getenv("GROQ_API_KEY")
if not GROQ_API_KEY:
    logger.error("GROQ_API_KEY is missing in the .env file!")
    raise ValueError("GROQ_API_KEY is missing in the .env file!")

client = Groq(api_key=GROQ_API_KEY, http_client=httpx.Client(verify=False) )

# In-memory storage for PDF content (use a database for production)
pdf_content_store = {}

# ----------------------------------------
# Models
# ----------------------------------------
class ChatRequest(BaseModel):
    message: str

# ----------------------------------------
# Endpoints
# ----------------------------------------

@app.post("/chat")
async def chat(request: ChatRequest):
    """
    Endpoint for general chat. Accepts user input and sends it to Groq API.
    """
    try:
        user_input = request.message
        chat_completion = client.chat.completions.create(
            messages=[
                {
                    "role": "user",
                    "content": user_input,
                }
            ],
            model="llama-3.3-70b-versatile",
            stream=False,
        )
        response_text = chat_completion.choices[0].message.content
        return {"response": response_text}

    except Exception as e:
        logger.exception("Error in /chat endpoint")
        raise HTTPException(status_code=500, detail="Failed to process the request.")

@app.post("/uploadPdf")
async def upload_pdf(file: UploadFile = File(...)):
    """
    Endpoint for handling PDF uploads. Extracts text from the PDF and stores it.
    """
    try:
        if not file.filename.lower().endswith(".pdf"):
            raise HTTPException(status_code=400, detail="Only PDF files are allowed.")

        with tempfile.NamedTemporaryFile(delete=False, suffix=".pdf") as temp_file:
            temp_file.write(await file.read())
            temp_file_path = temp_file.name

        text = ""
        try:
            with pdf_open(temp_file_path) as pdf:
                for page in pdf.pages:
                    text += page.extract_text()
        finally:
            os.unlink(temp_file_path)

        if not text.strip():
            raise HTTPException(status_code=400, detail="Failed to extract text from the PDF.")

        pdf_content_store[file.filename] = text

        return {"message": f"PDF '{file.filename}' uploaded successfully."}

    except HTTPException as http_err:
        raise http_err
    except Exception:
        logger.exception("Unexpected error in /uploadPdf")
        raise HTTPException(status_code=500, detail="An unexpected error occurred.")

@app.post("/queryPdf")
async def query_pdf(request: ChatRequest):
    """
    Endpoint for querying the content of an uploaded PDF.
    """
    try:
        user_query = request.message

        if not pdf_content_store:
            raise HTTPException(status_code=400, detail="No PDF content available. Please upload a PDF first.")

        pdf_text = "\n".join(pdf_content_store.values())

        MAX_PDF_LENGTH = 5000
        if len(pdf_text) > MAX_PDF_LENGTH:
            pdf_text = pdf_text[:MAX_PDF_LENGTH] + "...\n[Content truncated due to length.]"

        try:
            chat_completion = client.chat.completions.create(
                messages=[
                    {
                        "role": "user",
                        "content": f"Answer the following question based on the uploaded PDF:\n\nQuestion: {user_query}\n\nPDF Content:\n{pdf_text}",
                    }
                ],
                model="llama-3.3-70b-versatile",
                stream=False,
            )
            response_text = chat_completion.choices[0].message.content
        except Exception:
            logger.exception("Groq API error in /queryPdf")
            raise HTTPException(status_code=500, detail="Failed to process the query with Groq API.")

        return {"response": response_text}

    except HTTPException as http_err:
        raise http_err
    except Exception:
        logger.exception("Unexpected error in /queryPdf")
        raise HTTPException(status_code=500, detail="An unexpected error occurred.")

@app.get("/")
def home():
    return {"message": "Chatbot API is running!"}
