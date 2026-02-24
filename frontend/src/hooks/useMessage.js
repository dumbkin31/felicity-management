import { useState, useCallback } from "react";

/**
 * Custom hook for managing success/error messages with auto-clear
 * @param {number} duration - Auto-clear duration in milliseconds (default 3000)
 * @returns {Object} { success, error, clearSuccess, clearError, clearAll, successMsg, errorMsg }
 */
export const useMessage = (duration = 3000) => {
  const [successMsg, setSuccessMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [successTimeoutId, setSuccessTimeoutId] = useState(null);
  const [errorTimeoutId, setErrorTimeoutId] = useState(null);

  const clearSuccess = useCallback(() => {
    setSuccessMsg("");
    if (successTimeoutId) clearTimeout(successTimeoutId);
  }, [successTimeoutId]);

  const clearError = useCallback(() => {
    setErrorMsg("");
    if (errorTimeoutId) clearTimeout(errorTimeoutId);
  }, [errorTimeoutId]);

  const clearAll = useCallback(() => {
    clearSuccess();
    clearError();
  }, [clearSuccess, clearError]);

  const success = useCallback(
    (message) => {
      clearSuccess();
      setSuccessMsg(message);
      if (duration > 0) {
        const timeoutId = setTimeout(() => setSuccessMsg(""), duration);
        setSuccessTimeoutId(timeoutId);
      }
    },
    [duration, clearSuccess]
  );

  const error = useCallback(
    (message) => {
      clearError();
      setErrorMsg(message);
      if (duration > 0) {
        const timeoutId = setTimeout(() => setErrorMsg(""), duration);
        setErrorTimeoutId(timeoutId);
      }
    },
    [duration, clearError]
  );

  return {
    success,
    error,
    clearSuccess,
    clearError,
    clearAll,
    successMsg,
    errorMsg,
  };
};
