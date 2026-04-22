import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

async function disableServiceWorkers() {
  if ("serviceWorker" in navigator) {
    try {
      const registrations = await navigator.serviceWorker.getRegistrations();
      await Promise.all(registrations.map((registration) => registration.unregister()));
      console.log("Service workers removidos com sucesso");
    } catch (error) {
      console.error("Erro ao remover service workers:", error);
    }
  }
}

disableServiceWorkers();

createRoot(document.getElementById("root")!).render(<App />);