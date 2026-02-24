/**
 * Custom hook for confirmation dialogs
 * @param {string} message - Confirmation message
 * @returns {Promise<boolean>} - True if user confirms, false otherwise
 */
export const useConfirm = () => {
  const confirm = (message) => {
    return window.confirm(message);
  };

  return { confirm };
};
