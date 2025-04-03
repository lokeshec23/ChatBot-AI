import React, { useState, useEffect, useRef } from "react";
import axios from "axios";
import { marked } from "marked";

const THINKING_MESSAGE = "Thinking...";
const ERROR_MESSAGE = "Sorry, something went wrong. Please try again.";

const SmallBot = ({ setSmallBot }) => {
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState([
    {
      sender: "AI",
      text: "Hello. I'm here to help with any questions you have about US mortgages, including calculations, loan types, interest rates, and related financial concepts. What's on your mind?",
    },
  ]);
  const [isDisabled, setIsDisabled] = useState(false);
  const [suggestions, setSuggestions] = useState([]);
  const [width, setWidth] = useState(500); // Default width of chat window
  const [left, setLeft] = useState(window.innerWidth - 520); // Position from left
  const isResizing = useRef(false);
  const startX = useRef(0);
  const startWidth = useRef(0);
  const startLeft = useRef(0);

  useEffect(() => {
    if (messages.length === 0) return;
    const lastUserMessage = messages
      .filter((msg) => msg.sender === "You")
      .pop();
    if (!lastUserMessage) return;

    const fetchSuggestions = async () => {
      try {
        const response = await axios.post(
          `${import.meta.env.VITE_REACT_APP_URL}/suggestions`,
          { message: lastUserMessage.text }
        );
        const filteredSuggestions = response.data.suggestions.slice(1); // Removes the first element
        // console.log("Filtered Suggestions:", {filteredSuggestions,ab:response.data.suggestions});
        setSuggestions(response.data.suggestions || []);
      } catch (error) {
        console.error("Error fetching suggestions:", error);
      }
    };

    fetchSuggestions();
  }, [messages]);

  const sendMessage = async (query = input) => {
    if (typeof query == "object") {
      query = input;
    }
    if (!query.trim()) return;

    setIsDisabled(true);
    const userMessage = { sender: "You", text: query };
    setMessages((prevMessages) => [
      ...prevMessages,
      userMessage,
      { sender: "AI", text: THINKING_MESSAGE },
    ]);

    try {
      const response = await axios.post(
        `${import.meta.env.VITE_REACT_APP_URL}/smallchat`,
        { message: query }
      );

      if (!response.data || !response.data.response) {
        throw new Error("Invalid API response");
      }

      setMessages((prevMessages) =>
        prevMessages
          .slice(0, -1)
          .concat({ sender: "AI", text: response.data.response })
      );
    } catch (error) {
      console.error("Error fetching response:", error);
      setMessages((prevMessages) =>
        prevMessages.slice(0, -1).concat({ sender: "AI", text: ERROR_MESSAGE })
      );
    } finally {
      setIsDisabled(false);
    }

    setInput("");
  };

  // Handle resizing from the left side
  const handleMouseDown = (e) => {
    isResizing.current = true;
    startX.current = e.clientX;
    startWidth.current = width;
    startLeft.current = left;
    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
  };

  const handleMouseMove = (e) => {
    if (isResizing.current) {
      const deltaX = e.clientX - startX.current;
      const newWidth = Math.max(300, startWidth.current - deltaX); // Min width: 300px
      const newLeft = Math.min(
        window.innerWidth - 300,
        startLeft.current + deltaX
      ); // Prevent overflow

      setWidth(newWidth);
      setLeft(newLeft);
    }
  };

  const handleMouseUp = () => {
    isResizing.current = false;
    document.removeEventListener("mousemove", handleMouseMove);
    document.removeEventListener("mouseup", handleMouseUp);
  };

  return (
    <div
      style={{
        position: "fixed",
        bottom: "80px",
        left: `${left}px`,
        width: `${width}px`,
        height: "700px",
        backgroundColor: "#fff",
        borderRadius: "10px",
        boxShadow: "0 4px 10px rgba(0, 0, 0, 0.2)",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        overflow: "hidden",
        zIndex: 1001,
      }}
    >
      {/* Header */}
      <div
        style={{
          backgroundColor: "#0078ff",
          color: "#fff",
          padding: "10px",
          textAlign: "center",
          fontWeight: "bold",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <div>Ask AI</div>
        <div
          style={{ cursor: "pointer" }}
          onClick={() => setSmallBot((prev) => ({ ...prev, show: !prev.show }))}
        >
          X
        </div>
      </div>

      {/* Chat Area */}
      <div
        style={{
          flex: 1,
          padding: "10px",
          overflowY: "auto",
          display: "flex",
          flexDirection: "column",
          gap: "5px",
        }}
      >
        {messages.map((msg, index) => (
          <div
            key={index}
            style={{
              alignSelf: msg.sender === "You" ? "flex-end" : "flex-start",
              backgroundColor: msg.sender === "You" ? "#0078ff" : "#f1f1f1",
              color: msg.sender === "You" ? "white" : "black",
              padding: "8px 12px",
              borderRadius: "10px",
              maxWidth: "80%",
            }}
          >
            {/* / {msg.text} */}
            {
              msg.sender === "You" ? <span>{msg.text}</span> : 
            <span
              dangerouslySetInnerHTML={{
                __html: marked.parse(msg.text),
              }}
            />
            }
          </div>
        ))}
      </div>

      {/* Suggestions */}
      {suggestions.length > 0 && (
        <div
          style={{
            padding: "10px",
            backgroundColor: "#f9f9f9",
            borderBottom: "1px solid #ddd",
          }}
        >
          {/* <strong>Suggestions:</strong> */}
          <div style={{ display: "flex", gap: "5px", marginTop: "5px" }}>
            {suggestions.map((suggestion, index) => (
              <button
                key={index}
                onClick={() => sendMessage(suggestion)}
                style={{
                  backgroundColor: "#ddd",
                  border: "none",
                  padding: "5px 10px",
                  borderRadius: "5px",
                  cursor: "pointer",
                }}
              >
                {suggestion}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Input Area */}
      <div
        style={{
          display: "flex",
          padding: "10px",
          borderTop: "1px solid #ddd",
          backgroundColor: "#fff",
        }}
      >
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Type your message..."
          style={{
            flex: 1,
            padding: "8px",
            borderRadius: "5px",
            border: "1px solid #ccc",
            outline: "none",
          }}
          onKeyDown={(e) => e.key === "Enter" && sendMessage()}
          disabled={isDisabled}
        />
        <button
          onClick={sendMessage}
          style={{
            marginLeft: "5px",
            padding: "8px",
            backgroundColor: "#0078ff",
            color: "white",
            border: "none",
            borderRadius: "5px",
            cursor: "pointer",
          }}
          disabled={isDisabled}
        >
          Send
        </button>
      </div>

      {/* Resize Handle (Left Side) */}
      <div
        onMouseDown={handleMouseDown}
        style={{
          position: "absolute",
          top: "0",
          left: "0",
          width: "10px",
          height: "100%",
          cursor: "ew-resize",
          backgroundColor: "transparent",
        }}
      />
    </div>
  );
};

export default SmallBot;
