import os

from groq import Groq

# client = Groq(
#     api_key=os.environ.get("GROQ_API_KEY"),
# )
# Fetch API Key
# GROQ_API_KEY = os.getenv("GROQ_API_KEY")
# if not GROQ_API_KEY:
#     raise ValueError("GROQ_API_KEY is missing in the .env file!")

client = Groq(api_key="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")

chat_completion = client.chat.completions.create(
    messages=[
        {
            "role": "user",
            "content": "Explain the importance of fast language models",
        }
    ],
    model="llama-3.3-70b-versatile",
)

print(chat_completion.choices[0].message.content)