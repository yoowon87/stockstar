import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";

import App from "./App";
import { AuthGate } from "./AuthGate";
import { installAuthFetch } from "./auth";
import "./styles.css";

installAuthFetch();

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker
      .register("/sw.js")
      .then((registration) => {
        if (registration.waiting) {
          window.dispatchEvent(
            new CustomEvent("stockstar-update-ready", {
              detail: registration.waiting,
            }),
          );
        }

        registration.addEventListener("updatefound", () => {
          const installing = registration.installing;
          if (!installing) {
            return;
          }

          installing.addEventListener("statechange", () => {
            if (
              installing.state === "installed" &&
              navigator.serviceWorker.controller
            ) {
              window.dispatchEvent(
                new CustomEvent("stockstar-update-ready", {
                  detail: registration.waiting ?? installing,
                }),
              );
            }
          });
        });
      })
      .catch(console.error);
  });
}

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <AuthGate>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </AuthGate>
  </React.StrictMode>,
);
