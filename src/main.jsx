import { StrictMode, useState, useEffect } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Login from "./pages/login";
import SignIn from "./pages/sign_in";
import LandingPage from "./pages/landing-page"; // Import the LandingPage
import ResidentHome from "./pages/resident-home";
import ModeratorHome from "./pages/moderator-home";
import AdminLogin from "./pages/admin-login"; // Import the new AdminLogin page
import AdminHome from "./pages/admin-home";
import ForgotPassword from "./pages/forgot-password";
import ResetPassword from "./pages/reset-password";
import VerifyEmail from "./pages/verify-email";
import OfflineScreen from "./components/OfflineScreen";

function useOnlineStatus() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    function handleOnline() {
      setIsOnline(true);
    }

    function handleOffline() {
      setIsOnline(false);
    }

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  return isOnline;
}

function AppWrapper() {
  const isOnline = useOnlineStatus();

  useEffect(() => {
    const applyAppSettings = () => {
      const settings = JSON.parse(localStorage.getItem("app_settings")) || {};
      const fontSize = settings.fontSize || "medium"; // Default to medium
      document.documentElement.setAttribute("data-font-size", fontSize);
    };

    applyAppSettings();
    window.addEventListener("storage", applyAppSettings); // Listen for changes from other tabs

    return () => window.removeEventListener("storage", applyAppSettings);
  }, []);

  return (
    <>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<Login />} />
        <Route path="/verify-email/:token" element={<VerifyEmail />} />
        <Route path="/reset-password/:token" element={<ResetPassword />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/sign-in" element={<SignIn />} />
        <Route path="/resident/:id/:username" element={<ResidentHome />} />
        <Route path="/admin-login" element={<AdminLogin />} />
        <Route path="/moderator/:id/:username" element={<ModeratorHome />} />
        <Route path="/admin/:id/:username" element={<AdminHome />} />
      </Routes>
      {!isOnline && <OfflineScreen />}
    </>
  );
}

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <BrowserRouter>
      <AppWrapper />
    </BrowserRouter>
  </StrictMode>
);
