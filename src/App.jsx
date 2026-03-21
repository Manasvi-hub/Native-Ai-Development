import { BrowserRouter, Routes, Route } from "react-router-dom";

import SignInPage from "./pages/SignInPage";
import IntentPage from "./pages/IntentPage";
import TranslationPage from "./pages/TranslationPage";
import ValidationPage from "./pages/ValidationPage";
import OutputPage from "./pages/OutputPage";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<SignInPage />} />
        <Route path="/intent" element={<IntentPage />} />
        <Route path="/translate" element={<TranslationPage />} />
        <Route path="/validate" element={<ValidationPage />} />
        <Route path="/output" element={<OutputPage />} />
      </Routes>
    </BrowserRouter>
  );
}