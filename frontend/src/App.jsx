import React, { useEffect, useRef, useState } from "react";
import axios from "axios";
import "./App.css";
import { marked } from "marked";
import SmallBot from "./components/SmallBot";
import MainBot from "./components/MainBot";
const App = () => {
  const [smallBot, setSmallBot] = useState({ show: false }); // Track small bot state
  const [darkMode, setDarkMode] = useState(false);
  useEffect(() => {
    const theme = localStorage.getItem("theme");
    setDarkMode(theme === "true");
    document.body.classList.toggle("dark-mode", theme === "true");
  }, []);
  return (
    <div>
      <MainBot darkMode={darkMode} setDarkMode={setDarkMode} />
      <div style={{ display: "flex", justifyContent: "flex-end" }}>
        {!smallBot.show ? (
          <img
            src="https://store-images.s-microsoft.com/image/apps.1769.14088670979553319.b7288464-9406-483d-858d-6aae7cbbf548.5b4fd216-a8f4-403a-abfb-f46311f93faf?h=253"
            alt="chatbot-icon"
            onClick={() => setSmallBot({ show: !smallBot.show })}
            style={{
              width: "50px",
              height: "50px",
              position: "absolute",
              right: "20px",
              bottom: "20px",
              borderRadius: "50%",
              boxShadow: "0 0 10px rgba(0, 0, 0, 0.5)",
              zIndex: 1000,
              transition: "transform 0.3s ease",
              cursor: "pointer",
            }}
          />
        ) : (
          <>
            <SmallBot setSmallBot={setSmallBot} darkMode={darkMode} setDarkMode={setDarkMode}/>
          </>
        )}
      </div>
    </div>
  );
};

export default App;
