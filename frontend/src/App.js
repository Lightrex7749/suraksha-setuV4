import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import MainLayout from "@/components/layout/MainLayout";
import Dashboard from "@/pages/Dashboard";
import MapView from "@/pages/MapView";
import Alerts from "@/pages/Alerts";
import Weather from "@/pages/Weather";
import Disasters from "@/pages/Disasters";
import Community from "@/pages/Community";
import StudentPortal from "@/pages/StudentPortal";
import ScientistPortal from "@/pages/ScientistPortal";
import AdminDashboard from "@/pages/AdminDashboard";
import Login from "@/pages/Login";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        
        <Route path="/" element={<MainLayout />}>
          <Route index element={<Navigate to="/dashboard" replace />} />
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
      </Routes>
    </BrowserRouter>
  );
}

export default App;
