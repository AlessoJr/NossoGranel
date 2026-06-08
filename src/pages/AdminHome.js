import React, { useEffect, useState } from 'react';
import { getClientesRealtime, getRotasRealtime, salvarCliente, excluirCliente, excluirRota, criarRota, getLocalizacoesRealtime, getEntregadores } from '../services/firebaseService';
import FormCliente from '../components/FormCliente';
import AdminConfiguracoes from './AdminConfiguracoes';
import ProfileMenu from '../components/ProfileMenu';
import { useTheme, getTheme } from '../contexts/ThemeContext';
import { toast } from 'react-toastify';

function copiar(texto, label) {
  navigator.clipboard.writeText(texto).then(() => toast.success(`${label} copiado!`));
}

function abrirGPS(endereco, apt) {
  const end = `${endereco}${apt ? ` ${apt}` : ''}`;
  window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(end)}`, '_blank');
}

function abrirLocalizacaoEntregador(lat, lng) {
  window.open(`https://www.google.com/maps?q=${lat},${lng}`, '_blank');
}

export default function AdminHome({ onLogout }) {
  const { darkMode, toggleTheme } = useTheme();
  const cores = getTheme(darkMode);
  const [clientes, setClientes] = useState([]);
  const [rotas, setRotas] = useState([]);
  const [localizacoes, setLocalizacoes] = useState([]);
  const [entregadores, setEntregadores] = useState(['Entregador']);
  const [busca, setBusca] = useState('');
  const [aba, setAba] = useState('clientes');
  const [formAberto, setFormAberto] = useState(false);
  const [clienteEditando, setClienteEditando] = useState(null);
  const [showConfig, setShowConfig] = useState(false);
  const [entregadorSelecionado, setEntregadorSelecionado] = useState('');

  useEffect(() => {
    getEntregadores(setEntregadores);
    const unsub1 = getClientesRealtime(setClientes);
    const unsub2 = getRotasRealtime(setRotas);
    const unsub3 = getLocalizacoesRealtime(setLocalizacoes);
    return () => { unsub1(); unsub2(); unsub3(); };
  }, []);

  const handleSalvarCliente = async (cliente) => {
    try {
      await salvarCliente(cliente);
      setFormAberto(false);
      setClienteEditando(null);
      toast.success('Cliente salvo com sucesso!');
    } catch (error) {
      alert(`Erro ao salvar: ${error.message}`);
    }
  };

  const handleExcluirCliente = async (clienteId, clienteNome) => {
    if (!window.confirm(`Excluir ${clienteNome} permanentemente?`)) return;
    try {
      // Primeiro tenta excluir todas as rotas associadas a este cliente
      const rotasDoCliente = rotas.filter(r => r.clienteId === clienteId);
      for (const rota of rotasDoCliente) {
        await excluirRota(rota.id);
      }
      // Depois exclui o cliente
      await excluirCliente(clienteId);
      toast.success(`${clienteNome} excluído com sucesso!`);
    } catch (error) {
      alert(`Erro ao excluir: ${error.message}`);
    }
  };

  const handleAtribuirRota = async (cliente) => {
    if (!entregadorSelecionado) { toast.warning('Selecione um entregador!'); return; }
    await criarRota(cliente, entregadorSelecionado, 'adm');
    toast.success(`Rota de ${cliente.nome} atribuída!`);
    setEntregadorSelecionado('');
  };

  const rotasEmAndamento = rotas.filter(r => r.status === 'em_andamento');
  const rotasConcluidas = rotas.filter(r => r.status === 'concluida').sort((a, b) => new Date(b.concluidoEm) - new Date(a.concluidoEm));

  const clientesFiltrados = clientes.filter(c =>
    c.nome?.toLowerCase().includes(busca.toLowerCase()) ||
    c.telefone?.includes(busca) ||
    c.codigoEntrega?.includes(busca)
  );

  const perfilAdmin = { nome: 'Administrador', tipo: 'admin' };
  const handleNavigate = (pagina) => {
    if (pagina === 'configuracoes') setShowConfig(true);
    else setAba(pagina);
  };

  if (showConfig) return <AdminConfiguracoes onVoltar={() => setShowConfig(false)} />;
  if (formAberto) return <FormCliente cliente={clienteEditando} onSalvar={handleSalvarCliente} onCancelar={() => { setFormAberto(false); setClienteEditando(null); }} />;

  return (
    <div style={{ ...styles.container, backgroundColor: cores.background }}>
      <div style={styles.header}>
        <h1 style={{ ...styles.titulo, color: cores.primary }}>🌾 NossoGranel</h1>
        <ProfileMenu usuario={perfilAdmin} onLogout={onLogout} toggleTheme={toggleTheme} onNavigate={handleNavigate} />
      </div>

      {aba === 'clientes' && (
        <>
          <div style={styles.barraFerramentas}>
            <button style={{ ...styles.botaoNovo, backgroundColor: cores.primary, color: cores.background }} onClick={() => { setClienteEditando(null); setFormAberto(true); }}>➕ Novo Cliente</button>
            <input style={{ ...styles.busca, backgroundColor: cores.card, color: cores.text, borderColor: cores.cardBorder }} placeholder="Buscar..." value={busca} onChange={e => setBusca(e.target.value)} />
          </div>
          {clientesFiltrados.map(c => {
            const rotaAtiva = rotasEmAndamento.find(r => r.clienteId === c.id);
            const isEmRota = !!rotaAtiva;
            return (
              <div key={c.id} style={{ ...styles.card, backgroundColor: cores.card, borderColor: isEmRota ? cores.success : cores.cardBorder, borderWidth: isEmRota ? 2 : 1 }}>
                <div style={{ flex: 1 }}>
                  <p style={{ ...styles.nome, color: cores.primary }}>
                    {c.nome} 
                    {isEmRota && <span style={{ fontSize: 11, color: cores.success, marginLeft: 8 }}>🚚 {rotaAtiva.entregador}</span>}
                  </p>
                  <p style={{ ...styles.info, color: cores.textSecondary }}>📞 <span style={{ ...styles.copiavel, color: cores.primary }} onClick={() => copiar(c.telefone, 'Telefone')}>{c.telefone}</span></p>
                  <p style={{ ...styles.info, color: cores.textSecondary }}>📍 {c.endereco}{c.apt ? `, Apt ${c.apt}` : ''}</p>
                  <p style={{ ...styles.info, color: cores.textSecondary }}>🔑 <span style={{ ...styles.copiavel, color: cores.primary }} onClick={() => copiar(c.codigoEntrega, 'Código')}>{c.codigoEntrega}</span> | 🛒 {c.qtdPedidos}</p>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <select style={{ ...styles.select, backgroundColor: cores.cardBorder, color: cores.text }} value={entregadorSelecionado} onChange={(e) => setEntregadorSelecionado(e.target.value)}>
                    <option value="">Entregador</option>
                    {entregadores.map(e => <option key={e} value={e}>{e}</option>)}
                  </select>
                  <button style={{ ...styles.botaoAtribuir, backgroundColor: cores.success, color: '#fff' }} onClick={() => handleAtribuirRota(c)}>🚚 Atribuir</button>
                  <button style={{ ...styles.botaoEditar, backgroundColor: cores.cardBorder, color: cores.text }} onClick={() => { setClienteEditando(c); setFormAberto(true); }}>✏️</button>
                  <button style={{ ...styles.botaoDeletar, backgroundColor: cores.danger, color: '#fff' }} onClick={() => handleExcluirCliente(c.id, c.nome)}>🗑️</button>
                </div>
              </div>
            );
          })}
        </>
      )}

      {aba === 'rotas' && (
        <>
          <h3 style={{ color: cores.primary }}>🚚 Em Andamento ({rotasEmAndamento.length})</h3>
          {rotasEmAndamento.map(r => {
            const loc = localizacoes.find(l => l.entregador === r.entregador);
            return (
              <div key={r.id} style={{ ...styles.cardRota, backgroundColor: cores.card, borderColor: cores.primary }}>
                <p style={{ color: cores.text }}><strong style={{ color: cores.primary }}>{r.clienteNome}</strong> - 👤 <span style={{ color: cores.text }}>{r.entregador}</span></p>
                <p style={{ color: cores.textSecondary }}>📍 {r.clienteEndereco}{r.clienteApt ? `, Apt ${r.clienteApt}` : ''}</p>
                <p style={{ color: cores.textSecondary }}>🔑 {r.codigoEntrega} | 🕐 {new Date(r.iniciadoEm).toLocaleString()}</p>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button style={{ ...styles.botaoGPS, backgroundColor: cores.info, color: '#fff' }} onClick={() => abrirGPS(r.clienteEndereco, r.clienteApt)}>📍 Destino</button>
                  {loc && <button style={{ ...styles.botaoEntregador, backgroundColor: cores.info, color: '#fff' }} onClick={() => abrirLocalizacaoEntregador(loc.lat, loc.lng)}>👤 Ver {r.entregador}</button>}
                  <button style={{ ...styles.botaoDeletar, backgroundColor: cores.cardBorder, color: cores.text }} onClick={() => excluirRota(r.id)}>🗑️</button>
                </div>
              </div>
            );
          })}
        </>
      )}

      {aba === 'historico' && (
        <>
          <h3 style={{ color: cores.primary }}>📋 Concluídas ({rotasConcluidas.length})</h3>
          {rotasConcluidas.map(r => (
            <div key={r.id} style={{ ...styles.cardConcluido, backgroundColor: cores.card, borderColor: cores.success }}>
              <p style={{ color: cores.text }}><strong style={{ color: cores.primary }}>{r.clienteNome}</strong> - 👤 <span style={{ color: cores.text }}>{r.entregador}</span></p>
              <p style={{ color: cores.textSecondary }}>🔑 {r.codigoEntrega}</p>
              <p style={{ color: cores.success }}>✅ {new Date(r.concluidoEm).toLocaleString()}</p>
            </div>
          ))}
        </>
      )}

      {aba === 'entregadores' && (
        <>
          <h3 style={{ color: cores.primary }}>📍 Entregadores</h3>
          {localizacoes.map(l => (
            <div key={l.id} style={{ ...styles.cardEntregador, backgroundColor: cores.card, borderColor: cores.info }}>
              <p style={{ color: cores.text }}><strong style={{ color: cores.primary }}>{l.entregador}</strong></p>
              <p style={{ color: cores.textSecondary }}>🚚 {rotasEmAndamento.filter(r => r.entregador === l.entregador).length} rota(s)</p>
              <p style={{ color: cores.textSecondary }}>📡 {new Date(l.atualizadoEm).toLocaleTimeString()}</p>
              <button style={{ ...styles.botaoEntregador, backgroundColor: cores.info, color: '#fff' }} onClick={() => abrirLocalizacaoEntregador(l.lat, l.lng)}>📍 Mapa</button>
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
  barraFerramentas: { display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' },
  botaoNovo: { border: 'none', borderRadius: 8, padding: '10px 16px', fontWeight: 'bold', cursor: 'pointer' },
  busca: { flex: 1, border: '1px solid', borderRadius: 10, padding: 10 },
  card: { borderRadius: 12, padding: 14, marginBottom: 10, display: 'flex', justifyContent: 'space-between', border: '1px solid' },
  cardRota: { borderRadius: 12, padding: 14, marginBottom: 10, border: '2px solid' },
  cardConcluido: { borderRadius: 12, padding: 14, marginBottom: 10, border: '2px solid' },
  cardEntregador: { borderRadius: 12, padding: 14, marginBottom: 10, border: '2px solid' },
  nome: { fontWeight: 'bold', fontSize: 16, margin: '0 0 4px 0' },
  info: { fontSize: 13, margin: '0 0 2px 0' },
  copiavel: { textDecoration: 'underline', cursor: 'pointer' },
  select: { borderRadius: 8, padding: 8, fontSize: 13, border: 'none', cursor: 'pointer' },
  botaoAtribuir: { border: 'none', borderRadius: 8, padding: '8px', fontSize: 13, cursor: 'pointer', textAlign: 'center' },
  botaoEditar: { border: 'none', fontSize: 18, cursor: 'pointer', padding: '8px', borderRadius: 8, textAlign: 'center' },
  botaoDeletar: { border: 'none', fontSize: 18, cursor: 'pointer', padding: '8px', borderRadius: 8, textAlign: 'center' },
  botaoGPS: { flex: 1, border: 'none', borderRadius: 8, padding: '8px', fontSize: 12, cursor: 'pointer', textAlign: 'center' },
  botaoEntregador: { flex: 1, border: 'none', borderRadius: 8, padding: '8px', fontSize: 12, cursor: 'pointer', textAlign: 'center' }
};
