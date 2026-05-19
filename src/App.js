import React, { useState } from 'react';
import Login from './pages/Login';
import Clientes from './pages/Clientes';

export default function App() {
  const [logado, setLogado] = useState(false);

  return logado
    ? <Clientes onLogout={() => setLogado(false)} />
    : <Login onLogin={() => setLogado(true)} />;
}
