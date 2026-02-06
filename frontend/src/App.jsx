import { useEffect, useState } from "react";

export default function App() {
  const [msg, setMsg] = useState("Loading...");

  useEffect(() => {
    fetch("/api/health")
      .then((r) => r.json())
      .then((data) => setMsg(JSON.stringify(data)))
      .catch((e) => setMsg("Error: " + e.message));
  }, []);

  return (
    <div style={{ padding: 20 }}>
      <h1>Frontend ↔ Backend Test</h1>
      <pre>{msg}</pre>
    </div>
  );
}
