import { useState } from "react";

/**
 * Custom hook for managing form state and submission
 * @param {Object} initialValues - Initial form values
 * @param {Function} onSubmit - Async function to handle form submission
 * @returns {Object} { formData, loading, error, handleChange, handleSubmit }
 */
export const useFormHandler = (initialValues, onSubmit) => {
  const [formData, setFormData] = useState(initialValues);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSuccess("");

    try {
      await onSubmit(formData);
      setSuccess("Success!");
      setFormData(initialValues);
    } catch (err) {
      setError(err.response?.data?.error || err.message || "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData(initialValues);
    setError("");
    setSuccess("");
  };

  return {
    formData,
    setFormData,
    loading,
    error,
    success,
    handleChange,
    handleSubmit,
    resetForm,
  };
};
