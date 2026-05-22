import React, { useState } from 'react';
import Login from './pages/Login';
import Clientes from './pages/Clientes';
import Estatisticas from './pages/Estatisticas';
import RotaEntrega from './pages/RotaEntrega';
import ImportarIfood from './pages/ImportarIfood';

export default function App() {
  const [logado, setLogado] = useState(false);
  const [pagina, setPagina] = useState('clientes');

  if (!logado) {
    return <Login onLogin={() => setLogado(true)} />;
  }

  if (pagina === 'estatisticas') {
    return <Estatisticas onVoltar={() => setPagina('clientes')} />;
  }

  if (pagina === 'rota') {
    return <RotaEntrega onVoltar={() => setPagina('clientes')} />;
  }

  if (pagina === 'importarIfood') {
    return <ImportarIfood onVoltar={() => setPagina('clientes')} />;
  }

  return <Clientes onLogout={() => setLogado(false)} onStats={() => setPagina('estatisticas')} onRota={() => setPagina('rota')} onImportarIfood={() => setPagina('importarIfood')} />;
}
