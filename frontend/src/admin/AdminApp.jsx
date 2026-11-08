import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { AuthProvider, RequireAuth } from "./auth";
import Layout from "./Layout";
import { ToastProvider } from "./ui";
import Account from "./pages/Account";
import Branding from "./pages/Branding";
import CaseStudiesList from "./pages/CaseStudiesList";
import CaseStudyEditor from "./pages/CaseStudyEditor";
import HeroImages from "./pages/HeroImages";
import Login from "./pages/Login";
import Media from "./pages/Media";
import Overview from "./pages/Overview";
import SiteContent from "./pages/SiteContent";

export default function AdminApp() {
  return (
    <BrowserRouter
      basename="/admin"
      future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
    >
      <ToastProvider>
        <AuthProvider>
          <Routes>
            <Route path="login" element={<Login />} />
            <Route element={<RequireAuth><Layout /></RequireAuth>}>
              <Route path="dashboard" element={<Overview />} />
              <Route path="hero-images" element={<HeroImages />} />
              <Route path="case-studies" element={<CaseStudiesList />} />
              <Route path="case-studies/:id" element={<CaseStudyEditor />} />
              <Route path="branding" element={<Branding />} />
              <Route path="media" element={<Media />} />
              <Route path="website-content" element={<SiteContent />} />
              <Route path="settings" element={<Account />} />
              <Route path="content" element={<Navigate to="/website-content" replace />} />
              <Route path="account" element={<Navigate to="/settings" replace />} />
            </Route>
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </AuthProvider>
      </ToastProvider>
    </BrowserRouter>
  );
}
