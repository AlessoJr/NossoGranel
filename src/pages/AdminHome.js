import React, { useEffect, useState } from 'react';
import { getClientesRealtime, getRotasRealtime, salvarCliente, excluirCliente, excluirRota, criarRota, getLocalizacoesRealtime, getEntregadores } from '../services/firebaseService';
import FormCliente from '../components/FormCliente';
import AdminConfiguracoes from './AdminConfiguracoes';
import CadastroEntregador from './CadastroEntregador';
import Estatisticas from './Estatisticas';
import ProfileMenu from '../components/ProfileMenu';
import { useTheme, getTheme } from '../contexts/ThemeContext';
import { toast } from 'react-toastify';

function safeString(valor) {
  return valor == null ? '' : String(valor);
}

function copiar(texto, label) {
  const valor = safeString(texto);
  if (!valor) return toast.warning('Nada para copiar');
  navigator.clipboard.writeText(valor).then(() => toast.success(`${label} copiado!`));
}

function abrirGPS(endereco, apt) {
  const end = `${safeString(endereco)}${apt ? `, Apt ${apt}` : ''}`;
  if (!end.trim()) return toast.warning('Endereço não informado');
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
  const [showEntregadores, setShowEntregadores] = useState(false);
  const [showEstatisticas, setShowEstatisticas] = useState(false);
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
      toast.success('Cliente salvo!');
    } catch (error) {
      toast.error(`Erro: ${error.message}`);
    }
  };

  const handleExcluirCliente = async (clienteId, clienteNome) => {
    if (!clienteId) { toast.error('ID inválido'); return; }
    if (!window.confirm(`Excluir ${clienteNome}?`)) return;
    try {
      const rotasDoCliente = rotas.filter(r => r.clienteId === clienteId);
      for (const rota of rotasDoCliente) await excluirRota(rota.id);
      await excluirCliente(clienteId);
      toast.success(`${clienteNome} excluído!`);
    } catch (error) {
      toast.error('Erro ao excluir. Tente novamente.');
    }
  };

  const handleAtribuirRota = async (cliente) => {
    if (!entregadorSelecionado) { toast.warning('Selecione um entregador'); return; }
    await criarRota(cliente, entregadorSelecionado, 'adm');
    toast.success(`Rota de ${cliente.nome} atribuída`);
    setEntregadorSelecionado('');
  };

  const rotasEmAndamento = rotas.filter(r => r.status === 'em_andamento');
  const rotasConcluidas = rotas.filter(r => r.status === 'concluida').sort((a, b) => new Date(b.concluidoEm) - new Date(a.concluidoEm));

  const clientesFiltrados = clientes.filter(c => {
    const nome = safeString(c.nome).toLowerCase();
    const telefone = safeString(c.telefone);
    const codigo = safeString(c.codigoEntrega);
    const termo = busca.toLowerCase();
    return nome.includes(termo) || telefone.includes(termo) || codigo.includes(termo);
  });

  const perfilAdmin = { nome: 'Administrador', tipo: 'admin' };
  const handleNavigate = (pagina) => {
    if (pagina === "configuracoes") setShowConfig(true);
    else if (pagina === "entregadores_cadastro") setShowEntregadores(true);
    else if (pagina === "estatisticas") setShowEstatisticas(true);
    else setAba(pagina);
  };

  if (showConfig) return <AdminConfiguracoes onVoltar={() => setShowConfig(false)} />;
  if (showEntregadores) return <CadastroEntregador onVoltar={() => setShowEntregadores(false)} />;
  if (showEstatisticas) return <Estatisticas onVoltar={() => setShowEstatisticas(false)} />;
  if (formAberto) return <FormCliente cliente={clienteEditando} clientes={clientes} onSalvar={handleSalvarCliente} onCancelar={() => { setFormAberto(false); setClienteEditando(null); }} />;

  return (
    <div style={{ ...styles.container, backgroundColor: cores.background }}>
      <div style={styles.header}>
        <h1 style={{ ...styles.titulo, color: cores.primary }}>🌾 NossoGranel</h1>
        <ProfileMenu usuario={perfilAdmin} onLogout={onLogout} toggleTheme={toggleTheme} onNavigate={handleNavigate} />
      </div>

      {aba === 'clientes' && (
        <>
          <div style={styles.barraFerramentas}>
            <button style={{ ...styles.botaoNovo, backgroundColor: cores.primary, color: cores.background }} onClick={() => { setClienteEditando(null); setFormAberto(true); }}>➕ Novo</button>
            <input style={{ ...styles.busca, backgroundColor: cores.card, color: cores.text, borderColor: cores.cardBorder }} placeholder="Buscar..." value={busca} onChange={e => setBusca(e.target.value)} />
          </div>
          {clientesFiltrados.map(c => {
            const emRota = rotasEmAndamento.some(r => r.clienteId === c.id);
            return (
              <div key={c.id} style={{ ...styles.card, backgroundColor: cores.card, borderColor: emRota ? cores.success : cores.cardBorder }}>
                <div style={{ flex: 1 }}>
                  <p style={{ ...styles.info, color: cores.primary, fontWeight: 'bold', fontSize: 16 }}>
                    {safeString(c.nome) || 'Sem nome'}
                    {emRota && <span style={{ color: cores.success, fontSize: 12, marginLeft: 8 }}>🚚 Em rota</span>}
                  </p>
                  <p style={{ ...styles.info, color: cores.text }}>📞 <span style={{ color: cores.primary, cursor: 'pointer', textDecoration: 'underline' }} onClick={() => copiar(c.telefone, 'Telefone')}>{safeString(c.telefone) || '---'}</span></p>
                  <p style={{ ...styles.info, color: cores.text }}>📍 {safeString(c.endereco) || '---'}{c.apt ? `, Apt ${c.apt}` : ''}</p>
                  <p style={{ ...styles.info, color: cores.text }}>🔑 <span style={{ color: cores.primary, cursor: 'pointer', textDecoration: 'underline' }} onClick={() => copiar(c.codigoEntrega, 'Código')}>{safeString(c.codigoEntrega) || '---'}</span> | 🛒 {c.qtdPedidos || 0}</p>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <select value={entregadorSelecionado} onChange={e => setEntregadorSelecionado(e.target.value)} style={{ ...styles.select, backgroundColor: cores.cardBorder, color: cores.text }}>
                    <option value="">Entregador</option>
                    {entregadores.map(e => <option key={e}>{e}</option>)}
                  </select>
                  <button style={styles.botaoAtribuir} onClick={() => handleAtribuirRota(c)}>🚚 Atribuir</button>
                  <button style={{ ...styles.botaoEditar, backgroundColor: cores.cardBorder }} onClick={() => { setClienteEditando(c); setFormAberto(true); }}>✏️</button>
                  <button style={styles.botaoDeletar} onClick={() => handleExcluirCliente(c.id, c.nome || 'cliente')}>🗑️</button>
                </div>
              </div>
            );
          })}
          {clientesFiltrados.length === 0 && <p style={{ color: cores.textSecondary, textAlign: 'center', marginTop: 40 }}>Nenhum cliente encontrado.</p>}
        </>
      )}

      {aba === 'rotas' && (
        <>
          <h3 style={{ color: cores.primary }}>🚚 Em Andamento ({rotasEmAndamento.length})</h3>
          {rotasEmAndamento.length === 0 && <p style={{ color: cores.textSecondary, textAlign: 'center' }}>Nenhuma rota em andamento.</p>}
          {rotasEmAndamento.map(r => {
            const loc = localizacoes.find(l => l.entregador === r.entregador);
            return (
              <div key={r.id} style={{ ...styles.cardRota, backgroundColor: cores.card, borderColor: cores.primary }}>
                <p style={{ ...styles.info, color: cores.primary, fontWeight: 'bold' }}>{r.clienteNome} <span style={{ color: cores.text, fontWeight: 'normal' }}>- 👤 {r.entregador}</span></p>
                <p style={{ ...styles.info, color: cores.text }}>📍 {r.clienteEndereco}{r.clienteApt ? `, Apt ${r.clienteApt}` : ''}</p>
                <p style={{ ...styles.info, color: cores.text }}>🔑 {r.codigoEntrega} | 🕐 {new Date(r.iniciadoEm).toLocaleString()}</p>
                <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                  <button style={{ ...styles.botaoAtribuir, flex: 1 }} onClick={() => abrirGPS(r.clienteEndereco, r.clienteApt)}>📍 Destino</button>
                  {loc && <button style={{ ...styles.botaoAtribuir, flex: 1 }} onClick={() => abrirLocalizacaoEntregador(loc.lat, loc.lng)}>👤 Ver {r.entregador}</button>}
                  <button style={styles.botaoDeletar} onClick={() => excluirRota(r.id)}>🗑️</button>
                </div>
              </div>
            );
          })}
        </>
      )}

      {aba === 'historico' && (
        <>
          <h3 style={{ color: cores.primary }}>📋 Concluídas ({rotasConcluidas.length})</h3>
          {rotasConcluidas.length === 0 && <p style={{ color: cores.textSecondary, textAlign: 'center' }}>Nenhuma entrega concluída.</p>}
          {rotasConcluidas.map(r => (
            <div key={r.id} style={{ ...styles.cardConcluido, backgroundColor: cores.card, borderColor: cores.success }}>
              <p style={{ ...styles.info, color: cores.primary, fontWeight: 'bold' }}>{r.clienteNome} <span style={{ color: cores.text, fontWeight: 'normal' }}>- 👤 {r.entregador}</span></p>
              <p style={{ ...styles.info, color: cores.text }}>🔑 {r.codigoEntrega}</p>
              <p style={{ ...styles.info, color: cores.success }}>✅ {new Date(r.concluidoEm).toLocaleString()}</p>
            </div>
          ))}
        </>
      )}

      {aba === 'entregadores' && (
        <>
          <h3 style={{ color: cores.primary }}>📍 Entregadores</h3>
          {localizacoes.length === 0 && <p style={{ color: cores.textSecondary, textAlign: 'center' }}>Nenhum entregador ativo.</p>}
          {localizacoes.map(l => (
            <div key={l.id} style={{ ...styles.cardRota, backgroundColor: cores.card, borderColor: cores.info }}>
              <p style={{ ...styles.info, color: cores.primary, fontWeight: 'bold' }}>{l.entregador}</p>
              <p style={{ ...styles.info, color: cores.text }}>🚚 {rotasEmAndamento.filter(r => r.entregador === l.entregador).length} rota(s)</p>
              <p style={{ ...styles.info, color: cores.text }}>📡 {new Date(l.atualizadoEm).toLocaleTimeString()}</p>
              <button style={{ ...styles.botaoAtribuir }} onClick={() => abrirLocalizacaoEntregador(l.lat, l.lng)}>📍 Ver no Mapa</button>
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
  busca: { flex: 1, padding: 10, borderRadius: 8, border: '1px solid' },
  card: { borderRadius: 12, padding: 14, marginBottom: 10, display: 'flex', justifyContent: 'space-between', border: '1px solid' },
  cardRota: { borderRadius: 12, padding: 14, marginBottom: 10, border: '2px solid' },
  cardConcluido: { borderRadius: 12, padding: 14, marginBottom: 10, border: '2px solid' },
  info: { fontSize: 13, margin: '0 0 4px 0' },
  select: { padding: 8, borderRadius: 8, border: 'none', cursor: 'pointer' },
  botaoAtribuir: { backgroundColor: '#27ae60', color: '#fff', border: 'none', padding: 8, borderRadius: 8, cursor: 'pointer', fontSize: 13 },
  botaoEditar: { color: '#fff', border: 'none', padding: 8, borderRadius: 8, cursor: 'pointer', fontSize: 18 },
  botaoDeletar: { backgroundColor: '#c0392b', color: '#fff', border: 'none', padding: 8, borderRadius: 8, cursor: 'pointer', fontSize: 18 }
};
