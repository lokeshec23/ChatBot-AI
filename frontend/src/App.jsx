import React, { useEffect, useRef, useState } from "react";
import axios from "axios";
import "./App.css";

const App = () => {
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState([]);
  const [isDisabled, setIsDisable] = useState(false);
  const [darkMode, setDarkMode] = useState(false);
  const INPUTREF = useRef(null);
  const chatBoxRef = useRef(null);

  useEffect(() => {
    INPUTREF.current?.focus();

    let theme = localStorage.getItem("theme");
    setDarkMode(theme);
    document.body.classList.toggle("dark-mode", theme);
  }, []);

  useEffect(() => {
    if (!chatBoxRef.current) return;

    chatBoxRef.current?.scrollTo({
      top: chatBoxRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages]);

  const toggleTheme = () => {
    setDarkMode(!darkMode);
    localStorage.setItem("theme", !darkMode);
    document.body.classList.toggle("dark-mode", !darkMode);
  };

  const sendMessage = async () => {
    if (!input.trim()) return; // Prevent sending empty messages
    setIsDisable(true); // Disable input while processing

    const userMessage = { sender: "You", text: input };
    setMessages((prevMessages) => [
      ...prevMessages,
      userMessage,
      { sender: "AI", text: "Thinking..." },
    ]);

    try {
      const response = await axios.post(
        `${import.meta.env.VITE_REACT_APP_URL}/chat`,
        { message: input }
      );

      // Replace "Thinking..." with the actual response
      setMessages((prevMessages) =>
        prevMessages
          .slice(0, -1)
          .concat({ sender: "AI", text: response.data.response })
      );
    } catch (error) {
      console.error("Error fetching response:", error);

      // Replace "Thinking..." with an error message
      setMessages((prevMessages) =>
        prevMessages.slice(0, -1).concat({
          sender: "AI",
          text: "Something went wrong. Please try again",
        })
      );
    } finally {
      setIsDisable(false); // Re-enable input
    }

    setInput(""); // Clear input field after sending
  };

  useEffect(() => {
    chatBoxRef.current?.scrollTo({
      top: chatBoxRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages]);

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
      <div className={`chat-container ${darkMode ? "dark" : "light"}`}>
        <div
          style={{
            display: "flex",
            justifyContent: " space-between",
            alignItems: "center",
          }}
        >
          <div style={{ display: "flex", gap: "10px" }}>
            <img src="/vite.svg" />
            <h1>AI Chat Bot</h1>
          </div>
          <button className="theme-toggle" onClick={toggleTheme}>
            {darkMode ? "Light Mode" : "Dark Mode"}
          </button>
        </div>

        <div className="chat-box" ref={chatBoxRef}>
          {messages.map((msg, index) => (
            <div
              key={index}
              className={`message ${
                msg.sender === "You" ? "user-message" : "ai-message"
              }`}
            >
              <strong>{msg.sender}: </strong>
              <span
                dangerouslySetInnerHTML={{
                  __html: msg.text
                    .replace(/\*\*(.*?)\*\*/g, "<b>$1</b>") // Make **wrapped words** bold
                    .replace(
                      /(\n?[-•\d+]\.\s.*?)(?=\n[-•\d+]\.|\n*$)/g,
                      "$1<br>"
                    ) // Ensure single new line between bullets/numbers
                    .replace(/\n/g, "<br>"), // Convert other new lines to <br>
                }}
              />
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
