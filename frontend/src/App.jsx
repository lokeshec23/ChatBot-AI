import React, { useEffect, useRef, useState } from "react";
import axios from "axios";
import "./App.css";
// import  marked  from "marked";

const App = () => {
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState([]);
  const [isDisabled, setIsDisable] = useState(false);
  const [darkMode, setDarkMode] = useState(false);
  const [isPdfChatMode, setIsPdfChatMode] = useState(false); // Chat mode state
  const [uploadedPdfName, setUploadedPdfName] = useState(null); // Track uploaded PDF name
  const INPUTREF = useRef(null);
  const chatBoxRef = useRef(null);

  const THINKING_MESSAGE = "Thinking...";
  const ERROR_MESSAGE = "Something went wrong. Please try again.";

  // Initialize theme on mount
  useEffect(() => {
    INPUTREF.current?.focus();

    const theme = localStorage.getItem("theme");
    setDarkMode(theme === "true");
    document.body.classList.toggle("dark-mode", theme === "true");
  }, []);

  // Scroll to bottom when messages update
  useEffect(() => {
    if (chatBoxRef.current) {
      chatBoxRef.current.scrollTo({
        top: chatBoxRef.current.scrollHeight,
        behavior: "smooth",
      });
    }
  }, [messages]);

  // Toggle dark mode
  const toggleTheme = () => {
    const newTheme = !darkMode;
    setDarkMode(newTheme);
    localStorage.setItem("theme", newTheme);
    document.body.classList.toggle("dark-mode", newTheme);
  };

  // Send message in General Chat mode
  const sendMessage = async () => {
    if (!input.trim()) return;

    setIsDisable(true);
    const userMessage = { sender: "You", text: input };
    setMessages((prevMessages) => [
      ...prevMessages,
      userMessage,
      { sender: "AI", text: THINKING_MESSAGE },
    ]);

    try {
      const response = await axios.post(
        `${import.meta.env.VITE_REACT_APP_URL}/chat`,
        { message: input }
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
      setIsDisable(false);
    }

    setInput("");
  };

  // Handle file upload in PDF Chat mode
  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    setIsDisable(true);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await axios.post(
        `${import.meta.env.VITE_REACT_APP_URL}/uploadPdf`,
        formData,
        {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        }
      );

      setMessages((prevMessages) => [
        ...prevMessages,
        { sender: "You", text: `Uploaded PDF: ${file.name}` },
        { sender: "AI", text: response.data.message },
      ]);

      setUploadedPdfName(file.name); // Track the uploaded PDF name
    } catch (error) {
      console.error("Error uploading PDF:", error);

      setMessages((prevMessages) => [
        ...prevMessages,
        { sender: "You", text: `Uploaded PDF: ${file.name}` },
        { sender: "AI", text: "Failed to process PDF. Please try again." },
      ]);
    } finally {
      setIsDisable(false);
    }
  };

  // Query the uploaded PDF
  const queryPdf = async () => {
    if (!input.trim()) return;

    setIsDisable(true);
    const userMessage = { sender: "You", text: input };
    setMessages((prevMessages) => [
      ...prevMessages,
      userMessage,
      { sender: "AI", text: THINKING_MESSAGE },
    ]);

    try {
      const response = await axios.post(
        `${import.meta.env.VITE_REACT_APP_URL}/queryPdf`,
        { message: input }
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
      console.error("Error querying PDF:", error);

      setMessages((prevMessages) =>
        prevMessages.slice(0, -1).concat({ sender: "AI", text: ERROR_MESSAGE })
      );
    } finally {
      setIsDisable(false);
    }

    setInput("");
  };

  // Reset chat messages
  const resetMessage = () => {
    setInput("");
    setMessages([]);
    setUploadedPdfName(null); // Clear the uploaded PDF name
    INPUTREF.current?.focus();
  };

  // Handle Enter key press
  const handleKeyDown = (e) => {
    if (e.key === "Enter") {
      if (isPdfChatMode && uploadedPdfName) {
        queryPdf(); // Query the PDF in PDF Chat mode
      } else {
        sendMessage(); // Send message in General Chat mode
      }
    }
  };

  return (
    <div className={`chat-container ${darkMode ? "dark" : "light"}`}>
      {/* Header */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          padding: "10px",
          borderBottom: "1px solid #ccc",
        }}
      >
        <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
          <img src="/vite.svg" alt="logo" width="40" />
          <h1 style={{ margin: 0 }}>AI Chat Bot</h1>
        </div>
        <div style={{ display: "flex", gap: "10px" }}>
          {/* Dark Mode Toggle Button */}
          <button className="theme-toggle" onClick={toggleTheme}>
            {darkMode ? "Light Mode" : "Dark Mode"}
          </button>

          {/* Chat Mode Toggle Button */}
          <button
            className="chat-mode-toggle"
            onClick={() => {
              resetMessage();
              setIsPdfChatMode((prev) => !prev);
            }}
          >
            {isPdfChatMode ? "Switch to General Chat" : "Switch to PDF Chat"}
          </button>
        </div>
      </div>

      {/* Chat Box */}
      <div className="chat-box" ref={chatBoxRef}>
        {messages.map((msg, index) => (
          <div
            key={index}
            className={`message ${
              msg.sender === "You" ? "user-message" : "ai-message"
            }`}
          >
            {/* <strong>{msg.sender}: </strong> */}
            <span>{msg.text}</span>
            {/* {msg.sender === "You" ? (
            ) : (
              <span
                dangerouslySetInnerHTML={{
                  __html: marked.parse(msg.text),
                }}
              />
            )} */}
          </div>
        ))}
      </div>

      {/* Input Container */}
      <div className="input-container">
        {/* General Chat Input */}
        {!isPdfChatMode && (
          <>
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
          </>
        )}

        {/* PDF Chat Input */}
        {isPdfChatMode && (
          <>
            {!uploadedPdfName && (
              <>
                <label htmlFor="pdf-upload" className="upload-button">
                  Upload PDF
                </label>
                <input
                  id="pdf-upload"
                  type="file"
                  accept=".pdf"
                  style={{ display: "none" }}
                  onChange={handleFileUpload}
                />
              </>
            )}
            {uploadedPdfName && (
              <>
                <input
                  ref={INPUTREF}
                  style={{ opacity: isDisabled ? "0.5" : "1" }}
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder={`Ask a question about ${uploadedPdfName}`}
                  onKeyDown={handleKeyDown}
                />
                <button
                  onClick={queryPdf}
                  className="send_button"
                  style={{ opacity: isDisabled ? "0.5" : "1" }}
                  disabled={isDisabled}
                >
                  Ask
                </button>
              </>
            )}
          </>
        )}

        {/* Reset Button */}
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
  );
};

export default App;