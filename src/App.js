import React, { useState } from 'react';
import Login from './pages/Login';
import Clientes from './pages/Clientes';
import EntregadorHome from './pages/EntregadorHome';

export default function App() {
  const [usuario, setUsuario] = useState(null);

  if (!usuario) return <Login onLogin={setUsuario} />;
  if (usuario.tipo === 'adm') return <Clientes onLogout={() => setUsuario(null)} />;
  if (usuario.tipo === 'entregador') return <EntregadorHome usuario={usuario} onLogout={() => setUsuario(null)} />;
}
