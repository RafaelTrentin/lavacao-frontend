import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

async function registerServiceWorker() {
  if ("serviceWorker" in navigator) {
    try {
      await navigator.serviceWorker.register("/sw.js");
      console.log("Service worker registrado com sucesso");
    } catch (error) {
      console.error("Erro ao registrar service worker:", error);
    }
  }
}

registerServiceWorker();

createRoot(document.getElementById("root")!).render(<App />);