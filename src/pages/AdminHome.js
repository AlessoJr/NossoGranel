import React, { useEffect, useState } from 'react';
import { getClientesRealtime, getRotasRealtime, salvarCliente, excluirCliente, excluirRota, criarRota, getLocalizacoesRealtime, getEntregadores, criarNotificacao } from '../services/firebaseService';
import FormCliente from '../components/FormCliente';
import AdminConfiguracoes from './AdminConfiguracoes';
import CadastroEntregador from './CadastroEntregador';
import Estatisticas from './Estatisticas';
import Chat from './Chat';
import ProfileMenu from '../components/ProfileMenu';
import { useTheme, getTheme } from '../contexts/ThemeContext';
import { toast } from 'react-toastify';
import { playNotificationSound } from '../utils/sound';

const NOTIFICACOES_VISTAS_KEY = 'admin_notificacoes_vistas';

function safeString(valor) {
  return valor == null ? '' : String(valor);
}

function copiar(texto, label) {
  const valor = safeString(texto);
  if (!valor) return toast.warning('Nada para copiar');
  navigator.clipboard.writeText(valor).then(() => {
    playNotificationSound();
    toast.success(`${label} copiado!`);
  });
}

function abrirGPS(endereco, apt) {
  const end = `${safeString(endereco)}${apt ? `, Apt ${apt}` : ''}`;
  if (!end.trim()) return toast.warning('Endereço não informado');
  window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(end)}`, '_blank');
}

function abrirLocalizacaoEntregador(lat, lng) {
  window.open(`https://www.google.com/maps?q=${lat},${lng}`, '_blank');
}

function distancia(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon/2) * Math.sin(dLon/2);
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
}

function otimizarPorProximidade(clientes) {
  if (clientes.length <= 1) return clientes;
  const comCoord = clientes.filter(c => c.lat && c.lng);
  const semCoord = clientes.filter(c => !c.lat || !c.lng);
  if (comCoord.length <= 1) return clientes;

  const resultado = [comCoord[0]];
  let restantes = comCoord.slice(1);

  while (restantes.length > 0) {
    const ultimo = resultado[resultado.length - 1];
    let idxProximo = 0;
    let minDist = Infinity;
    restantes.forEach((c, idx) => {
      const d = distancia(ultimo.lat, ultimo.lng, c.lat, c.lng);
      if (d < minDist) { minDist = d; idxProximo = idx; }
    });
    resultado.push(restantes[idxProximo]);
    restantes.splice(idxProximo, 1);
  }
  return [...resultado, ...semCoord];
}

export default function AdminHome({ onLogout, onNavigate }) {
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
  const [showChat, setShowChat] = useState(false);
  const [entregadorSelecionado, setEntregadorSelecionado] = useState('');
  const [clientesSelecionados, setClientesSelecionados] = useState([]);
  const [modoSelecao, setModoSelecao] = useState(false);
  const [otimizando, setOtimizando] = useState(false);
  const [previewRota, setPreviewRota] = useState(null);

  // Recupera notificações já vistas na sessão
  const getNotificacoesVistas = () => {
    const saved = sessionStorage.getItem(NOTIFICACOES_VISTAS_KEY);
    return saved ? new Set(JSON.parse(saved)) : new Set();
  };

  const salvarNotificacoesVistas = (set) => {
    sessionStorage.setItem(NOTIFICACOES_VISTAS_KEY, JSON.stringify([...set]));
  };

  useEffect(() => {
    getEntregadores(setEntregadores);
    const unsub1 = getClientesRealtime(setClientes);

    let primeiraCarga = true;
    let statusAnterior = {};

    const unsub2 = getRotasRealtime((novasRotas) => {
      if (primeiraCarga) {
        novasRotas.forEach(r => { statusAnterior[r.id] = r.status; });
        primeiraCarga = false;
        setRotas(novasRotas);
        return;
      }

      novasRotas.forEach(r => {
        const statusAntigo = statusAnterior[r.id];

        if (statusAntigo !== 'concluida' && r.status === 'concluida') {
          playNotificationSound();
          toast.success(`✅ ${r.clienteNome} entregue por ${r.entregador} — Código: ${r.codigoEntrega}`, { autoClose: 8000 });
        }

        if (statusAntigo === undefined && r.status === 'em_andamento' && r.criadoPor === 'entregador') {
          playNotificationSound();
          toast.info(`🔔 ${r.entregador} ativou rota para ${r.clienteNome}`, { autoClose: 8000 });
        }

        statusAnterior[r.id] = r.status;
      });

      setRotas(novasRotas);
    });

    const unsub3 = getLocalizacoesRealtime(setLocalizacoes);
    return () => { unsub1(); unsub2(); unsub3(); };
  }, []);

  const handleSalvarCliente = async (cliente) => {
    try {
      await salvarCliente(cliente);
      setFormAberto(false);
      setClienteEditando(null);
      playNotificationSound();
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
      playNotificationSound();
          toast.success(`${clienteNome} excluído!`);
    } catch (error) {
      toast.error('Erro ao excluir. Tente novamente.');
    }
  };

  const handleAtribuirRota = async (cliente) => {
    if (!entregadorSelecionado) { toast.warning('Selecione um entregador'); return; }
    await criarRota(cliente, entregadorSelecionado, 'adm');
    await criarNotificacao(
      '🚚 Nova rota atribuída',
      `Administrador atribuiu a entrega de ${cliente.nome} para você`,
      'rota_atribuida',
      entregadorSelecionado
    );
    playNotificationSound();
    toast.success(`Rota de ${cliente.nome} atribuída`);
    setEntregadorSelecionado('');
  };

  const toggleSelecao = (cliente) => {
    setClientesSelecionados(prev =>
      prev.find(c => c.id === cliente.id)
        ? prev.filter(c => c.id !== cliente.id)
        : [...prev, cliente]
    );
  };

  const handleOtimizarEAtribuir = async () => {
    if (!entregadorSelecionado) { toast.warning('Selecione um entregador!'); return; }
    if (clientesSelecionados.length < 2) { toast.warning('Selecione pelo menos 2 clientes!'); return; }

    setOtimizando(true);
    playNotificationSound();
          toast.info('Calculando rota otimizada...');

    // Simula um pequeno delay para mostrar o loading
    setTimeout(async () => {
      const otimizados = otimizarPorProximidade(clientesSelecionados);
      setPreviewRota(otimizados);
      setOtimizando(false);
    }, 500);
  };

  const rotasEmAndamento = rotas.filter(r => r.status === 'em_andamento');
  const rotasConcluidas = rotas.filter(r => r.status === 'concluida').sort((a, b) => new Date(b.concluidoEm) - new Date(a.concluidoEm));

  const clientesFiltrados = clientes.filter(c => {
    const nome = safeString(c.nome);
    const telefone = safeString(c.telefone);
    const codigo = safeString(c.codigoEntrega);
    const termo = busca.toLowerCase();
    return nome.toLowerCase().includes(termo) || telefone.includes(termo) || codigo.includes(termo);
  });

  const perfilAdmin = { nome: 'Administrador', tipo: 'admin' };
  const handleNavigate = (pagina) => {
    if (pagina === 'configuracoes') setShowConfig(true);
    else if (pagina === 'entregadores_cadastro') setShowEntregadores(true);
    else if (pagina === 'estatisticas') setShowEstatisticas(true);
    else if (pagina === 'chat') setShowChat(true);
    else if (pagina === 'notificacoes') { if (onNavigate) onNavigate('notificacoes'); }
    else setAba(pagina);
  };

  if (showConfig) return <AdminConfiguracoes onVoltar={() => setShowConfig(false)} />;
  if (showEntregadores) return <CadastroEntregador onVoltar={() => setShowEntregadores(false)} />;
  if (showEstatisticas) return <Estatisticas onVoltar={() => setShowEstatisticas(false)} />;
  if (showChat) return <Chat usuario={perfilAdmin} onVoltar={() => setShowChat(false)} />;
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
            <button style={{ ...styles.botaoNovo, backgroundColor: cores.primary, color: cores.background }} onClick={() => { setClienteEditando(null); setFormAberto(true); }}>➕ Novo</button>
            <button style={{ ...styles.botaoModo, backgroundColor: modoSelecao ? cores.danger : cores.info, color: '#fff' }} onClick={() => setModoSelecao(!modoSelecao)}>
              {modoSelecao ? '✖ Cancelar Seleção' : '☑️ Selecionar Múltiplos'}
            </button>
            {modoSelecao && clientesSelecionados.length > 0 && (
              <span style={{ color: cores.text, marginLeft: 8 }}>{clientesSelecionados.length} selecionados</span>
            )}
            <input style={{ ...styles.busca, backgroundColor: cores.card, color: cores.text, borderColor: cores.cardBorder }} placeholder="Buscar..." value={busca} onChange={e => setBusca(e.target.value)} />
          </div>

          {previewRota && (
            <div style={{ ...styles.previewContainer, backgroundColor: cores.card, borderColor: cores.primary }}>
              <h4 style={{ color: cores.primary }}>🗺️ Rota Otimizada</h4>
              {previewRota.map((c, idx) => (
                <p key={idx} style={{ color: cores.text, margin: '4px 0' }}>
                  {idx + 1}. {c.nome} — {c.endereco}
                </p>
              ))}
              <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                <button style={{ ...styles.botaoAtribuir, backgroundColor: cores.success, color: '#fff' }} onClick={async () => {
                  for (const c of previewRota) {
                    await criarRota(c, entregadorSelecionado, 'adm');
                  }
                  await criarNotificacao(
                    '🚚 Novas rotas atribuídas',
                    `Administrador atribuiu ${previewRota.length} entrega(s) otimizada(s) para você`,
                    'rota_atribuida',
                    entregadorSelecionado
                  );
                  playNotificationSound();
                  toast.success(`Rotas atribuídas para ${entregadorSelecionado}!`);
                  setPreviewRota(null);
                  setClientesSelecionados([]);
                  setModoSelecao(false);
                }}>✅ Confirmar e Atribuir</button>
                <button style={{ ...styles.botaoDeletar, backgroundColor: cores.danger, color: '#fff' }} onClick={() => setPreviewRota(null)}>✖ Cancelar</button>
              </div>
            </div>
          )}

          {clientesFiltrados.map(c => {
            const emRota = rotasEmAndamento.some(r => r.clienteId === c.id);
            const selecionado = clientesSelecionados.some(sc => sc.id === c.id);
            return (
              <div key={c.id} style={{ ...styles.card, backgroundColor: cores.card, borderColor: emRota ? cores.success : (selecionado ? cores.primary : cores.cardBorder), borderWidth: selecionado ? 2 : 1 }}>
                <div style={{ flex: 1 }}>
                  <p style={{ fontWeight: 'bold', color: cores.primary }}>
                    {safeString(c.nome) || 'Sem nome'}
                    {emRota && <span style={{ color: cores.success, marginLeft: 8 }}>🚚 Em rota</span>}
                  </p>
                  <p style={{ color: cores.textSecondary }}>📞 {safeString(c.telefone) || '---'}</p>
                  <p style={{ color: cores.textSecondary }}>📍 {safeString(c.endereco) || '---'}{c.apt ? `, Apt ${c.apt}` : ''}</p>
                  <p style={{ color: cores.textSecondary }}>🔑 {safeString(c.codigoEntrega) || '---'} | 🛒 {c.qtdPedidos || 0}</p>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {modoSelecao ? (
                    <button style={{ ...styles.botaoSelecao, backgroundColor: selecionado ? cores.primary : cores.cardBorder, color: selecionado ? '#fff' : cores.text }}
                      onClick={() => toggleSelecao(c)}>
                      {selecionado ? '✓' : '○'}
                    </button>
                  ) : (
                    <>
                      <select value={entregadorSelecionado} onChange={e => setEntregadorSelecionado(e.target.value)} style={styles.select}>
                        <option value="">Entregador</option>
                        {entregadores.map(e => <option key={e}>{e}</option>)}
                      </select>
                      <button style={styles.botaoAtribuir} onClick={() => handleAtribuirRota(c)}>🚚 Atribuir</button>
                    </>
                  )}
                  <button style={{ ...styles.botaoEditar, backgroundColor: cores.cardBorder, color: cores.text }} onClick={() => { setClienteEditando(c); setFormAberto(true); }}>✏️</button>
                  <button style={{ ...styles.botaoDeletar, backgroundColor: cores.danger, color: '#fff' }} onClick={() => handleExcluirCliente(c.id, c.nome || 'cliente')}>🗑️</button>
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
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 8 }}>
                <button style={{ backgroundColor: cores.danger, color: '#fff', border: 'none', padding: 8, borderRadius: 8, cursor: 'pointer', fontSize: 13 }}
                  onClick={() => { if (window.confirm(`Excluir entrega de ${r.clienteNome}?`)) excluirRota(r.id); }}>
                  🗑️ Excluir
                </button>
              </div>
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
  barraFerramentas: { display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' },
  botaoNovo: { border: 'none', borderRadius: 8, padding: '10px 16px', fontWeight: 'bold', cursor: 'pointer' },
  botaoModo: { border: 'none', borderRadius: 8, padding: '10px 16px', fontWeight: 'bold', cursor: 'pointer' },
  busca: { flex: 1, padding: 10, borderRadius: 8, border: '1px solid', minWidth: 150 },
  card: { borderRadius: 12, padding: 14, marginBottom: 10, display: 'flex', justifyContent: 'space-between', border: '1px solid' },
  cardRota: { borderRadius: 12, padding: 14, marginBottom: 10, border: '2px solid' },
  cardConcluido: { borderRadius: 12, padding: 14, marginBottom: 10, border: '2px solid' },
  select: { padding: 8, borderRadius: 8, border: 'none' },
  botaoAtribuir: { backgroundColor: '#27ae60', color: '#fff', border: 'none', padding: 8, borderRadius: 8, cursor: 'pointer' },
  botaoEditar: { border: 'none', padding: 8, borderRadius: 8, cursor: 'pointer' },
  botaoDeletar: { border: 'none', padding: 8, borderRadius: 8, cursor: 'pointer' },
  botaoSelecao: { border: 'none', borderRadius: 8, padding: 8, fontSize: 18, cursor: 'pointer' },
  botaoGPS: { flex: 1, backgroundColor: '#2980b9', color: '#fff', border: 'none', padding: '8px', borderRadius: 8, cursor: 'pointer', fontSize: 12 },
  botaoEntregador: { flex: 1, backgroundColor: '#8e44ad', color: '#fff', border: 'none', padding: '8px', borderRadius: 8, cursor: 'pointer', fontSize: 12 },
  previewContainer: { border: '2px solid', borderRadius: 12, padding: 16, marginBottom: 16 }
};
