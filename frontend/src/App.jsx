import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import UserDashboard from './pages/UserDashboard';
import AgentDashboard from './pages/AgentDashboard';
import { LanguageProvider } from './context/LanguageContext';

function App() {
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const handleMouseMove = (e) => {
      setMousePos({ x: e.clientX, y: e.clientY });
    };
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  return (
    <LanguageProvider>
      <Router>
        <div className="min-h-screen relative overflow-hidden bg-slate-50 text-slate-800 font-sans">
          {/* Custom Cursor Glow */}
          <div 
            className="pointer-events-none fixed inset-0 z-50 transition-opacity duration-300"
            style={{
              background: `radial-gradient(600px at ${mousePos.x}px ${mousePos.y}px, rgba(0, 82, 204, 0.08), transparent 80%)`,
            }}
          />
          
          <Routes>
            <Route path="/" element={<Navigate to="/login" replace />} />
            <Route path="/login" element={<Login />} />
            <Route path="/user/dashboard" element={<UserDashboard />} />
            <Route path="/agent/dashboard" element={<AgentDashboard />} />
          </Routes>
        </div>
      </Router>
    </LanguageProvider>
  );
}

export default App;
