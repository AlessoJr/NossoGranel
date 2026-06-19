import React, { useEffect, useState } from 'react';
import { getClientesRealtime, getRotasRealtime, salvarCliente, excluirCliente, excluirRota, criarRota, getLocalizacoesRealtime, getEntregadores } from '../services/firebaseService';
import FormCliente from '../components/FormCliente';
import AdminConfiguracoes from './AdminConfiguracoes';
import CadastroEntregador from './CadastroEntregador';
import Estatisticas from './Estatisticas';
import Chat from './Chat';
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
    let maisProximo = restantes[0];
    let menorDist = distancia(ultimo.lat, ultimo.lng, maisProximo.lat, maisProximo.lng);
    for (const c of restantes) {
      const d = distancia(ultimo.lat, ultimo.lng, c.lat, c.lng);
      if (d < menorDist) { menorDist = d; maisProximo = c; }
    }
    resultado.push(maisProximo);
    restantes = restantes.filter(c => c.id !== maisProximo.id);
  }

  return [...resultado, ...semCoord];
}

async function geocodificar(endereco) {
  try {
    const resp = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(endereco)}&limit=1`);
    const data = await resp.json();
    if (data.length > 0) return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
  } catch {}
  return null;
}

const NOTIFICACOES_VISTAS_KEY_ADM = 'admin_notificacoes_vistas';

export default function AdminHome({ onLogout, usuario }) {
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

  const getNotificacoesVistas = () => {
    const saved = sessionStorage.getItem(NOTIFICACOES_VISTAS_KEY_ADM);
    return saved ? new Set(JSON.parse(saved)) : new Set();
  };

  const salvarNotificacoesVistas = (set) => {
    sessionStorage.setItem(NOTIFICACOES_VISTAS_KEY_ADM, JSON.stringify([...set]));
  };

  useEffect(() => {
    getEntregadores(setEntregadores);
    const unsub1 = getClientesRealtime(setClientes);
    const unsub2 = getRotasRealtime((novasRotas) => {
      const notificadas = getNotificacoesVistas();
      let atualizado = false;
      novasRotas.forEach(r => {
        const idConcluida = `concluida_${r.id}`;
        if (r.status === 'concluida' && !notificadas.has(idConcluida)) {
          notificadas.add(idConcluida);
          atualizado = true;
          toast.success(`✅ ${r.clienteNome} entregue por ${r.entregador}`);
        }
        const idAtivada = `ativada_${r.id}`;
        if (r.status === 'em_andamento' && r.criadoPor === 'entregador' && !notificadas.has(idAtivada)) {
          notificadas.add(idAtivada);
          atualizado = true;
          toast.info(`🔔 ${r.entregador} ativou rota para ${r.clienteNome}`);
        }
      });
      if (atualizado) salvarNotificacoesVistas(notificadas);
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
    toast.info('Calculando rota otimizada...');

    try {
      const clientesComCoord = await Promise.all(clientesSelecionados.map(async (c) => {
        if (c.lat && c.lng) return c;
        const coord = await geocodificar(`${c.endereco}${c.apt ? ` ${c.apt}` : ''}, Recife`);
        return coord ? { ...c, ...coord } : c;
      }));

      const otimizados = otimizarPorProximidade(clientesComCoord);
      setPreviewRota({ clientes: otimizados, entregador: entregadorSelecionado });
      setOtimizando(false);
    } catch {
      toast.error('Erro ao otimizar');
      setOtimizando(false);
    }
  };

  const handleConfirmarRota = async () => {
    if (!previewRota) return;
    try {
      for (const cliente of previewRota.clientes) {
        await criarRota(cliente, previewRota.entregador, 'adm');
      }
      toast.success(`${previewRota.clientes.length} rotas atribuídas em ordem otimizada! 🗺️`);
      setPreviewRota(null);
      setClientesSelecionados([]);
      setModoSelecao(false);
      setEntregadorSelecionado('');
    } catch {
      toast.error('Erro ao atribuir rotas');
    }
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

  const perfilAdmin = usuario || { nome: "Administrador", tipo: "admin" };
  const handleNavigate = (pagina) => {
    if (pagina === 'configuracoes') setShowConfig(true);
    else if (pagina === 'entregadores_cadastro') setShowEntregadores(true);
    else if (pagina === 'estatisticas') setShowEstatisticas(true);
    else if (pagina === 'chat') setShowChat(true);
    else setAba(pagina);
  };

  if (showConfig) return <AdminConfiguracoes onVoltar={() => setShowConfig(false)} />;
  if (showEntregadores) return <CadastroEntregador onVoltar={() => setShowEntregadores(false)} />;
  if (showEstatisticas) return <Estatisticas onVoltar={() => setShowEstatisticas(false)} />;
  if (showChat) return <Chat usuario={perfilAdmin} onVoltar={() => setShowChat(false)} />;
  if (formAberto) return <FormCliente cliente={clienteEditando} clientes={clientes} onSalvar={handleSalvarCliente} onCancelar={() => { setFormAberto(false); setClienteEditando(null); }} />;

  // Preview da rota otimizada
  if (previewRota) return (
    <div style={{ ...styles.container, backgroundColor: cores.background }}>
      <h2 style={{ color: cores.primary }}>🗺️ Rota Otimizada</h2>
      <div style={{ backgroundColor: cores.card, borderRadius: 12, padding: 14, marginBottom: 16, border: `1px solid ${cores.success}` }}>
        <p style={{ color: cores.success, margin: 0, fontWeight: 'bold' }}>👤 Entregador: {previewRota.entregador}</p>
        <p style={{ color: cores.textSecondary, fontSize: 12, margin: '4px 0 0' }}>Ordem calculada por proximidade geográfica</p>
      </div>
      {previewRota.clientes.map((c, i) => (
        <div key={c.id} style={{ backgroundColor: cores.card, borderRadius: 12, padding: 14, marginBottom: 10, border: `2px solid ${cores.primary}` }}>
          <p style={{ color: cores.warning, fontWeight: 'bold', margin: '0 0 4px', fontSize: 13 }}>📍 Parada {i + 1}</p>
          <p style={{ color: cores.primary, fontWeight: 'bold', margin: '0 0 4px' }}>{c.nome}</p>
          <p style={{ color: cores.text, fontSize: 13, margin: 0 }}>📍 {c.endereco}{c.apt ? `, Apt ${c.apt}` : ''}</p>
          <p style={{ color: cores.text, fontSize: 13, margin: 0 }}>🔑 {c.codigoEntrega}</p>
        </div>
      ))}
      <button style={{ ...styles.botaoAtribuir, width: '100%', padding: 14, marginBottom: 10, fontSize: 15 }} onClick={handleConfirmarRota}>
        ✅ Confirmar e Atribuir {previewRota.clientes.length} Rotas
      </button>
      <button style={{ ...styles.botaoDeletar, width: '100%', padding: 14, fontSize: 15 }} onClick={() => setPreviewRota(null)}>
        ← Voltar e Editar
      </button>
    </div>
  );

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
            <button style={{ ...styles.botaoNovo, backgroundColor: modoSelecao ? cores.warning : cores.cardBorder, color: modoSelecao ? cores.background : cores.text }} onClick={() => { setModoSelecao(!modoSelecao); setClientesSelecionados([]); setPreviewRota(null); }}>
              {modoSelecao ? `✓ ${clientesSelecionados.length} sel.` : '🗺️ Multi'}
            </button>
            <input style={{ ...styles.busca, backgroundColor: cores.card, color: cores.text, borderColor: cores.cardBorder }} placeholder="Buscar..." value={busca} onChange={e => setBusca(e.target.value)} />
          </div>

          {modoSelecao && (
            <div style={{ backgroundColor: cores.card, borderRadius: 12, padding: 12, marginBottom: 12, border: `1px solid ${cores.warning}` }}>
              <p style={{ color: cores.warning, fontWeight: 'bold', margin: '0 0 8px', fontSize: 13 }}>
                🗺️ Modo Rota Múltipla — {clientesSelecionados.length} cliente(s) selecionado(s)
              </p>
              <select style={{ ...styles.select, backgroundColor: cores.cardBorder, color: cores.text, width: '100%', marginBottom: 8 }}
                value={entregadorSelecionado} onChange={e => setEntregadorSelecionado(e.target.value)}>
                <option value="">Selecione o entregador</option>
                {entregadores.map(e => <option key={e}>{e}</option>)}
              </select>
              <button style={{ ...styles.botaoAtribuir, width: '100%', opacity: otimizando ? 0.7 : 1 }}
                onClick={handleOtimizarEAtribuir} disabled={otimizando}>
                {otimizando ? '⏳ Calculando...' : '✨ Otimizar e Visualizar Rota'}
              </button>
            </div>
          )}

          {clientesFiltrados.map(c => {
            const emRota = rotasEmAndamento.some(r => r.clienteId === c.id);
            const selecionado = clientesSelecionados.find(cs => cs.id === c.id);
            return (
              <div key={c.id} style={{ ...styles.card, backgroundColor: cores.card, borderColor: selecionado ? cores.warning : emRota ? cores.success : cores.cardBorder, borderWidth: selecionado || emRota ? 2 : 1 }}
                onClick={() => modoSelecao && toggleSelecao(c)}>
                {modoSelecao && (
                  <div style={{ marginRight: 10, fontSize: 22 }}>{selecionado ? '☑️' : '⬜'}</div>
                )}
                <div style={{ flex: 1 }}>
                  <p style={{ ...styles.info, color: cores.primary, fontWeight: 'bold', fontSize: 16 }}>
                    {safeString(c.nome) || 'Sem nome'}
                    {emRota && <span style={{ color: cores.success, fontSize: 12, marginLeft: 8 }}>🚚 Em rota</span>}
                  </p>
                  <p style={{ ...styles.info, color: cores.text }}>📞 <span style={{ color: cores.primary, cursor: 'pointer', textDecoration: 'underline' }} onClick={(e) => { e.stopPropagation(); copiar(c.telefone, 'Telefone'); }}>{safeString(c.telefone) || '---'}</span></p>
                  <p style={{ ...styles.info, color: cores.text }}>📍 {safeString(c.endereco) || '---'}{c.apt ? `, Apt ${c.apt}` : ''}</p>
                  <p style={{ ...styles.info, color: cores.text }}>🔑 <span style={{ color: cores.primary, cursor: 'pointer', textDecoration: 'underline' }} onClick={(e) => { e.stopPropagation(); copiar(c.codigoEntrega, 'Código'); }}>{safeString(c.codigoEntrega) || '---'}</span> | 🛒 {c.qtdPedidos || 0}</p>
                </div>
                {!modoSelecao && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    <select value={entregadorSelecionado} onChange={e => setEntregadorSelecionado(e.target.value)} style={{ ...styles.select, backgroundColor: cores.cardBorder, color: cores.text }}>
                      <option value="">Entregador</option>
                      {entregadores.map(e => <option key={e}>{e}</option>)}
                    </select>
                    <button style={styles.botaoAtribuir} onClick={() => handleAtribuirRota(c)}>🚚 Atribuir</button>
                    <button style={{ ...styles.botaoEditar, backgroundColor: cores.cardBorder }} onClick={() => { setClienteEditando(c); setFormAberto(true); }}>✏️</button>
                    <button style={styles.botaoDeletar} onClick={() => handleExcluirCliente(c.id, c.nome || 'cliente')}>🗑️</button>
                  </div>
                )}
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
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 8 }}>
                <button style={{ ...styles.botaoDeletar }} onClick={() => { if(window.confirm(`Excluir entrega de ${r.clienteNome}?`)) excluirRota(r.id); }}>🗑️ Excluir</button>
              </div>
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
  card: { borderRadius: 12, padding: 14, marginBottom: 10, display: 'flex', justifyContent: 'space-between', border: '1px solid', cursor: 'pointer' },
  cardRota: { borderRadius: 12, padding: 14, marginBottom: 10, border: '2px solid' },
  cardConcluido: { borderRadius: 12, padding: 14, marginBottom: 10, border: '2px solid' },
  info: { fontSize: 13, margin: '0 0 4px 0' },
  select: { padding: 8, borderRadius: 8, border: 'none', cursor: 'pointer' },
  botaoAtribuir: { backgroundColor: '#27ae60', color: '#fff', border: 'none', padding: 8, borderRadius: 8, cursor: 'pointer', fontSize: 13 },
  botaoEditar: { color: '#fff', border: 'none', padding: 8, borderRadius: 8, cursor: 'pointer', fontSize: 18 },
  botaoDeletar: { backgroundColor: '#c0392b', color: '#fff', border: 'none', padding: 8, borderRadius: 8, cursor: 'pointer', fontSize: 13 }
};
