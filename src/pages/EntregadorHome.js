import React, { useEffect, useState, useRef } from 'react';
import { getClientesRealtime, iniciarRota, concluirRota, getRotasRealtime, atualizarLocalizacao, marcarRotaComoVista } from '../services/firebaseService';
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
  const [rotas, setRotas] = useState([]);
  const [busca, setBusca] = useState('');
  const [aba, setAba] = useState('rotas');
  const watchIdRef = useRef(null);
  const notificadasRef = useRef(new Set());

  useEffect(() => {
    // Escutar rotas em tempo real
    const unsubRotas = getRotasRealtime((novasRotas) => {
      // Verificar novas rotas atribuídas para este entregador
      const minhasNovasRotas = novasRotas.filter(r => 
        r.entregador === usuario.nome && 
        r.status === 'em_andamento' && 
        !notificadasRef.current.has(r.id)
      );
      
      minhasNovasRotas.forEach(r => {
        notificadasRef.current.add(r.id);
        toast.info(`🔔 Nova rota atribuída: ${r.clienteNome} - Código: ${r.codigoEntrega}`);
      });
      
      setRotas(novasRotas);
    });

    // Iniciar rastreamento GPS
    if (navigator.geolocation) {
      watchIdRef.current = navigator.geolocation.watchPosition(
        (pos) => atualizarLocalizacao(usuario.nome, pos.coords.latitude, pos.coords.longitude),
        (err) => console.log('GPS erro:', err),
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 5000 }
      );
    }

    return () => {
      unsubRotas();
      if (watchIdRef.current) navigator.geolocation.clearWatch(watchIdRef.current);
    };
  }, [usuario.nome]);

  const minhasRotas = rotas.filter(r => r.entregador === usuario.nome && r.status === 'em_andamento');
  const minhasConcluidas = rotas.filter(r => r.entregador === usuario.nome && r.status === 'concluida').sort((a, b) => new Date(b.concluidoEm) - new Date(a.concluidoEm));

  const rotasFiltradas = minhasRotas.filter(r =>
    r.clienteNome?.toLowerCase().includes(busca.toLowerCase()) ||
    r.codigoEntrega?.includes(busca)
  );

  const handleConcluirRota = async (rota) => {
    if (!window.confirm(`Concluir entrega de ${rota.clienteNome}?`)) return;
    await concluirRota(rota.id, rota.codigoEntrega);
    toast.success(`✅ Entrega de ${rota.clienteNome} concluída!`);
  };

  const perfilEntregador = { nome: usuario.nome, tipo: 'entregador' };

  const handleNavigate = (pagina) => {
    setAba(pagina);
  };

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

      {/* Conteúdo da aba atual */}
      {aba === 'rotas' && (
        <>
          <div style={styles.barraFerramentas}>
            <input style={{ ...styles.busca, backgroundColor: cores.card, color: cores.text, borderColor: cores.cardBorder }} placeholder="Buscar cliente ou código..." value={busca} onChange={e => setBusca(e.target.value)} />
          </div>
          <h3 style={{ color: cores.primary, marginBottom: 12 }}>🚚 Minhas Entregas ({minhasRotas.length})</h3>
          {minhasRotas.length === 0 && <p style={{ ...styles.vazio, color: cores.textSecondary }}>Nenhuma rota atribuída ainda.</p>}
          {rotasFiltradas.map(r => (
            <div key={r.id} style={{ ...styles.cardRota, backgroundColor: cores.card }}>
              <p style={{ ...styles.nome, color: cores.primary }}>{r.clienteNome}</p>
              <p style={{ ...styles.info, color: cores.textSecondary }}>📍 {r.clienteEndereco}{r.clienteApt ? `, Apt ${r.clienteApt}` : ''}</p>
              <p style={{ ...styles.info, color: cores.textSecondary }}>📞 {r.clienteTelefone}</p>
              <p style={{ ...styles.info, color: cores.textSecondary }}>🔑 Código: <strong style={{ color: cores.primary, fontSize: 20 }}>{r.codigoEntrega}</strong></p>
              <p style={{ ...styles.info, color: cores.textSecondary }}>🕐 Atribuído: {new Date(r.iniciadoEm).toLocaleString()}</p>
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
          <h3 style={{ color: cores.primary, marginBottom: 12 }}>✅ Entregas Concluídas ({minhasConcluidas.length})</h3>
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
  barraFerramentas: { marginBottom: 16 },
  busca: { width: '100%', border: '1px solid', borderRadius: 10, padding: 12, boxSizing: 'border-box' },
  cardRota: { borderRadius: 12, padding: 14, marginBottom: 10, border: '2px solid #e2b96f' },
  cardConcluido: { borderRadius: 12, padding: 14, marginBottom: 10, border: '2px solid #27ae60' },
  nome: { fontWeight: 'bold', fontSize: 16, margin: '0 0 4px 0' },
  info: { fontSize: 13, margin: '0 0 2px 0' },
  botaoGPS: { flex: 1, backgroundColor: '#2980b9', color: '#fff', border: 'none', borderRadius: 8, padding: '10px', fontWeight: 'bold', cursor: 'pointer' },
  botaoConcluir: { flex: 1, backgroundColor: '#27ae60', color: '#fff', border: 'none', borderRadius: 8, padding: '10px', fontWeight: 'bold', cursor: 'pointer' },
  vazio: { textAlign: 'center', marginTop: 40 }
};
