import { createRoot } from "react-dom/client";

import "./styles/globals.css";
import { AppShell } from "./web/app-shell";

const rootElement = document.getElementById("root");

if (!rootElement) {
  throw new Error("Root container not found.");
}

createRoot(rootElement).render(<AppShell />);
