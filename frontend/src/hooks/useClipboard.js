/**
 * Custom hook for clipboard operations
 * @returns {Object} { copyToClipboard, copied }
 */
export const useClipboard = () => {
  const copyToClipboard = async (text) => {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch (err) {
      console.error("Failed to copy to clipboard:", err);
      return false;
    }
  };

  return { copyToClipboard };
};
