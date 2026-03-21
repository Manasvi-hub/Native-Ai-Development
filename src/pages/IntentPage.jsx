import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import VantaBackground from "../components/VantaBackground";

export default function IntentPage() {
  const [input, setInput] = useState("");
  const rotatingWords = ["Database", "Backend", "API", "Workflow", "Assistant"];
  const [activeWordIndex, setActiveWordIndex] = useState(0);
  const navigate = useNavigate();

  useEffect(() => {
    const interval = setInterval(() => {
      setActiveWordIndex((prev) => (prev + 1) % rotatingWords.length);
    }, 1800);

    return () => clearInterval(interval);
  }, [rotatingWords.length]);

  const handleSubmit = () => {
    localStorage.setItem("userPrompt", input);
    navigate("/translate");
  };

  return (
    <VantaBackground>
      <div className="perspective-container">
        {/* Main App Title with Hero Effect */}
        <h1 className="app-title-hero text-white text-5xl font-bold mb-6 text-center">
          AI Intent-Based App Builder
        </h1>

        {/* Hero Text with Sealos-style effect */}
        <div className="hero-text-container mb-8">
          <h1 className="hero-main-text">
            Ship any{" "}
            <span className="hero-rotating-word-box" aria-live="polite">
              <span key={rotatingWords[activeWordIndex]} className="hero-rotating-word">
                {rotatingWords[activeWordIndex]}
              </span>
            </span>
            <span className="hero-highlight">with just a prompt</span>
          </h1>
          <p className="hero-subtitle">
            Deploy databases, APIs, and full-stack apps instantly with AI
          </p>
        </div>

        <div className="glass-card-3d backdrop-blur-xl p-8 rounded-2xl w-full max-w-xl text-center">
          <textarea
            className="textarea-glow w-full h-32 p-3 rounded-lg bg-black/40 text-white"
            placeholder="Describe your app..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
          />

          <button
            onClick={handleSubmit}
            className="button-3d mt-4 w-full bg-[#5751d1] p-3 rounded-xl text-white hover:shadow-pulse"
          >
            Generate App
          </button>
        </div>
      </div>
    </VantaBackground>
  );
}