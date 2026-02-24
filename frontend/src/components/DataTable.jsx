import "./DataTable.css";

/**
 * Reusable data table component for displaying tabular data
 * @param {Array} columns - Column definitions [{ key, label }]
 * @param {Array} data - Data to display
 * @param {Function} renderCell - Optional custom cell renderer
 */
export const DataTable = ({ columns, data = [], renderCell }) => {
  if (!data || data.length === 0) {
    return <div className="no-data-message">No data found</div>;
  }

  return (
    <div className="table-wrapper">
      <table className="data-table">
        <thead>
          <tr>
            {columns.map((col) => (
              <th key={col.key}>{col.label}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((row, rowIndex) => (
            <tr key={row._id || rowIndex}>
              {columns.map((col) => (
                <td key={`${row._id || rowIndex}-${col.key}`}>
                  {renderCell
                    ? renderCell(row[col.key], col.key, row)
                    : row[col.key]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};
