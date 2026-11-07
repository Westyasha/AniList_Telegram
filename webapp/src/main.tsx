import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { setupTelegram } from "@/lib/telegram";
import { App } from "@/app/App";
import "@/styles/index.css";

setupTelegram();

const root = document.getElementById("root");
if (root) {
  createRoot(root).render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
}
