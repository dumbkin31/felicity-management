import { useState } from "react";
import api from "../api/axios";

/**
 * Custom hook for exporting data as CSV
 * @returns {Object} { exportCSV, exporting, error }
 */
export const useCSVExport = () => {
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState("");

  const exportCSV = async (url, filename) => {
    setExporting(true);
    setError("");
    try {
      const response = await api.get(url, { responseType: "blob" });
      const blob = new Blob([response.data], { type: "text/csv" });
      const link = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = link;
      a.download = filename;
      a.click();
      window.URL.revokeObjectURL(link);
    } catch (err) {
      setError(err.response?.data?.error || "Failed to export CSV");
      throw err;
    } finally {
      setExporting(false);
    }
  };

  return { exportCSV, exporting, error };
};
