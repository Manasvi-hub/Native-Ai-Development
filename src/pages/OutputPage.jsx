import VantaBackground from "../components/VantaBackground";

export default function OutputPage() {
  const prompt = localStorage.getItem("userPrompt");

  return (
    <VantaBackground>

      <h1 className="text-white text-4xl mb-6">Generated App</h1>

      <div className="bg-white/20 backdrop-blur-xl p-8 rounded-2xl text-white text-center">
        
        <h2 className="text-xl mb-3">Based on your prompt:</h2>
        <p className="mb-6 text-gray-200">{prompt}</p>

        {/* Fake prototype */}
        <div className="bg-black/40 p-4 rounded-lg">
          <h3 className="text-lg font-bold">📱 Sample App UI</h3>
          <p>✔ Dashboard</p>
          <p>✔ Workflow System</p>
          <p>✔ User Interface</p>
        </div>

      </div>

    </VantaBackground>
  );
}