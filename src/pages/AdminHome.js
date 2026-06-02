import React, { useEffect, useState } from 'react';
import { getClientesRealtime, getRotasRealtime, salvarCliente, excluirCliente, excluirRota, criarNotificacao } from '../services/firebaseService';
import FormCliente from '../components/FormCliente';
import RotaCard from '../components/RotaCard';
import AdminConfiguracoes from './AdminConfiguracoes';
import { useTheme, getTheme } from '../contexts/ThemeContext';
import { toast } from 'react-toastify';

function copiar(texto, label) {
  navigator.clipboard.writeText(texto).then(() => toast.success(`${label} copiado!`));
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
  const [ultimaNotificacao, setUltimaNotificacao] = useState(null);

  useEffect(() => {
    const unsubscribeClientes = getClientesRealtime(setClientes);
    const unsubscribeRotas = getRotasRealtime(setRotas);
    return () => {
      unsubscribeClientes();
      unsubscribeRotas();
    };
  }, []);

  // Monitorar novas rotas concluídas para notificar admin
  useEffect(() => {
    const novasConcluidas = rotas.filter(r => r.status === 'concluida' && r.id !== ultimaNotificacao);
    if (novasConcluidas.length > 0) {
      const ultima = novasConcluidas[novasConcluidas.length - 1];
      setUltimaNotificacao(ultima.id);
      toast.info(`✅ Entrega concluída: ${ultima.clienteNome} por ${ultima.entregador}`);
      criarNotificacao('Entrega concluída', `${ultima.clienteNome} foi entregue por ${ultima.entregador}`, 'sucesso', 'admin');
    }
  }, [rotas, ultimaNotificacao]);

  const handleSalvarCliente = async (cliente) => {
    await salvarCliente(cliente);
    setFormAberto(false);
    setClienteEditando(null);
    toast.success('Cliente salvo com sucesso!');
  };

  const rotasEmAndamento = rotas.filter(r => r.status === 'em_andamento');
  const rotasConcluidas = rotas.filter(r => r.status === 'concluida');

  // Clientes inativos (sem pedidos há +30 dias)
  const trintaDiasAtras = new Date();
  trintaDiasAtras.setDate(trintaDiasAtras.getDate() - 30);
  const clientesInativos = clientes.filter(c => {
    if (!c.ultimoPedido) return false;
    return new Date(c.ultimoPedido) < trintaDiasAtras;
  });

  const clientesFiltrados = clientes.filter(c =>
    c.nome?.toLowerCase().includes(busca.toLowerCase()) ||
    c.telefone?.includes(busca) ||
    c.codigoEntrega?.includes(busca)
  );

  if (showConfig) {
    return <AdminConfiguracoes onVoltar={() => setShowConfig(false)} />;
  }

  if (formAberto) {
    return <FormCliente cliente={clienteEditando} onSalvar={handleSalvarCliente} onCancelar={() => { setFormAberto(false); setClienteEditando(null); }} />;
  }

  return (
    <div style={{ ...styles.container, backgroundColor: cores.background }}>
      {/* HEADER COM ATALHOS */}
      <div style={styles.header}>
        <h1 style={{ ...styles.titulo, color: cores.primary }}>🌾 NossoGranel</h1>
        <div style={styles.atendimento}>
          <span>📞 0800 123 456</span>
        </div>
      </div>

      {/* ATALHOS RÁPIDOS */}
      <div style={{ ...styles.atalhos, backgroundColor: cores.card }}>
        <button style={{ ...styles.atalhoBotao, backgroundColor: cores.primary, color: cores.background }} onClick={() => { setClienteEditando(null); setFormAberto(true); }}>➕ Novo Cliente</button>
        <button style={{ ...styles.atalhoBotao, backgroundColor: cores.primary, color: cores.background }} onClick={() => setAba('rotas')}>🚚 Ver Rotas</button>
        <button style={{ ...styles.atalhoBotao, backgroundColor: cores.primary, color: cores.background }} onClick={() => setShowConfig(true)}>⚙️ Configurar</button>
        <button style={{ ...styles.atalhoBotao, backgroundColor: cores.danger, color: '#fff' }} onClick={onLogout}>🚪 Sair</button>
      </div>

      {/* CLIENTES INATIVOS - DESTAQUE */}
      {clientesInativos.length > 0 && (
        <div style={{ ...styles.aviso, backgroundColor: cores.warning + '20', borderColor: cores.warning }}>
          <p style={{ color: cores.warning }}>⚠️ {clientesInativos.length} cliente(s) inativo(s) há mais de 30 dias</p>
        </div>
      )}

      {/* ABAS */}
      <div style={styles.abas}>
        <button style={aba === 'clientes' ? { ...styles.abaAtiva, backgroundColor: cores.primary, color: cores.background } : { ...styles.aba, backgroundColor: cores.card, color: cores.text }} onClick={() => setAba('clientes')}>👥 Clientes ({clientes.length})</button>
        <button style={aba === 'rotas' ? { ...styles.abaAtiva, backgroundColor: cores.primary, color: cores.background } : { ...styles.aba, backgroundColor: cores.card, color: cores.text }} onClick={() => setAba('rotas')}>🚚 Rotas ({rotasEmAndamento.length})</button>
        <button style={aba === 'historico' ? { ...styles.abaAtiva, backgroundColor: cores.primary, color: cores.background } : { ...styles.aba, backgroundColor: cores.card, color: cores.text }} onClick={() => setAba('historico')}>📋 Histórico ({rotasConcluidas.length})</button>
      </div>

      {aba === 'clientes' && (
        <>
          <input style={{ ...styles.busca, backgroundColor: cores.card, color: cores.text, borderColor: cores.cardBorder }} placeholder="Buscar por nome, telefone ou código..." value={busca} onChange={e => setBusca(e.target.value)} />
          {clientesFiltrados.map(c => {
            const isInativo = c.ultimoPedido && new Date(c.ultimoPedido) < trintaDiasAtras;
            return (
              <div key={c.id} style={{ ...styles.card, backgroundColor: cores.card, borderColor: cores.cardBorder, ...(isInativo && styles.cardInativo) }}>
                <div style={{ flex: 1 }}>
                  <p style={{ ...styles.nome, color: cores.primary }}>{c.nome} {isInativo && <span style={{ fontSize: 12, color: cores.warning }}>(⚠️ Inativo)</span>}</p>
                  <p style={{ ...styles.info, color: cores.textSecondary }}>📞 <span style={styles.copiavel} onClick={() => copiar(c.telefone, 'Telefone')}>{c.telefone}</span></p>
                  <p style={{ ...styles.info, color: cores.textSecondary }}>📍 {c.endereco}{c.apt ? `, Apt ${c.apt}` : ''}</p>
                  <p style={{ ...styles.info, color: cores.textSecondary }}>🔑 <span style={styles.copiavel} onClick={() => copiar(c.codigoEntrega, 'Código')}>{c.codigoEntrega}</span> | 🛒 {c.qtdPedidos}</p>
                  {c.observacoes && <p style={{ ...styles.info, color: cores.textSecondary }}>📝 {c.observacoes}</p>}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
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
            <RotaCard key={r.id} rota={r} tipo="em_andamento" onExcluir={excluirRota} onCopiar={copiar} />
          ))}
        </>
      )}

      {aba === 'historico' && (
        <>
          <h3 style={{ color: cores.primary, marginBottom: 12 }}>📋 Entregas Concluídas</h3>
          {rotasConcluidas.length === 0 && <p style={{ ...styles.vazio, color: cores.textSecondary }}>Nenhuma entrega concluída.</p>}
          {rotasConcluidas.map(r => (
            <RotaCard key={r.id} rota={r} tipo="concluida" onExcluir={excluirRota} onCopiar={copiar} />
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
  atendimento: { fontSize: 12, color: '#aaa' },
  atalhos: { display: 'flex', gap: 8, marginBottom: 16, padding: 12, borderRadius: 12, flexWrap: 'wrap', justifyContent: 'center' },
  atalhoBotao: { border: 'none', borderRadius: 8, padding: '8px 16px', fontWeight: 'bold', cursor: 'pointer' },
  aviso: { backgroundColor: '#e67e2220', border: '1px solid #e67e22', borderRadius: 8, padding: 8, marginBottom: 16, textAlign: 'center' },
  abas: { display: 'flex', gap: 8, marginBottom: 16 },
  aba: { flex: 1, border: '1px solid', borderRadius: 8, padding: '8px 4px', fontSize: 13, cursor: 'pointer', textAlign: 'center' },
  abaAtiva: { flex: 1, border: 'none', borderRadius: 8, padding: '8px 4px', fontSize: 13, fontWeight: 'bold', cursor: 'pointer', textAlign: 'center' },
  busca: { width: '100%', border: '1px solid', borderRadius: 10, padding: 12, marginBottom: 12, boxSizing: 'border-box' },
  card: { borderRadius: 12, padding: 14, marginBottom: 10, display: 'flex', border: '1px solid' },
  cardInativo: { opacity: 0.7, borderLeftWidth: 4, borderLeftColor: '#e67e22' },
  nome: { fontWeight: 'bold', fontSize: 16, margin: '0 0 4px 0' },
  info: { fontSize: 13, margin: '0 0 2px 0' },
  copiavel: { textDecoration: 'underline', cursor: 'pointer' },
  botaoEditar: { border: 'none', fontSize: 18, cursor: 'pointer', padding: '8px 12px', borderRadius: 8, minWidth: 44 },
  botaoDeletar: { border: 'none', fontSize: 18, cursor: 'pointer', padding: '8px 12px', borderRadius: 8, minWidth: 44 },
  vazio: { textAlign: 'center', marginTop: 40 }
};
