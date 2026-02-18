export default function Unauthorized() {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "100vh" }}>
      <h1>403 - Unauthorized</h1>
      <p>You don't have permission to access this page.</p>
      <a href="/login">Go to Login</a>
    </div>
  );
}
