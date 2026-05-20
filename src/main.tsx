import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

// Suppress the React DevTools install nudge in development
if (typeof window !== "undefined") {
  const _info = console.info.bind(console);
  console.info = (...args: unknown[]) => {
    if (typeof args[0] === "string" && args[0].includes("react-devtools")) return;
    _info(...args);
  };
}

createRoot(document.getElementById("root")!).render(<App />);
