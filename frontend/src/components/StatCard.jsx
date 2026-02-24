import "./StatCard.css";

/**
 * Reusable stat card component for displaying statistics
 * @param {string} value - The stat value/number
 * @param {string} label - The label for the stat
 * @param {string} className - Additional CSS classes
 * @param {string} highlight - If true, adds highlight class
 */
export const StatCard = ({ value, label, className = "", highlight = false }) => {
  return (
    <div className={`stat-card ${highlight ? "highlight" : ""} ${className}`}>
      <div className="stat-number">{value}</div>
      <div className="stat-label">{label}</div>
    </div>
  );
};
