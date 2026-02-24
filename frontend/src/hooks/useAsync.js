import { useState, useCallback } from "react";

/**
 * Custom hook for async data fetching with loading/error states
 * @param {Function} asyncFn - Async function to execute
 * @param {Array} dependencies - Dependency array for useEffect
 * @returns {Object} { data, loading, error, execute, clear }
 */
export const useAsync = (asyncFn, dependencies = []) => {
  const [state, setState] = useState({
    data: null,
    loading: false,
    error: null,
  });

  const execute = useCallback(async () => {
    setState({ data: null, loading: true, error: null });
    try {
      const result = await asyncFn();
      setState({ data: result, loading: false, error: null });
      return result;
    } catch (err) {
      const errorMsg = err.response?.data?.error || err.message || "An error occurred";
      setState({ data: null, loading: false, error: errorMsg });
      throw err;
    }
  }, [asyncFn]);

  const clear = useCallback(() => {
    setState({ data: null, loading: false, error: null });
  }, []);

  return {
    data: state.data,
    loading: state.loading,
    error: state.error,
    execute,
    clear,
  };
};
