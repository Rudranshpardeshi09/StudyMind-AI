import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { GoogleOAuthProvider } from "@react-oauth/google";

import App from "@/app/App";
import "@/styles/index.css";

const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID || "";

function Root() {
  const app = (
    <BrowserRouter>
      <App />
    </BrowserRouter>
  );
  return googleClientId ? (
    <GoogleOAuthProvider clientId={googleClientId}>{app}</GoogleOAuthProvider>
  ) : (
    app
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <Root />
  </React.StrictMode>
);
