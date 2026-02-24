import "./AuthCard.css";

/**
 * Reusable authentication card component for login/register
 * @param {string} title - Card title
 * @param {string} subtitle - Card subtitle (optional)
 * @param {React.ReactNode} children - Form children
 */
export const AuthCard = ({ title, subtitle, children }) => {
  return (
    <div className="auth-card">
      <h2>{title}</h2>
      {subtitle && <p>{subtitle}</p>}
      {children}
    </div>
  );
};
