import React, { useEffect, useState, useRef } from 'react';
import { getClientesRealtime, getRotasRealtime, salvarCliente, excluirCliente, excluirRota, iniciarRota } from '../services/firebaseService';
import FormCliente from '../components/FormCliente';
import RotaCard from '../components/RotaCard';
import AdminConfiguracoes from './AdminConfiguracoes';
import { useTheme, getTheme } from '../contexts/ThemeContext';
import { toast } from 'react-toastify';

function copiar(texto, label) {
  navigator.clipboard.writeText(texto).then(() => toast.success(`${label} copiado!`));
}

function abrirGPS(endereco, apt) {
  const enderecoCompleto = `${endereco}${apt ? ` ${apt}` : ''}`;
  const url = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(enderecoCompleto)}`;
  window.open(url, '_blank');
}

export default function AdminHome({ onLogout }) {
  const { darkMode } = useTheme();
  const cores = getTheme(darkMode);
  const [clientes, setClientes] = useState([]);
  const [rotas, setRotas] = useState([]);
  const [busca, setBusca] = useState('');
  const [aba, setAba] = useState('clientes');
  const [formAberto, setFormAberto] = useState(false);
  const [clienteEditando, setClienteEditando] = useState(null);
  const [showConfig, setShowConfig] = useState(false);
  const notificadasRef = useRef(new Set());
  const primeiraCarregaRef = useRef(true);

  useEffect(() => {
    const unsubscribeClientes = getClientesRealtime(setClientes);
    const unsubscribeRotas = getRotasRealtime((novasRotas) => {
      if (primeiraCarregaRef.current) {
        // Na primeira carga, marca todas as concluídas como já notificadas
        novasRotas.filter(r => r.status === 'concluida').forEach(r => {
          notificadasRef.current.add(r.id);
        });
        primeiraCarregaRef.current = false;
      } else {
        // Após primeira carga, notifica apenas novas conclusões
        novasRotas.filter(r => r.status === 'concluida' && !notificadasRef.current.has(r.id)).forEach(r => {
          notificadasRef.current.add(r.id);
          toast.success(`✅ Entrega concluída: ${r.clienteNome} por ${r.entregador}`);
        });
      }
      setRotas(novasRotas);
    });
    return () => {
      unsubscribeClientes();
      unsubscribeRotas();
    };
  }, []);

  const handleSalvarCliente = async (cliente) => {
    await salvarCliente(cliente);
    setFormAberto(false);
    setClienteEditando(null);
    toast.success('Cliente salvo com sucesso!');
  };

  const handleIniciarRota = async (cliente) => {
    const rotaExistente = rotas.find(r => r.status === 'em_andamento' && r.clienteId === cliente.id);
    if (rotaExistente) {
      toast.warning('Este cliente já tem uma entrega em andamento!');
      return;
    }
    await iniciarRota(cliente, 'ADM');
    toast.success(`Rota iniciada para ${cliente.nome}!`);
    setAba('rotas');
  };

  const rotasEmAndamento = rotas.filter(r => r.status === 'em_andamento');
  const rotasConcluidas = rotas.filter(r => r.status === 'concluida').sort((a, b) => new Date(b.concluidoEm) - new Date(a.concluidoEm));

  const trintaDiasAtras = new Date();
  trintaDiasAtras.setDate(trintaDiasAtras.getDate() - 30);
  const clientesInativos = clientes.filter(c => c.ultimoPedido && new Date(c.ultimoPedido) < trintaDiasAtras);

  const clientesFiltrados = clientes.filter(c =>
    c.nome?.toLowerCase().includes(busca.toLowerCase()) ||
    c.telefone?.includes(busca) ||
    c.codigoEntrega?.includes(busca)
  );

  if (showConfig) return <AdminConfiguracoes onVoltar={() => setShowConfig(false)} />;
  if (formAberto) return <FormCliente cliente={clienteEditando} onSalvar={handleSalvarCliente} onCancelar={() => { setFormAberto(false); setClienteEditando(null); }} />;

  return (
    <div style={{ ...styles.container, backgroundColor: cores.background }}>
      <div style={styles.header}>
        <h1 style={{ ...styles.titulo, color: cores.primary }}>🌾 NossoGranel</h1>
      </div>

      <div style={{ ...styles.atalhos, backgroundColor: cores.card }}>
        <button style={{ ...styles.atalhoBotao, backgroundColor: cores.primary, color: cores.background }} onClick={() => { setClienteEditando(null); setFormAberto(true); }}>➕ Novo</button>
        <button style={{ ...styles.atalhoBotao, backgroundColor: cores.primary, color: cores.background }} onClick={() => setAba('rotas')}>🚚 Rotas {rotasEmAndamento.length > 0 && `(${rotasEmAndamento.length})`}</button>
        <button style={{ ...styles.atalhoBotao, backgroundColor: cores.primary, color: cores.background }} onClick={() => setShowConfig(true)}>⚙️ Config</button>
        <button style={{ ...styles.atalhoBotao, backgroundColor: '#c0392b', color: '#fff' }} onClick={onLogout}>🚪 Sair</button>
      </div>

      {clientesInativos.length > 0 && (
        <div style={{ ...styles.aviso, borderColor: cores.warning }}>
          <p style={{ color: cores.warning }}>⚠️ {clientesInativos.length} cliente(s) inativo(s) há mais de 30 dias</p>
        </div>
      )}

      <div style={styles.abas}>
        <button style={aba === 'clientes' ? { ...styles.abaAtiva, backgroundColor: cores.primary, color: cores.background } : { ...styles.aba, backgroundColor: cores.card, color: cores.text }} onClick={() => setAba('clientes')}>👥 Clientes ({clientes.length})</button>
        <button style={aba === 'rotas' ? { ...styles.abaAtiva, backgroundColor: cores.primary, color: cores.background } : { ...styles.aba, backgroundColor: cores.card, color: cores.text }} onClick={() => setAba('rotas')}>🚚 Em Rota ({rotasEmAndamento.length})</button>
        <button style={aba === 'historico' ? { ...styles.abaAtiva, backgroundColor: cores.primary, color: cores.background } : { ...styles.aba, backgroundColor: cores.card, color: cores.text }} onClick={() => setAba('historico')}>📋 Histórico ({rotasConcluidas.length})</button>
      </div>

      {aba === 'clientes' && (
        <>
          <input style={{ ...styles.busca, backgroundColor: cores.card, color: cores.text, borderColor: cores.cardBorder }} placeholder="Buscar por nome, telefone ou código..." value={busca} onChange={e => setBusca(e.target.value)} />
          {clientesFiltrados.map(c => {
            const isInativo = c.ultimoPedido && new Date(c.ultimoPedido) < trintaDiasAtras;
            const emRota = rotas.find(r => r.clienteId === c.id && r.status === 'em_andamento');
            return (
              <div key={c.id} style={{ ...styles.card, backgroundColor: cores.card, borderColor: emRota ? cores.primary : cores.cardBorder, ...(isInativo && styles.cardInativo) }}>
                <div style={{ flex: 1 }}>
                  <p style={{ ...styles.nome, color: cores.primary }}>
                    {c.nome}
                    {emRota && <span style={{ fontSize: 12, color: '#27ae60', marginLeft: 8 }}>🚚 Em rota</span>}
                    {isInativo && <span style={{ fontSize: 12, color: cores.warning, marginLeft: 8 }}>⚠️ Inativo</span>}
                  </p>
                  <p style={{ ...styles.info, color: cores.textSecondary }}>📞 <span style={styles.copiavel} onClick={() => copiar(c.telefone, 'Telefone')}>{c.telefone}</span></p>
                  <p style={{ ...styles.info, color: cores.textSecondary }}>📍 {c.endereco}{c.apt ? `, Apt ${c.apt}` : ''}</p>
                  <p style={{ ...styles.info, color: cores.textSecondary }}>🔑 <span style={styles.copiavel} onClick={() => copiar(c.codigoEntrega, 'Código')}>{c.codigoEntrega}</span> | 🛒 {c.qtdPedidos}</p>
                  {c.observacoes && <p style={{ ...styles.info, color: cores.textSecondary }}>📝 {c.observacoes}</p>}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {!emRota && <button style={{ ...styles.botaoRota }} onClick={() => handleIniciarRota(c)}>🚚</button>}
                  <button style={{ ...styles.botaoEditar, backgroundColor: cores.cardBorder }} onClick={() => { setClienteEditando(c); setFormAberto(true); }}>✏️</button>
                  <button style={{ ...styles.botaoDeletar, backgroundColor: cores.cardBorder }} onClick={async () => { if (window.confirm('Excluir?')) await excluirCliente(c.id); }}>🗑️</button>
                </div>
              </div>
            );
          })}
          {clientesFiltrados.length === 0 && <p style={{ ...styles.vazio, color: cores.textSecondary }}>Nenhum cliente encontrado.</p>}
        </>
      )}

      {aba === 'rotas' && (
        <>
          <h3 style={{ color: cores.primary, marginBottom: 12 }}>🚚 Entregas em Andamento</h3>
          {rotasEmAndamento.length === 0 && <p style={{ ...styles.vazio, color: cores.textSecondary }}>Nenhuma rota em andamento.</p>}
          {rotasEmAndamento.map(r => (
            <div key={r.id} style={{ ...styles.cardRota, backgroundColor: cores.card }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div style={{ flex: 1 }}>
                  <p style={{ ...styles.nome, color: cores.primary }}>{r.clienteNome}</p>
                  <p style={{ ...styles.info, color: cores.textSecondary }}>👤 Entregador: <strong style={{ color: cores.primary }}>{r.entregador}</strong></p>
                  <p style={{ ...styles.info, color: cores.textSecondary }}>📍 {r.clienteEndereco}{r.clienteApt ? `, Apt ${r.clienteApt}` : ''}</p>
                  <p style={{ ...styles.info, color: cores.textSecondary }}>🔑 <span style={styles.copiavel} onClick={() => copiar(r.codigoEntrega, 'Código')}>{r.codigoEntrega}</span></p>
                  <p style={{ ...styles.info, color: cores.textSecondary }}>🕐 {new Date(r.iniciadoEm).toLocaleString('pt-BR')}</p>
                  <button style={styles.botaoGPS} onClick={() => abrirGPS(r.clienteEndereco, r.clienteApt)}>📍 Abrir GPS</button>
                </div>
                <button style={{ ...styles.botaoDeletar, backgroundColor: cores.cardBorder }} onClick={async () => { if (window.confirm('Excluir rota?')) await excluirRota(r.id); }}>🗑️</button>
              </div>
            </div>
          ))}
        </>
      )}

      {aba === 'historico' && (
        <>
          <h3 style={{ color: cores.primary, marginBottom: 12 }}>📋 Entregas Concluídas</h3>
          {rotasConcluidas.length === 0 && <p style={{ ...styles.vazio, color: cores.textSecondary }}>Nenhuma entrega concluída.</p>}
          {rotasConcluidas.map(r => (
            <div key={r.id} style={{ ...styles.cardConcluido, backgroundColor: cores.card }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div style={{ flex: 1 }}>
                  <p style={{ ...styles.nome, color: cores.primary }}>{r.clienteNome}</p>
                  <p style={{ ...styles.info, color: cores.textSecondary }}>👤 {r.entregador}</p>
                  <p style={{ ...styles.info, color: cores.textSecondary }}>🔑 <span style={styles.copiavel} onClick={() => copiar(r.codigoEntrega, 'Código')}>{r.codigoEntrega}</span></p>
                  <p style={{ ...styles.info, color: cores.textSecondary }}>🕐 Iniciado: {new Date(r.iniciadoEm).toLocaleString('pt-BR')}</p>
                  <p style={{ ...styles.info, color: '#27ae60' }}>✅ Concluído: {new Date(r.concluidoEm).toLocaleString('pt-BR')}</p>
                </div>
                <button style={{ ...styles.botaoDeletar, backgroundColor: cores.cardBorder }} onClick={async () => { if (window.confirm('Excluir?')) await excluirRota(r.id); }}>🗑️</button>
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
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, paddingTop: 20 },
  titulo: { fontSize: 24, margin: 0 },
  atalhos: { display: 'flex', gap: 8, marginBottom: 16, padding: 12, borderRadius: 12, flexWrap: 'wrap', justifyContent: 'center' },
  atalhoBotao: { border: 'none', borderRadius: 8, padding: '8px 16px', fontWeight: 'bold', cursor: 'pointer' },
  aviso: { border: '1px solid', borderRadius: 8, padding: 8, marginBottom: 16, textAlign: 'center' },
  abas: { display: 'flex', gap: 8, marginBottom: 16 },
  aba: { flex: 1, border: '1px solid', borderRadius: 8, padding: '8px 4px', fontSize: 12, cursor: 'pointer', textAlign: 'center' },
  abaAtiva: { flex: 1, border: 'none', borderRadius: 8, padding: '8px 4px', fontSize: 12, fontWeight: 'bold', cursor: 'pointer', textAlign: 'center' },
  busca: { width: '100%', border: '1px solid', borderRadius: 10, padding: 12, marginBottom: 12, boxSizing: 'border-box' },
  card: { borderRadius: 12, padding: 14, marginBottom: 10, display: 'flex', border: '1px solid' },
  cardRota: { borderRadius: 12, padding: 14, marginBottom: 10, border: '2px solid #e2b96f' },
  cardConcluido: { borderRadius: 12, padding: 14, marginBottom: 10, border: '2px solid #27ae60' },
  cardInativo: { opacity: 0.7 },
  nome: { fontWeight: 'bold', fontSize: 16, margin: '0 0 4px 0' },
  info: { fontSize: 13, margin: '0 0 2px 0' },
  copiavel: { textDecoration: 'underline', cursor: 'pointer' },
  botaoEditar: { border: 'none', fontSize: 18, cursor: 'pointer', padding: '8px 12px', borderRadius: 8, minWidth: 44 },
  botaoDeletar: { border: 'none', fontSize: 18, cursor: 'pointer', padding: '8px 12px', borderRadius: 8, minWidth: 44 },
  botaoRota: { backgroundColor: '#27ae60', color: '#fff', border: 'none', fontSize: 18, cursor: 'pointer', padding: '8px 12px', borderRadius: 8, minWidth: 44 },
  botaoGPS: { backgroundColor: '#2980b9', color: '#fff', border: 'none', borderRadius: 8, padding: '8px 14px', fontSize: 13, fontWeight: 'bold', cursor: 'pointer', marginTop: 8 },
  vazio: { textAlign: 'center', marginTop: 40 },
};
