import { useState } from "react";

export default function App() {
  const [count, setCount] = useState(0);

  return (
    <div style={{ fontFamily: "system-ui, sans-serif", padding: "2rem" }}>
      <h1>Sprint Agents</h1>
      <p>
        <button onClick={() => setCount((c) => c + 1)}>count: {count}</button>
      </p>
    </div>
  );
}
