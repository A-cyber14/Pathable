import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import { AuthProvider } from "./context/AuthContext";
import { DisplaySettingsProvider } from "./context/DisplaySettingsContext";
import { ToastProvider } from "./context/ToastContext";
import { TourProvider } from "./context/TourContext";
import "./index.css";

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <DisplaySettingsProvider>
      <ToastProvider>
        <AuthProvider>
          <TourProvider>
            <App />
          </TourProvider>
        </AuthProvider>
      </ToastProvider>
    </DisplaySettingsProvider>
  </StrictMode>
);
