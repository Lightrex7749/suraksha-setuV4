import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "sonner";
import { AuthProvider } from "@/contexts/AuthContext";
import { LocationProvider } from "@/contexts/LocationContext";
import MainLayout from "@/components/layout/MainLayout";
import Landing from "@/pages/Landing";
import Dashboard from "@/pages/Dashboard";
import MapView from "@/pages/MapView";
import Alerts from "@/pages/Alerts";
import Weather from "@/pages/Weather";
import Disasters from "@/pages/Disasters";
import Community from "@/pages/Community";
import StudentPortal from "@/pages/StudentPortal";
import ScientistPortal from "@/pages/ScientistPortal";
import AdminDashboard from "@/pages/AdminDashboard";

function App() {
  return (
    <AuthProvider>
      <LocationProvider>
        <Toaster position="top-right" richColors closeButton />
        <BrowserRouter>
          <Routes>
            {/* Landing Page */}
            <Route path="/" element={<Landing />} />
            
            {/* All Routes Accessible Without Auth */}
            <Route path="/app" element={<MainLayout />}>
              <Route index element={<Navigate to="/app/dashboard" replace />} />
              <Route path="dashboard" element={<Dashboard />} />
              <Route path="map" element={<MapView />} />
              <Route path="alerts" element={<Alerts />} />
              <Route path="weather" element={<Weather />} />
              <Route path="disasters" element={<Disasters />} />
              <Route path="community" element={<Community />} />
              <Route path="student" element={<StudentPortal />} />
              <Route path="scientist" element={<ScientistPortal />} />
              <Route path="admin" element={<AdminDashboard />} />
            </Route>

            {/* Redirect login/register to dashboard */}
            <Route path="/login" element={<Navigate to="/app/dashboard" replace />} />
            <Route path="/register" element={<Navigate to="/app/dashboard" replace />} />
            
            {/* Catch all - redirect to dashboard */}
            <Route path="*" element={<Navigate to="/app/dashboard" replace />} />
          </Routes>
        </BrowserRouter>
      </LocationProvider>
    </AuthProvider>
  );
}

export default App;
