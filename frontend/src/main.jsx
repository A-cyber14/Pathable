import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import { AuthProvider } from "./context/AuthContext";
import { DisplaySettingsProvider } from "./context/DisplaySettingsContext";
import "./index.css";

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <DisplaySettingsProvider>
      <AuthProvider>
        <App />
      </AuthProvider>
    </DisplaySettingsProvider>
  </StrictMode>
);
