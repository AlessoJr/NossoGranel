import React, { useState } from 'react';
import Login from './pages/Login';
import AdminHome from './pages/AdminHome';
import EntregadorHome from './pages/EntregadorHome';
import { ThemeProvider } from './contexts/ThemeContext';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

export default function App() {
  const [usuario, setUsuario] = useState(null);

  const handleLogin = (user) => {
    setUsuario(user);
  };

  const handleLogout = () => {
    setUsuario(null);
  };

  if (!usuario) {
    return (
      <ThemeProvider>
        <Login onLogin={handleLogin} />
      </ThemeProvider>
    );
  }

  if (usuario.tipo === 'admin') {
    return (
      <ThemeProvider>
        <AdminHome onLogout={handleLogout} />
        <ToastContainer position="top-right" />
      </ThemeProvider>
    );
  }

  return (
    <ThemeProvider>
      <EntregadorHome usuario={usuario} onLogout={handleLogout} />
      <ToastContainer position="top-right" />
    </ThemeProvider>
  );
}
