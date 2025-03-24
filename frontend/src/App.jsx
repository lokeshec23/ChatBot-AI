import React, { useEffect, useRef, useState } from "react";
import axios from "axios";
import "./App.css";

const App = () => {
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState([]);
  const [isDisabled, setIsDisable] = useState(false);
  const [darkMode, setDarkMode] = useState(false);
  const INPUTREF = useRef(null);

  useEffect(() => {
    INPUTREF.current?.focus();
  }, []);

  const toggleTheme = () => {
    setDarkMode(!darkMode);
    document.body.classList.toggle("dark-mode", !darkMode);
  };

  const sendMessage = async () => {
    if (!input.trim()) return;
    setIsDisable(true);

    const userMessage = { sender: "You", text: input };

    try {
      const response = await axios.post("http://127.0.0.1:8000/chat", {
        message: input,
      });
      setMessages((prevMessages) => [
        ...prevMessages,
        userMessage,
        { sender: "AI", text: response.data.response },
      ]);
    } catch (error) {
      console.error("Error fetching response:", error);
      setMessages((prevMessages) => [
        ...prevMessages,
        userMessage,
        { sender: "AI", text: "Something went wrong. Please try again" },
      ]);
    } finally {
      setIsDisable(false);
    }

    setInput("");
  };

  const resetMessage = () => {
    setInput("");
    setMessages([]);
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter") {
      sendMessage();
    }
  };

  return (
    <>
      <div style={{display:'flex', justifyContent:'flex-end'}}> 
        <button className="theme-toggle" onClick={toggleTheme}>
          {darkMode ? "Light Mode" : "Dark Mode"}
        </button>
      </div>
      <div className={`chat-container ${darkMode ? "dark" : "light"}`}>
        <h1>AI Chatbot</h1>
        <div className="chat-box">
          {messages.map((msg, index) => (
            <div
              key={index}
              className={`message ${
                msg.sender === "You" ? "user-message" : "ai-message"
              }`}
            >
              <strong>{msg.sender}:</strong> {msg.text}
            </div>
          ))}
        </div>
        <div className="input-container">
          <input
            ref={INPUTREF}
            style={{ opacity: isDisabled ? "0.5" : "1" }}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Type your message..."
            onKeyDown={handleKeyDown}
          />
          <button
            onClick={sendMessage}
            className="send_button"
            style={{ opacity: isDisabled ? "0.5" : "1" }}
            disabled={isDisabled}
          >
            Send
          </button>
          {!!messages.length && (
            <button
              onClick={resetMessage}
              className="reset-button"
              style={{ opacity: isDisabled ? "0.5" : "1" }}
              disabled={isDisabled}
            >
              Reset
            </button>
          )}
        </div>
      </div>
    </>
  );
};

export default App;
