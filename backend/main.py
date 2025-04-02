from fastapi import FastAPI, HTTPException, UploadFile, File
from pydantic import BaseModel
from fastapi.middleware.cors import CORSMiddleware
from groq import Groq
import os
from dotenv import load_dotenv
from pdfplumber import open as pdf_open  # For extracting text from PDFs
import tempfile

# Load environment variables
load_dotenv()

app = FastAPI()

# Replace with your actual frontend URL
FRONTEND_URL = "*"

# Allow frontend to access backend
app.add_middleware(
    CORSMiddleware,
    allow_origins=[FRONTEND_URL],  # Allow only the frontend domain
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Fetch API Key from environment variables
GROQ_API_KEY = os.getenv("GROQ_API_KEY")
if not GROQ_API_KEY:
    raise ValueError("GROQ_API_KEY is missing in the .env file!")

client = Groq(api_key=GROQ_API_KEY)

# In-memory storage for PDF content (use a database for production)
pdf_content_store = {}

class ChatRequest(BaseModel):
    message: str

@app.post("/chat")
async def chat(request: ChatRequest):
    """
    Endpoint for general chat. Accepts user input and sends it to Groq API.
    """
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
        print(f"Error in /chat endpoint: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to process the request.")

@app.post("/uploadPdf")
async def upload_pdf(file: UploadFile = File(...)):
    """
    Endpoint for handling PDF uploads. Extracts text from the PDF and stores it for querying.
    """
    try:
        # Validate file type
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
            # Clean up the temporary file
            os.unlink(temp_file_path)

        # Check if text extraction was successful
        if not text.strip():
            raise HTTPException(status_code=400, detail="Failed to extract text from the PDF.")

        # Store the extracted text in memory (use a unique key, e.g., filename)
        pdf_content_store[file.filename] = text

        # Return success response
        return {"message": f"PDF '{file.filename}' uploaded successfully."}

    except HTTPException as http_err:
        # Re-raise HTTP exceptions to return proper error responses
        raise http_err
    except Exception as e:
        # Log unexpected errors and return a generic 500 response
        print(f"Unexpected Error: {str(e)}")
        raise HTTPException(status_code=500, detail="An unexpected error occurred.")

@app.post("/queryPdf")
async def query_pdf(request: ChatRequest):
    """
    Endpoint for querying the content of an uploaded PDF.
    """
    try:
        user_query = request.message

        # Check if any PDF content is available
        if not pdf_content_store:
            raise HTTPException(status_code=400, detail="No PDF content available. Please upload a PDF first.")

        # Combine all stored PDF content into a single string
        pdf_text = "\n".join(pdf_content_store.values())

        # Truncate the PDF text if it's too long (adjust the limit as needed)
        MAX_PDF_LENGTH = 5000  # Example: Limit to 5000 characters
        if len(pdf_text) > MAX_PDF_LENGTH:
            pdf_text = pdf_text[:MAX_PDF_LENGTH] + "...\n[Content truncated due to length.]"

        # Use Groq API to process the query with the PDF content
        try:
            chat_completion = client.chat.completions.create(
                messages=[
                    {
                        "role": "user",
                        "content": f"Answer the following question based on the uploaded PDF:\n\nQuestion: {user_query}\n\nPDF Content:\n{pdf_text}",
                    }
                ],
                model="llama-3.3-70b-versatile",  # Specify the Groq model
                stream=False,  # Disable streaming for simplicity
            )
            response_text = chat_completion.choices[0].message.content
        except Exception as e:
            print(f"Groq API Error: {str(e)}")
            raise HTTPException(status_code=500, detail="Failed to process the query with Groq API.")

        # Return the AI's response
        return {"response": response_text}

    except HTTPException as http_err:
        # Re-raise HTTP exceptions to return proper error responses
        raise http_err
    except Exception as e:
        # Log unexpected errors and return a generic 500 response
        print(f"Unexpected Error: {str(e)}")
        raise HTTPException(status_code=500, detail="An unexpected error occurred.")

@app.post("/smallchat")
async def chat(request: ChatRequest):
    """
    Endpoint for general chat. Accepts user input and sends it to Groq API.
    """
    try:
        user_input = request.message

        # Use Groq API to generate a short response
        chat_completion = client.chat.completions.create(
            messages=[
                {
                    "role": "user",
                    "content": user_input,
                }
            ],
            model="llama-3.3-70b-versatile",
            max_tokens=50,  # Limit the response length
            temperature=0.7,  # Control randomness
            stream=False,
        )

        # Extract and return the AI's response
        response_text = chat_completion.choices[0].message.content.strip()
        return {"response": response_text}

    except Exception as e:
        print(f"Error in /smallchat endpoint: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to process the request.")

@app.post("/suggestions")
async def get_suggestions(request: ChatRequest):
    """
    Generate relevant follow-up questions based on the user's last query.
    """
    try:
        user_input = request.message

        # Generate relevant questions using the LLM
        suggestion_response = client.chat.completions.create(
            messages=[
                {"role": "user", "content": f"Suggest three relevant follow-up questions based on: {user_input}"}
            ],
            model="llama-3.3-70b-versatile",
            max_tokens=100,  # Limit response size
            temperature=0.7,
            stream=False,
        )

        suggestions_text = suggestion_response.choices[0].message.content
        suggestions = [s.strip() for s in suggestions_text.split("\n") if s.strip()]

        return {"suggestions": suggestions[:3]}  # Limit to 3 suggestions
    except Exception as e:
        print(f"Error in /suggestions endpoint: {str(e)}")
        return {"suggestions": []}  # Return empty list if error occurs



@app.get("/")
def home():
    """
    Home endpoint to check if the API is running.
    """
    return {"message": "Chatbot API is running!"}