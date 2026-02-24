import { useState, useEffect } from "react";

/**
 * Custom hook for fetching data with loading and error states
 * @param {Function} fetchFn - Async function that fetches data
 * @param {Array} dependencies - useEffect dependencies
 * @returns {Object} { data, loading, error, retry }
 */
export const useFetchData = (fetchFn, dependencies = []) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const retry = async () => {
    setLoading(true);
    setError("");
    try {
      const result = await fetchFn();
      setData(result);
    } catch (err) {
      setError(err.response?.data?.error || err.message || "Failed to fetch data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    retry();
  }, dependencies);

  return { data, loading, error, retry };
};
