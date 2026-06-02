import React, { useEffect, useState } from 'react';
import { getClientesRealtime, iniciarRota, concluirRota, getRotasRealtime, getConfiguracoes } from '../services/firebaseService';
import { useTheme, getTheme } from '../contexts/ThemeContext';
import { toast } from 'react-toastify';

export default function EntregadorHome({ usuario, onLogout }) {
  const { darkMode, toggleTheme } = useTheme();
  const cores = getTheme(darkMode);
  const [clientes, setClientes] = useState([]);
  const [rotas, setRotas] = useState([]);
  const [busca, setBusca] = useState('');
  const [rotaAtiva, setRotaAtiva] = useState(null);
  const [ordemRota, setOrdemRota] = useState([]);
  const [assinaturaOpcional, setAssinaturaOpcional] = useState(false);
  const [showAssinatura, setShowAssinatura] = useState(false);
  const [assinatura, setAssinatura] = useState('');

  useEffect(() => {
    const unsubscribeClientes = getClientesRealtime(setClientes);
    const unsubscribeRotas = getRotasRealtime((todasRotas) => {
      const minhaRotaAtiva = todasRotas.find(r => r.entregador === usuario.nome && r.status === 'em_andamento');
      setRotaAtiva(minhaRotaAtiva || null);
      if (minhaRotaAtiva && minhaRotaAtiva.ordem) {
        setOrdemRota(minhaRotaAtiva.ordem);
      }
      setRotas(todasRotas);
    });
    carregarConfig();
    return () => {
      unsubscribeClientes();
      unsubscribeRotas();
    };
  }, [usuario.nome]);

  const carregarConfig = async () => {
    const config = await getConfiguracoes();
    setAssinaturaOpcional(config.assinaturaOpcional || false);
  };

  const handleIniciarRota = async (cliente) => {
    const novaOrdem = [cliente.id];
    await iniciarRota(cliente, usuario.nome);
    setOrdemRota(novaOrdem);
    toast.success(`Rota iniciada para ${cliente.nome}`);
  };

  const handleReordenar = (clienteId, direcao) => {
    const index = ordemRota.indexOf(clienteId);
    if (direcao === 'cima' && index > 0) {
      const novaOrdem = [...ordemRota];
      [novaOrdem[index], novaOrdem[index - 1]] = [novaOrdem[index - 1], novaOrdem[index]];
      setOrdemRota(novaOrdem);
      toast.info('Ordem da rota atualizada');
    } else if (direcao === 'baixo' && index < ordemRota.length - 1) {
      const novaOrdem = [...ordemRota];
      [novaOrdem[index], novaOrdem[index + 1]] = [novaOrdem[index + 1], novaOrdem[index]];
      setOrdemRota(novaOrdem);
      toast.info('Ordem da rota atualizada');
    }
  };

  const handleConcluirRota = async () => {
    if (assinaturaOpcional && !showAssinatura) {
      setShowAssinatura(true);
      return;
    }
    if (rotaAtiva) {
      await concluirRota(rotaAtiva.id);
      setRotaAtiva(null);
      setOrdemRota([]);
      setShowAssinatura(false);
      setAssinatura('');
      toast.success('✅ Entrega concluída com sucesso!');
    }
  };

  const clientesOrdenados = ordemRota.length > 0
    ? ordemRota.map(id => clientes.find(c => c.id === id)).filter(c => c)
    : clientes;

  const clientesFiltrados = clientesOrdenados.filter(c =>
    c?.nome?.toLowerCase().includes(busca.toLowerCase()) ||
    c?.codigoEntrega?.includes(busca)
  );

  // Tela de assinatura
  if (showAssinatura) {
    return (
      <div style={{ ...styles.container, backgroundColor: cores.background }}>
        <h2 style={{ ...styles.titulo, color: cores.primary }}>✍️ Assinatura do Cliente</h2>
        <div style={{ ...styles.cardAssinatura, backgroundColor: cores.card, borderColor: cores.cardBorder }}>
          <p style={{ color: cores.text }}>Cliente: <strong>{rotaAtiva?.clienteNome}</strong></p>
          <textarea
            style={{ ...styles.assinaturaInput, backgroundColor: cores.background, color: cores.text, borderColor: cores.cardBorder }}
            rows={3}
            placeholder="Nome do cliente ou 'Cliente não disponível para assinar'"
            value={assinatura}
            onChange={e => setAssinatura(e.target.value)}
          />
          <div style={{ display: 'flex', gap: 12, marginTop: 16 }}>
            <button style={{ ...styles.botaoConcluir, backgroundColor: cores.success, color: '#fff' }} onClick={handleConcluirRota}>
              ✅ Confirmar Entrega
            </button>
            <button style={{ ...styles.botaoVoltar, backgroundColor: cores.danger, color: '#fff' }} onClick={() => setShowAssinatura(false)}>
              ← Voltar
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Tela de rota ativa
  if (rotaAtiva) {
    const clienteAtual = clientes.find(c => c.id === rotaAtiva.clienteId);
    return (
      <div style={{ ...styles.container, backgroundColor: cores.background }}>
        <h2 style={{ ...styles.titulo, color: cores.primary }}>🚚 Em Rota</h2>
        <div style={{ ...styles.cardRota, backgroundColor: cores.card, borderColor: cores.primary }}>
          <p style={{ ...styles.nome, color: cores.primary }}>{rotaAtiva.clienteNome}</p>
          <p style={{ ...styles.info, color: cores.textSecondary }}>📍 {rotaAtiva.clienteEndereco}{rotaAtiva.clienteApt ? `, Apt ${rotaAtiva.clienteApt}` : ''}</p>
          <p style={{ ...styles.info, color: cores.textSecondary }}>📞 {rotaAtiva.clienteTelefone}</p>
          <p style={{ ...styles.info, color: cores.textSecondary }}>🔑 Código: <strong style={{ color: cores.primary, fontSize: 20 }}>{rotaAtiva.codigoEntrega}</strong></p>
          <p style={{ ...styles.info, color: cores.textSecondary }}>🕐 Iniciado: {new Date(rotaAtiva.iniciadoEm).toLocaleString('pt-BR')}</p>
        </div>

        {/* Próximos clientes na rota */}
        {ordemRota.length > 1 && (
          <div style={{ ...styles.proximos, backgroundColor: cores.card, borderColor: cores.cardBorder }}>
            <h4 style={{ color: cores.text }}>📋 Próximos na rota:</h4>
            {ordemRota.slice(1).map(id => {
              const c = clientes.find(c => c.id === id);
              return c ? <p key={id} style={{ color: cores.textSecondary }}>• {c.nome}</p> : null;
            })}
          </div>
        )}

        <button style={{ ...styles.botaoConcluir, backgroundColor: cores.success, color: '#fff' }} onClick={handleConcluirRota}>✅ Concluir Entrega</button>
        <button style={{ ...styles.botaoVoltar, backgroundColor: cores.danger, color: '#fff' }} onClick={() => setRotaAtiva(null)}>← Cancelar Rota</button>
      </div>
    );
  }

  return (
    <div style={{ ...styles.container, backgroundColor: cores.background }}>
      <div style={styles.header}>
        <h1 style={{ ...styles.titulo, color: cores.primary }}>🚚 {usuario.nome}</h1>
        <div style={{ display: 'flex', gap: 8 }}>
          <button style={{ ...styles.botaoTema, backgroundColor: cores.card, color: cores.text }} onClick={toggleTheme}>🌓</button>
          <button style={{ ...styles.botaoSair, backgroundColor: cores.danger, color: '#fff' }} onClick={onLogout}>Sair</button>
        </div>
      </div>

      {/* ATALHOS */}
      <div style={{ ...styles.atalhos, backgroundColor: cores.card }}>
        <span style={{ color: cores.text }}>📅 {new Date().toLocaleDateString('pt-BR')}</span>
        <span style={{ color: cores.text }}>🎯 Meta: 15 entregas/dia</span>
      </div>

      <input style={{ ...styles.busca, backgroundColor: cores.card, color: cores.text, borderColor: cores.cardBorder }} placeholder="Buscar cliente ou código..." value={busca} onChange={e => setBusca(e.target.value)} />

      {/* Ordem da rota (se tiver) */}
      {ordemRota.length > 0 && (
        <div style={{ ...styles.ordemInfo, backgroundColor: cores.card, borderColor: cores.cardBorder }}>
          <p style={{ color: cores.text }}>📋 Ordem da rota definida: {ordemRota.length} cliente(s)</p>
          <button style={{ ...styles.botaoLimparOrdem, backgroundColor: cores.danger, color: '#fff' }} onClick={() => setOrdemRota([])}>Limpar ordem</button>
        </div>
      )}

      {clientesFiltrados.map((c, idx) => (
        <div key={c.id} style={{ ...styles.card, backgroundColor: cores.card, borderColor: cores.cardBorder }}>
          <div style={{ flex: 1 }}>
            <p style={{ ...styles.nome, color: cores.primary }}>{c.nome}</p>
            <p style={{ ...styles.info, color: cores.textSecondary }}>📍 {c.endereco}{c.apt ? `, Apt ${c.apt}` : ''}</p>
            <p style={{ ...styles.info, color: cores.textSecondary }}>📞 {c.telefone}</p>
            <p style={{ ...styles.info, color: cores.textSecondary }}>🔑 Código: {c.codigoEntrega}</p>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {ordemRota.length > 0 && ordemRota.includes(c.id) && (
              <div style={{ display: 'flex', gap: 4 }}>
                <button style={styles.botaoReordenar} onClick={() => handleReordenar(c.id, 'cima')}>▲</button>
                <button style={styles.botaoReordenar} onClick={() => handleReordenar(c.id, 'baixo')}>▼</button>
              </div>
            )}
            <button style={{ ...styles.botaoIniciar, backgroundColor: cores.primary, color: cores.background }} onClick={() => handleIniciarRota(c)}>
              🚚 Iniciar
            </button>
          </div>
        </div>
      ))}
      {clientesFiltrados.length === 0 && <p style={{ ...styles.vazio, color: cores.textSecondary }}>Nenhum cliente encontrado.</p>}
    </div>
  );
}

const styles = {
  container: { minHeight: '100vh', padding: 16 },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, paddingTop: 20, flexWrap: 'wrap', gap: 10 },
  titulo: { fontSize: 24, margin: 0 },
  botaoSair: { border: 'none', borderRadius: 8, padding: '8px 16px', fontWeight: 'bold', cursor: 'pointer' },
  botaoTema: { border: 'none', borderRadius: 30, padding: '8px 12px', fontSize: 20, cursor: 'pointer' },
  atalhos: { display: 'flex', justifyContent: 'space-between', padding: 12, borderRadius: 12, marginBottom: 16, flexWrap: 'wrap', gap: 8 },
  busca: { width: '100%', border: '1px solid', borderRadius: 10, padding: 12, marginBottom: 12, boxSizing: 'border-box' },
  ordemInfo: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: 12, borderRadius: 12, marginBottom: 12, flexWrap: 'wrap', gap: 8 },
  botaoLimparOrdem: { border: 'none', borderRadius: 8, padding: '6px 12px', fontSize: 12, cursor: 'pointer' },
  card: { borderRadius: 12, padding: 14, marginBottom: 10, display: 'flex', alignItems: 'center', justifyContent: 'space-between', border: '1px solid' },
  nome: { fontWeight: 'bold', fontSize: 16, margin: '0 0 4px 0' },
  info: { fontSize: 13, margin: '0 0 2px 0' },
  botaoIniciar: { border: 'none', borderRadius: 8, padding: '8px 12px', fontWeight: 'bold', cursor: 'pointer' },
  botaoReordenar: { background: 'none', border: '1px solid', borderRadius: 4, padding: '2px 6px', cursor: 'pointer', fontSize: 12 },
  cardRota: { backgroundColor: '#16213e', borderRadius: 12, padding: 20, marginBottom: 20, border: '2px solid', textAlign: 'center' },
  proximos: { borderRadius: 12, padding: 12, marginBottom: 16, border: '1px solid' },
  cardAssinatura: { borderRadius: 12, padding: 20, border: '1px solid' },
  assinaturaInput: { width: '100%', border: '1px solid', borderRadius: 8, padding: 12, marginTop: 12, fontFamily: 'cursive', fontSize: 16 },
  botaoConcluir: { border: 'none', borderRadius: 8, padding: '14px 20px', fontWeight: 'bold', cursor: 'pointer', width: '100%', marginBottom: 12 },
  botaoVoltar: { border: 'none', borderRadius: 8, padding: '12px 20px', fontWeight: 'bold', cursor: 'pointer', width: '100%' },
  vazio: { textAlign: 'center', marginTop: 40 }
};
