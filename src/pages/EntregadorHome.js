import React, { useEffect, useState, useRef } from 'react';
import { getClientesRealtime, getRotasRealtime, criarRota, concluirRota, atualizarLocalizacao } from '../services/firebaseService';
import ProfileMenu from '../components/ProfileMenu';
import { useTheme, getTheme } from '../contexts/ThemeContext';
import { toast } from 'react-toastify';

function abrirGPS(endereco, apt) {
  const end = `${endereco}${apt ? ` ${apt}` : ''}`;
  window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(end)}`, '_blank');
}

const NOTIFICACOES_VISTAS_KEY = 'entregador_notificacoes_vistas';

export default function EntregadorHome({ usuario, onLogout }) {
  const { darkMode, toggleTheme } = useTheme();
  const cores = getTheme(darkMode);
  const [clientes, setClientes] = useState([]);
  const [rotas, setRotas] = useState([]);
  const [busca, setBusca] = useState('');
  const [aba, setAba] = useState('rotas');
  const watchIdRef = useRef(null);

  const getNotificacoesVistas = () => {
    const saved = sessionStorage.getItem(NOTIFICACOES_VISTAS_KEY);
    return saved ? new Set(JSON.parse(saved)) : new Set();
  };
  
  const salvarNotificacoesVistas = (set) => {
    sessionStorage.setItem(NOTIFICACOES_VISTAS_KEY, JSON.stringify([...set]));
  };

  useEffect(() => {
    const unsubClientes = getClientesRealtime(setClientes);
    const unsubRotas = getRotasRealtime((novasRotas) => {
      const notificadas = getNotificacoesVistas();
      let atualizado = false;
      
      novasRotas.forEach(r => {
        const idAtribuida = `adm_${r.id}`;
        if (r.entregador === usuario.nome && r.criadoPor === 'adm' && r.status === 'em_andamento' && !notificadas.has(idAtribuida)) {
          notificadas.add(idAtribuida);
          atualizado = true;
          toast.info(`🔔 ADM atribuiu: ${r.clienteNome}`);
        }
      });
      
      if (atualizado) salvarNotificacoesVistas(notificadas);
      setRotas(novasRotas);
    });

    if (navigator.geolocation) {
      watchIdRef.current = navigator.geolocation.watchPosition(
        (pos) => atualizarLocalizacao(usuario.nome, pos.coords.latitude, pos.coords.longitude),
        (err) => console.log('GPS erro:', err),
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 5000 }
      );
    }

    return () => {
      unsubClientes();
      unsubRotas();
      if (watchIdRef.current) navigator.geolocation.clearWatch(watchIdRef.current);
    };
  }, [usuario.nome]);

  const handleAtivarRota = async (cliente) => {
    // REMOVIDO: não bloqueia mais se já tem rota ativa
    await criarRota(cliente, usuario.nome, 'entregador');
    toast.success(`Rota ativada para ${cliente.nome}!`);
    setAba('rotas');
  };

  const handleConcluirRota = async (rota) => {
    if (!window.confirm(`Concluir entrega de ${rota.clienteNome}?`)) return;
    await concluirRota(rota.id);
    toast.success(`✅ Entrega de ${rota.clienteNome} concluída!`);
  };

  const minhasRotas = rotas.filter(r => r.entregador === usuario.nome && r.status === 'em_andamento');
  const minhasConcluidas = rotas.filter(r => r.entregador === usuario.nome && r.status === 'concluida').sort((a, b) => new Date(b.concluidoEm) - new Date(a.concluidoEm));

  const clientesFiltrados = clientes.filter(c =>
    c.nome?.toLowerCase().includes(busca.toLowerCase()) ||
    c.codigoEntrega?.includes(busca)
  );

  const perfilEntregador = { nome: usuario.nome, tipo: 'entregador' };
  const handleNavigate = (pagina) => setAba(pagina);

  return (
    <div style={{ ...styles.container, backgroundColor: cores.background }}>
      <div style={styles.header}>
        <h1 style={{ ...styles.titulo, color: cores.primary }}>🚚 {usuario.nome}</h1>
        <ProfileMenu usuario={perfilEntregador} onLogout={onLogout} toggleTheme={toggleTheme} onNavigate={handleNavigate} />
      </div>

      {aba === 'clientes' && (
        <>
          <input style={{ ...styles.busca, backgroundColor: cores.card, color: cores.text, borderColor: cores.cardBorder }} placeholder="Buscar cliente..." value={busca} onChange={e => setBusca(e.target.value)} />
          {clientesFiltrados.map(c => {
            const rotaAtiva = minhasRotas.some(r => r.clienteId === c.id);
            return (
              <div key={c.id} style={{ ...styles.card, backgroundColor: cores.card, borderColor: rotaAtiva ? cores.success : cores.cardBorder, borderWidth: rotaAtiva ? 2 : 1 }}>
                <div style={{ flex: 1 }}>
                  <p style={{ ...styles.nome, color: cores.primary }}>{c.nome}</p>
                  <p style={{ ...styles.info, color: cores.textSecondary }}>📍 {c.endereco}{c.apt ? `, Apt ${c.apt}` : ''}</p>
                  <p style={{ ...styles.info, color: cores.textSecondary }}>📞 {c.telefone}</p>
                  <p style={{ ...styles.info, color: cores.textSecondary }}>🔑 {c.codigoEntrega}</p>
                </div>
                <button style={{ ...styles.botaoAtivar, backgroundColor: cores.primary, color: cores.background }} onClick={() => handleAtivarRota(c)}>🚚 Ativar</button>
              </div>
            );
          })}
        </>
      )}

      {aba === 'rotas' && (
        <>
          <h3 style={{ color: cores.primary }}>🚚 Em Andamento ({minhasRotas.length})</h3>
          {minhasRotas.map(r => (
            <div key={r.id} style={{ ...styles.cardRota, backgroundColor: cores.card, borderColor: cores.primary }}>
              <p style={{ color: cores.text }}><strong style={{ color: cores.primary }}>{r.clienteNome}</strong> {r.criadoPor === 'adm' && <span style={{ fontSize: 11, color: cores.primary }}>(ADM)</span>}</p>
              <p style={{ color: cores.textSecondary }}>📍 {r.clienteEndereco}{r.clienteApt ? `, Apt ${r.clienteApt}` : ''}</p>
              <p style={{ color: cores.textSecondary }}>📞 {r.clienteTelefone}</p>
              <p style={{ color: cores.textSecondary }}>🔑 <strong style={{ fontSize: 20, color: cores.primary }}>{r.codigoEntrega}</strong></p>
              <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                <button style={{ ...styles.botaoGPS, backgroundColor: cores.info, color: '#fff' }} onClick={() => abrirGPS(r.clienteEndereco, r.clienteApt)}>📍 GPS</button>
                <button style={{ ...styles.botaoConcluir, backgroundColor: cores.success, color: '#fff' }} onClick={() => handleConcluirRota(r)}>✅ Concluir</button>
              </div>
            </div>
          ))}
        </>
      )}

      {aba === 'concluidas' && (
        <>
          <h3 style={{ color: cores.primary }}>✅ Concluídas ({minhasConcluidas.length})</h3>
          {minhasConcluidas.map(r => (
            <div key={r.id} style={{ ...styles.cardConcluido, backgroundColor: cores.card, borderColor: cores.success }}>
              <p style={{ color: cores.text }}><strong style={{ color: cores.primary }}>{r.clienteNome}</strong></p>
              <p style={{ color: cores.textSecondary }}>🔑 {r.codigoEntrega}</p>
              <p style={{ color: cores.success }}>✅ {new Date(r.concluidoEm).toLocaleString()}</p>
            </div>
          ))}
        </>
      )}
    </div>
  );
}

const styles = {
  container: { minHeight: '100vh', padding: 16 },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 10 },
  titulo: { fontSize: 24, margin: 0 },
  busca: { width: '100%', border: '1px solid', borderRadius: 10, padding: 12, marginBottom: 12 },
  card: { borderRadius: 12, padding: 14, marginBottom: 10, display: 'flex', justifyContent: 'space-between', alignItems: 'center', border: '1px solid' },
  cardRota: { borderRadius: 12, padding: 14, marginBottom: 10, border: '2px solid' },
  cardConcluido: { borderRadius: 12, padding: 14, marginBottom: 10, border: '2px solid' },
  nome: { fontWeight: 'bold', fontSize: 16, margin: 0 },
  info: { fontSize: 13, margin: '2px 0' },
  botaoAtivar: { border: 'none', borderRadius: 8, padding: '8px 16px', fontWeight: 'bold', cursor: 'pointer' },
  botaoGPS: { flex: 1, border: 'none', borderRadius: 8, padding: '10px', cursor: 'pointer', textAlign: 'center' },
  botaoConcluir: { flex: 1, border: 'none', borderRadius: 8, padding: '10px', cursor: 'pointer', textAlign: 'center' }
};
