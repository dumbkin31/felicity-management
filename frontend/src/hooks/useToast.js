import { useState } from "react";

/**
 * Custom hook for toast notifications (replaces alert)
 * @returns {Object} { toast, toasts, removeToast }
 */
export const useToast = () => {
  const [toasts, setToasts] = useState([]);

  const toast = (message, type = "info", duration = 3000) => {
    const id = Date.now();
    const newToast = { id, message, type };
    
    setToasts((prev) => [...prev, newToast]);

    if (duration > 0) {
      setTimeout(() => removeToast(id), duration);
    }

    return id;
  };

  const removeToast = (id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  const success = (message) => toast(message, "success", 3000);
  const error = (message) => toast(message, "error", 4000);
  const info = (message) => toast(message, "info", 3000);
  const warning = (message) => toast(message, "warning", 3000);

  return { toast, success, error, info, warning, toasts, removeToast };
};
