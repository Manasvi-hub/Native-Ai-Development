import { useNavigate } from "react-router-dom";
import VantaBackground from "../components/VantaBackground";

export default function ValidationPage() {
  const navigate = useNavigate();

  return (
    <VantaBackground>

      <h1 className="text-white text-4xl mb-6">Validation</h1>

      <div className="bg-white/20 backdrop-blur-xl p-8 rounded-2xl text-white">
        <p>✅ Security Checks Passed</p>
        <p>✅ Compliance Verified</p>
        <p>✅ Test Cases Passed</p>
      </div>

      <button
        onClick={() => navigate("/output")}
        className="mt-6 w-full max-w-xs mx-auto bg-[#5751d1] p-3 rounded-xl text-white"
      >
        Continue to Output
      </button>

    </VantaBackground>
  );
}