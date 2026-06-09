import React, { useState, useEffect } from 'react';
import Login from './pages/Login';
import AdminHome from './pages/AdminHome';
import EntregadorHome from './pages/EntregadorHome';
import { ThemeProvider } from './contexts/ThemeContext';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { auth } from './firebase';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { db } from './firebase';

export default function App() {
  const [usuario, setUsuario] = useState(null);
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (user) {
        const perfilDoc = await getDoc(doc(db, 'usuarios', user.uid));
        if (perfilDoc.exists()) {
          const perfil = perfilDoc.data();
          setUsuario({ uid: user.uid, email: user.email, nome: perfil.nome, tipo: perfil.tipo });
        } else {
          const tipo = user.email.includes('admin') ? 'admin' : 'entregador';
          const nome = tipo === 'admin' ? 'Administrador' : 'Entregador';
          setUsuario({ uid: user.uid, email: user.email, nome, tipo });
        }
      } else {
        setUsuario(null);
      }
      setCarregando(false);
    });
    return () => unsub();
  }, []);

  const handleLogout = async () => {
    await signOut(auth);
    setUsuario(null);
  };

  if (carregando) {
    return (
      <ThemeProvider>
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', backgroundColor: '#1a1a2e' }}>
          <p style={{ color: '#e2b96f', fontSize: 18 }}>Carregando...</p>
        </div>
      </ThemeProvider>
    );
  }

  if (!usuario) {
    return (
      <ThemeProvider>
        <Login onLogin={setUsuario} />
        <ToastContainer position="top-right" />
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
