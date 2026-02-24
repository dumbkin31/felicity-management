import "./DataCard.css";

/**
 * Reusable data card component for displaying items in grid
 * @param {Array} items - Array of items to display
 * @param {Function} renderHeader - Function to render card header
 * @param {Function} renderBody - Function to render card body
 * @param {Function} renderFooter - Function to render card footer (optional)
 * @param {string} emptyMessage - Message when no items
 */
export const DataCard = ({
  items = [],
  renderHeader,
  renderBody,
  renderFooter,
  emptyMessage = "No items found",
}) => {
  if (!items || items.length === 0) {
    return <div className="no-items-message">{emptyMessage}</div>;
  }

  return (
    <div className="data-cards-grid">
      {items.map((item, index) => (
        <div key={item._id || index} className="data-card">
          {renderHeader && (
            <div className="card-header">{renderHeader(item)}</div>
          )}
          {renderBody && <div className="card-body">{renderBody(item)}</div>}
          {renderFooter && (
            <div className="card-footer">{renderFooter(item)}</div>
          )}
        </div>
      ))}
    </div>
  );
};
