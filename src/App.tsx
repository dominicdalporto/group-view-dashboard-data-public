
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "./contexts/AuthContext";
import AuthGuard from "./components/AuthGuard";
import Dashboard from "./pages/Dashboard";
import Patients from "./pages/Patients";
import UserDetail from "./pages/UserDetail";
import Nurses from "./pages/Nurses";
import Login from "./pages/Login";

const queryClient = new QueryClient();

const AppRoutes = () => (
  <Routes>
    <Route path="/" element={<Navigate to="/dashboard" />} />
    <Route path="/login" element={<Login />} />
    <Route 
      path="/dashboard" 
      element={
        <AuthGuard>
          <Dashboard />
        </AuthGuard>
      } 
    />
    <Route 
      path="/dashboard/patients" 
      element={
        <AuthGuard>
          <Patients />
        </AuthGuard>
      } 
    />
    <Route 
      path="/dashboard/nurses" 
      element={
        <AuthGuard>
          <Nurses />
        </AuthGuard>
      } 
    />
    <Route 
      path="/dashboard/patient/:userId" 
      element={
        <AuthGuard>
          <UserDetail />
        </AuthGuard>
      } 
    />
  </Routes>
);

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <AppRoutes />
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
