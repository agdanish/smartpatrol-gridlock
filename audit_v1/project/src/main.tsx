import React, { Suspense, lazy } from "react";
import ReactDOM from "react-dom/client";
import { createBrowserRouter, RouterProvider } from "react-router-dom";
import App from "./App";
import "./index.css";

/* The landing route is lazy so the dashboard ("/app") pays ZERO 3D/scroll cost:
 * three, @react-three/*, gsap and lenis only enter the bundle on "/". */
const Landing = lazy(() => import("./landing/Landing"));

const router = createBrowserRouter([
  {
    path: "/",
    element: (
      <Suspense fallback={<div style={{ position: "fixed", inset: 0, background: "#0b0d12" }} />}>
        <Landing />
      </Suspense>
    ),
  },
  { path: "/app", element: <App /> },
]);

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <RouterProvider router={router} />
  </React.StrictMode>
);
