import { useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";

import Header from "./Header";
import { useAuth } from "@/context/AuthContext";

const protectedPaths = new Set([
  "/home",
  "/bienestar",
  "/formacion",
  "/politica-cookies",
  "/aviso-privacidad",
]);

export default function ConditionalHeader() {
  const { isAuthenticated } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const isAuthPage =
    location.pathname === "/" || location.pathname === "/register";
  const isProtectedPage = protectedPaths.has(location.pathname);

  useEffect(() => {
    if (isProtectedPage && !isAuthenticated) {
      navigate("/", { replace: true });
    }
  }, [isAuthenticated, isProtectedPage, navigate]);

  if (!isAuthenticated || isAuthPage) {
    return null;
  }

  return <Header />;
}
