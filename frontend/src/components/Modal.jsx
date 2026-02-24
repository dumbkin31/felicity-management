import "./Modal.css";

/**
 * Reusable Modal Component
 * @param {boolean} isOpen - Whether modal is open
 * @param {Function} onClose - Callback when modal closes
 * @param {string} title - Modal title
 * @param {React.ReactNode} children - Modal content
 * @param {Object} options - Additional options { size, showHeader, showFooter }
 */
const Modal = ({
  isOpen,
  onClose,
  title,
  children,
  size = "medium",
  showHeader = true,
  showFooter = false,
}) => {
  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className={`modal-content modal-${size}`}
        onClick={(e) => e.stopPropagation()}
      >
        {showHeader && (
          <div className="modal-header">
            <h3>{title}</h3>
            <button
              className="modal-close"
              onClick={onClose}
              aria-label="Close modal"
            >
              ✕
            </button>
          </div>
        )}

        <div className="modal-body">{children}</div>

        {showFooter && <div className="modal-footer"></div>}
      </div>
    </div>
  );
};

export default Modal;
