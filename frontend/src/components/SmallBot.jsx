import React, { useState, useEffect } from "react";
import axios from "axios";

const THINKING_MESSAGE = "Thinking...";
const ERROR_MESSAGE = "Sorry, something went wrong. Please try again.";

const SmallBot = ({ setSmallBot }) => {
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState([{
    "sender": "AI",
    "text": "Hi, How can I assist you today?"
}]);
  const [isDisabled, setIsDisabled] = useState(false);
  useEffect(() => {
    console.log("Messages updated:", messages);
  },[messages])

  const sendMessage = async () => {
    if (!input.trim()) return;

    setIsDisabled(true);
    const userMessage = { sender: "You", text: input };
    setMessages((prevMessages) => [
      ...prevMessages,
      userMessage,
      { sender: "AI", text: THINKING_MESSAGE },
    ]);

    try {
      const response = await axios.post(
        `${import.meta.env.VITE_REACT_APP_URL}/smallchat`,
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
      setIsDisabled(false);
    }

    setInput("");
  };

  return (
    <div
      style={{
        position: "fixed",
        bottom: "80px",
        right: "20px",
        width: "500px",
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
            {msg.text}
          </div>
        ))}
      </div>

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
          onKeyPress={(e) => e.key === "Enter" && sendMessage()}
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
    </div>
  );
};

export default SmallBot;
