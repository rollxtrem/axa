import "./global.css";

import { Toaster } from "@/components/ui/toaster";
import { createRoot } from "react-dom/client";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Login from "./pages/Login";
import Register from "./pages/Register";
import NotFound from "./pages/NotFound";
import { AuthProvider } from "@/context/AuthContext";
import ConditionalHeader from "./components/ConditionalHeader";
import Home from "./pages/Home";
import Bienestar from "./pages/Bienestar";
import Formacion from "./pages/Formacion";
import PoliticaCookies from "./pages/PoliticaCookies";
import AvisoPrivacidad from "./pages/AvisoPrivacidad";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <AuthProvider>
        <BrowserRouter>
          <ConditionalHeader />
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/home" element={<Home />} />
            <Route path="/bienestar" element={<Bienestar />} />
            <Route path="/formacion" element={<Formacion />} />
            <Route path="/politica-cookies" element={<PoliticaCookies />} />
            <Route path="/aviso-privacidad" element={<AvisoPrivacidad />} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

const container = document.getElementById("root")!;
// Reuse existing root during HMR or multiple mounts
// @ts-ignore
const existingRoot = (window as any).__app_root__;
if (existingRoot) {
  existingRoot.render(<App />);
} else {
  const root = createRoot(container);
  // @ts-ignore
  (window as any).__app_root__ = root;
  root.render(<App />);
}
