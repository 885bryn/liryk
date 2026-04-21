import { createRoot } from "react-dom/client";

import "./styles/globals.css";
import { WebAppRouter } from "./web/web-app-router";

const rootElement = document.getElementById("root");

if (!rootElement) {
  throw new Error("Root container not found.");
}

createRoot(rootElement).render(<WebAppRouter />);
