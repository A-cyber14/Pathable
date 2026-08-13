import { createContext, useCallback, useContext, useRef, useState } from "react";
import ToastStack from "../components/Toast";

// ---------------------------------------------------------------------------
// ToastContext — single shared confirmation/error notification system.
//
// Usage:
//   const { showToast } = useToast();
//   showToast("Saved");                              // top-center
//   showToast("Couldn't save", "error");              // top-center, stays longer
//   showToast("Saved", "success", e.currentTarget);    // anchored above the
//                                                       // control that was clicked
// ---------------------------------------------------------------------------

const ToastContext = createContext(null);

const DURATIONS = { success: 2000, info: 2000, error: 5000 };

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const nextId = useRef(0);

  const dismiss = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const showToast = useCallback((message, type = "success", anchorEl = null) => {
    const id = ++nextId.current;
    let anchor = null;
    if (anchorEl && typeof anchorEl.getBoundingClientRect === "function") {
      const rect = anchorEl.getBoundingClientRect();
      anchor = { top: rect.top, left: rect.left + rect.width / 2 };
    }
    setToasts((prev) => [...prev, { id, message, type, anchor }]);
    setTimeout(() => dismiss(id), DURATIONS[type] || DURATIONS.success);
  }, [dismiss]);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <ToastStack toasts={toasts} onDismiss={dismiss} />
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used inside a <ToastProvider>");
  }
  return context;
}
