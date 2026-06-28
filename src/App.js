import React, { useState } from 'react';
import Login from './pages/Login';
import AdminHome from './pages/AdminHome';
import EntregadorHome from './pages/EntregadorHome';
import Notificacoes from './pages/Notificacoes';
import { ThemeProvider } from './contexts/ThemeContext';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

export default function App() {
  const [usuario, setUsuario] = useState(null);
  const [pagina, setPagina] = useState('admin');

  const handleLogin = (user) => {
    setUsuario(user);
    setPagina(user.tipo === 'admin' ? 'admin' : 'entregador');
  };

  const handleLogout = () => {
    setUsuario(null);
    setPagina('login');
  };

  if (!usuario) {
    return (
      <ThemeProvider>
        <Login onLogin={handleLogin} />
      </ThemeProvider>
    );
  }

  if (pagina === 'notificacoes') {
    return (
      <ThemeProvider>
        <Notificacoes usuario={usuario} onVoltar={() => setPagina(usuario.tipo === 'admin' ? 'admin' : 'entregador')} />
        <ToastContainer position="top-right" />
      </ThemeProvider>
    );
  }

  if (usuario.tipo === 'admin') {
    return (
      <ThemeProvider>
        <AdminHome onLogout={handleLogout} onNavigate={(p) => setPagina(p)} />
        <ToastContainer position="top-right" />
      </ThemeProvider>
    );
  }

  return (
    <ThemeProvider>
      <EntregadorHome usuario={usuario} onLogout={handleLogout} onNavigate={(p) => setPagina(p)} />
      <ToastContainer position="top-right" />
    </ThemeProvider>
  );
}
