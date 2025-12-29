import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

// Render app immediately - fonts will load asynchronously via Google Fonts link tag
// The font-display: swap ensures text is visible while fonts load
const root = createRoot(document.getElementById("root")!);
root.render(<App />);
