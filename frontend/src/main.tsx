import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router";
import { SkulletProvider } from "skullet/react";
import "skullet/styles.css";

import AppRouter from "@/routes/app-router";
import "@/styles/global.css";

const rootElement = document.getElementById("root");

if (!rootElement) {
  throw new Error("Root element was not found.");
}

createRoot(rootElement).render(
  <StrictMode>
    <BrowserRouter>
      <SkulletProvider
        mode="light"
        theme={{
          light: { base: "#e5ebf3", highlight: "#f5f7fb" },
          animation: "shimmer",
          speed: "slow",
          radius: "6px",
        }}
      >
        <AppRouter />
      </SkulletProvider>
    </BrowserRouter>
  </StrictMode>,
);
