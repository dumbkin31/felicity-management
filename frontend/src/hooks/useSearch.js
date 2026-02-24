import { useState, useMemo } from "react";

/**
 * Custom hook for search/filter functionality
 * @param {Array} items - Items to search
 * @param {Array} searchFields - Fields to search in (e.g., ['name', 'email'])
 * @returns {Object} { searchQuery, setSearchQuery, filteredItems }
 */
export const useSearch = (items = [], searchFields = []) => {
  const [searchQuery, setSearchQuery] = useState("");

  const filteredItems = useMemo(() => {
    if (!searchQuery.trim() || !searchFields.length) {
      return items;
    }

    const lowerQuery = searchQuery.toLowerCase();

    return items.filter((item) =>
      searchFields.some((field) => {
        const value = item[field];
        if (!value) return false;
        return String(value).toLowerCase().includes(lowerQuery);
      })
    );
  }, [items, searchQuery, searchFields]);

  return {
    searchQuery,
    setSearchQuery,
    filteredItems,
  };
};
