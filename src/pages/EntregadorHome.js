import React, { useEffect, useState, useRef } from 'react';
import { getClientesRealtime, iniciarRota, concluirRota, getRotasRealtime, atualizarLocalizacao } from '../services/firebaseService';
import ProfileMenu from '../components/ProfileMenu';
import { useTheme, getTheme } from '../contexts/ThemeContext';
import { toast } from 'react-toastify';

function abrirGPS(endereco, apt) {
  const end = `${endereco}${apt ? ` ${apt}` : ''}`;
  window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(end)}`, '_blank');
}

export default function EntregadorHome({ usuario, onLogout }) {
  const { darkMode, toggleTheme } = useTheme();
  const cores = getTheme(darkMode);
  const [clientes, setClientes] = useState([]);
  const [rotas, setRotas] = useState([]);
  const [busca, setBusca] = useState('');
  const [aba, setAba] = useState('clientes');
  const [selecionados, setSelecionados] = useState([]);
  const [modoSelecao, setModoSelecao] = useState(false);
  const watchIdRef = useRef(null);

  useEffect(() => {
    const unsub1 = getClientesRealtime(setClientes);
    const unsub2 = getRotasRealtime(setRotas);

    if (navigator.geolocation) {
      watchIdRef.current = navigator.geolocation.watchPosition(
        (pos) => atualizarLocalizacao(usuario.nome, pos.coords.latitude, pos.coords.longitude),
        (err) => console.log('GPS erro:', err),
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 5000 }
      );
    }

    return () => {
      unsub1();
      unsub2();
      if (watchIdRef.current) navigator.geolocation.clearWatch(watchIdRef.current);
    };
  }, [usuario.nome]);

  const minhasRotas = rotas.filter(r => r.entregador === usuario.nome && r.status === 'em_andamento');
  const minhasConcluidas = rotas.filter(r => r.entregador === usuario.nome && r.status === 'concluida').sort((a, b) => new Date(b.concluidoEm) - new Date(a.concluidoEm));

  const clientesFiltrados = clientes.filter(c =>
    c?.nome?.toLowerCase().includes(busca.toLowerCase()) ||
    c?.codigoEntrega?.includes(busca)
  );

  const toggleSelecionar = (clienteId) => {
    setSelecionados(prev =>
      prev.includes(clienteId) ? prev.filter(id => id !== clienteId) : [...prev, clienteId]
    );
  };

  const iniciarRotasSelecionadas = async () => {
    if (selecionados.length === 0) { toast.warning('Selecione ao menos um cliente!'); return; }
    for (const id of selecionados) {
      const cliente = clientes.find(c => c.id === id);
      if (cliente) {
        const jaEmRota = rotas.find(r => r.clienteId === id && r.status === 'em_andamento');
        if (!jaEmRota) await iniciarRota(cliente, usuario.nome);
      }
    }
    setSelecionados([]);
    setModoSelecao(false);
    setAba('rotas');
    toast.success(`${selecionados.length} rota(s) iniciada(s)!`);
  };

  const handleConcluirRota = async (rota) => {
    if (!window.confirm(`Concluir entrega de ${rota.clienteNome}?`)) return;
    await concluirRota(rota.id, rota.codigoEntrega);
    toast.success(`✅ Entrega de ${rota.clienteNome} concluída!`);
  };

  const handleNavigate = (pagina) => {
    setAba(pagina);
  };

  const perfilEntregador = { nome: usuario.nome, tipo: 'entregador' };

  return (
    <div style={{ ...styles.container, backgroundColor: cores.background }}>
      <div style={styles.header}>
        <h1 style={{ ...styles.titulo, color: cores.primary }}>🚚 NossoGranel</h1>
        <ProfileMenu 
          usuario={perfilEntregador}
          onLogout={onLogout}
          toggleTheme={toggleTheme}
          onNavigate={handleNavigate}
        />
      </div>

      <div style={{ ...styles.atalhos, backgroundColor: cores.card }}>
        <span style={{ color: cores.text }}>📅 {new Date().toLocaleDateString('pt-BR')}</span>
        <span style={{ color: cores.text }}>🎯 Meta: 15 entregas/dia</span>
      </div>

      <div style={styles.subAbas}>
        <button style={aba === 'clientes' ? { ...styles.abaAtiva, backgroundColor: cores.primary, color: cores.background } : { ...styles.aba, backgroundColor: cores.card, color: cores.text }} onClick={() => setAba('clientes')}>👥 Clientes</button>
        <button style={aba === 'rotas' ? { ...styles.abaAtiva, backgroundColor: cores.primary, color: cores.background } : { ...styles.aba, backgroundColor: cores.card, color: cores.text }} onClick={() => setAba('rotas')}>🚚 Em Rota ({minhasRotas.length})</button>
        <button style={aba === 'concluidas' ? { ...styles.abaAtiva, backgroundColor: cores.primary, color: cores.background } : { ...styles.aba, backgroundColor: cores.card, color: cores.text }} onClick={() => setAba('concluidas')}>✅ Concluídas ({minhasConcluidas.length})</button>
      </div>

      {aba === 'clientes' && (
        <>
          <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
            <button
              style={{ ...styles.botaoSelecao, backgroundColor: modoSelecao ? '#c0392b' : cores.primary, color: modoSelecao ? '#fff' : cores.background }}
              onClick={() => { setModoSelecao(!modoSelecao); setSelecionados([]); }}>
              {modoSelecao ? '✖ Cancelar' : '☑️ Selecionar'}
            </button>
            {modoSelecao && selecionados.length > 0 && (
              <button style={{ ...styles.botaoSelecao, backgroundColor: '#27ae60', color: '#fff' }} onClick={iniciarRotasSelecionadas}>
                🚚 Iniciar {selecionados.length} rota(s)
              </button>
            )}
          </div>

          <input style={{ ...styles.busca, backgroundColor: cores.card, color: cores.text, borderColor: cores.cardBorder }} placeholder="Buscar cliente ou código..." value={busca} onChange={e => setBusca(e.target.value)} />

          {clientesFiltrados.map(c => {
            const emRota = rotas.find(r => r.clienteId === c.id && r.status === 'em_andamento');
            const selecionado = selecionados.includes(c.id);
            return (
              <div key={c.id} style={{ ...styles.card, backgroundColor: cores.card, borderColor: selecionado ? '#27ae60' : emRota ? cores.primary : cores.cardBorder, borderWidth: selecionado || emRota ? 2 : 1 }}>
                <div style={{ flex: 1 }}>
                  <p style={{ ...styles.nome, color: cores.primary }}>
                    {c.nome}
                    {emRota && <span style={{ fontSize: 12, color: '#27ae60', marginLeft: 8 }}>🚚 Em rota</span>}
                  </p>
                  <p style={{ ...styles.info, color: cores.textSecondary }}>📍 {c.endereco}{c.apt ? `, Apt ${c.apt}` : ''}</p>
                  <p style={{ ...styles.info, color: cores.textSecondary }}>📞 {c.telefone}</p>
                  <p style={{ ...styles.info, color: cores.textSecondary }}>🔑 {c.codigoEntrega}</p>
                </div>
                <div>
                  {modoSelecao ? (
                    <button
                      style={{ ...styles.botaoCheck, backgroundColor: selecionado ? '#27ae60' : cores.cardBorder, color: '#fff' }}
                      onClick={() => toggleSelecionar(c.id)}>
                      {selecionado ? '✓' : '○'}
                    </button>
                  ) : (
                    !emRota && (
                      <button style={{ ...styles.botaoIniciar, backgroundColor: cores.primary, color: cores.background }} onClick={async () => {
                        await iniciarRota(c, usuario.nome);
                        setAba('rotas');
                        toast.success(`Rota iniciada para ${c.nome}!`);
                      }}>🚚</button>
                    )
                  )}
                </div>
              </div>
            );
          })}
          {clientesFiltrados.length === 0 && <p style={{ ...styles.vazio, color: cores.textSecondary }}>Nenhum cliente encontrado.</p>}
        </>
      )}

      {aba === 'rotas' && (
        <>
          <h3 style={{ color: cores.primary, marginBottom: 12 }}>🚚 Minhas Entregas em Andamento</h3>
          {minhasRotas.length === 0 && <p style={{ ...styles.vazio, color: cores.textSecondary }}>Nenhuma rota em andamento.</p>}
          {minhasRotas.map(r => (
            <div key={r.id} style={{ ...styles.cardRota, backgroundColor: cores.card }}>
              <p style={{ ...styles.nome, color: cores.primary }}>{r.clienteNome}</p>
              <p style={{ ...styles.info, color: cores.textSecondary }}>📍 {r.clienteEndereco}{r.clienteApt ? `, Apt ${r.clienteApt}` : ''}</p>
              <p style={{ ...styles.info, color: cores.textSecondary }}>📞 {r.clienteTelefone}</p>
              <p style={{ ...styles.info, color: cores.textSecondary }}>🔑 Código: <strong style={{ color: cores.primary, fontSize: 20 }}>{r.codigoEntrega}</strong></p>
              <p style={{ ...styles.info, color: cores.textSecondary }}>🕐 Iniciado: {new Date(r.iniciadoEm).toLocaleString()}</p>
              <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                <button style={styles.botaoGPS} onClick={() => abrirGPS(r.clienteEndereco, r.clienteApt)}>📍 GPS</button>
                <button style={styles.botaoConcluir} onClick={() => handleConcluirRota(r)}>✅ Concluir</button>
              </div>
            </div>
          ))}
        </>
      )}

      {aba === 'concluidas' && (
        <>
          <h3 style={{ color: cores.primary, marginBottom: 12 }}>✅ Minhas Entregas Concluídas</h3>
          {minhasConcluidas.length === 0 && <p style={{ ...styles.vazio, color: cores.textSecondary }}>Nenhuma entrega concluída.</p>}
          {minhasConcluidas.map(r => (
            <div key={r.id} style={{ ...styles.cardConcluido, backgroundColor: cores.card }}>
              <p style={{ ...styles.nome, color: cores.primary }}>{r.clienteNome}</p>
              <p style={{ ...styles.info, color: cores.textSecondary }}>🔑 Código: <strong style={{ color: '#27ae60' }}>{r.codigoEntrega}</strong></p>
              <p style={{ ...styles.info, color: cores.textSecondary }}>🕐 Início: {new Date(r.iniciadoEm).toLocaleString()}</p>
              <p style={{ ...styles.info, color: '#27ae60' }}>✅ Conclusão: {new Date(r.concluidoEm).toLocaleString()}</p>
            </div>
          ))}
        </>
      )}
    </div>
  );
}

const styles = {
  container: { minHeight: '100vh', padding: 16 },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, paddingTop: 20, flexWrap: 'wrap', gap: 10 },
  titulo: { fontSize: 24, margin: 0 },
  atalhos: { display: 'flex', gap: 8, marginBottom: 16, padding: 12, borderRadius: 12, flexWrap: 'wrap', justifyContent: 'center' },
  subAbas: { display: 'flex', gap: 8, marginBottom: 16 },
  aba: { flex: 1, border: '1px solid', borderRadius: 8, padding: '8px 4px', fontSize: 12, cursor: 'pointer', textAlign: 'center' },
  abaAtiva: { flex: 1, border: 'none', borderRadius: 8, padding: '8px 4px', fontSize: 12, fontWeight: 'bold', cursor: 'pointer', textAlign: 'center' },
  busca: { width: '100%', border: '1px solid', borderRadius: 10, padding: 12, marginBottom: 12, boxSizing: 'border-box' },
  card: { borderRadius: 12, padding: 14, marginBottom: 10, display: 'flex', justifyContent: 'space-between', alignItems: 'center', border: '1px solid' },
  cardRota: { borderRadius: 12, padding: 14, marginBottom: 10, border: '2px solid #e2b96f' },
  cardConcluido: { borderRadius: 12, padding: 14, marginBottom: 10, border: '2px solid #27ae60' },
  nome: { fontWeight: 'bold', fontSize: 16, margin: '0 0 4px 0' },
  info: { fontSize: 13, margin: '0 0 2px 0' },
  botaoIniciar: { border: 'none', borderRadius: 8, padding: '8px 12px', fontWeight: 'bold', cursor: 'pointer' },
  botaoSelecao: { border: 'none', borderRadius: 8, padding: '8px 16px', fontWeight: 'bold', cursor: 'pointer' },
  botaoCheck: { border: 'none', borderRadius: 8, padding: '8px 12px', fontSize: 16, cursor: 'pointer', minWidth: 44 },
  botaoGPS: { flex: 1, backgroundColor: '#2980b9', color: '#fff', border: 'none', borderRadius: 8, padding: '10px', fontWeight: 'bold', cursor: 'pointer' },
  botaoConcluir: { flex: 1, backgroundColor: '#27ae60', color: '#fff', border: 'none', borderRadius: 8, padding: '10px', fontWeight: 'bold', cursor: 'pointer' },
  vazio: { textAlign: 'center', marginTop: 40 }
};
