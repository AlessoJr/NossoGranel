import React, { useEffect, useState } from 'react';
import { collection, addDoc, updateDoc, doc, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';

export default function EntregadorHome({ usuario, onLogout }) {
  const [clientes, setClientes] = useState([]);
  const [busca, setBusca] = useState([]);
  const [emRota, setEmRota] = useState(null);
  const [nomeEditando, setNomeEditando] = useState(false);
  const [novoNome, setNovoNome] = useState(usuario.nome);
  const [nomeAtual, setNomeAtual] = useState(usuario.nome);
  const [darkMode, setDarkMode] = useState(true);
  const [buscar, setBuscar] = useState('');

  const tema = darkMode ? temaEscuro : temaClaro;

  useEffect(() => {
    const unsub1 = onSnapshot(collection(db, 'clientes'), snap => {
      setClientes(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    const unsub2 = onSnapshot(collection(db, 'rotas'), snap => {
      const rotasEmRota = snap.docs
        .map(d => ({ id: d.id, ...d.data() }))
        .find(r => r.status === 'em_rota' && r.entregador === nomeAtual);
      setEmRota(rotasEmRota || null);
    });
    return () => { unsub1(); unsub2(); };
  }, [nomeAtual]);

  async function iniciarRota(cliente) {
    if (emRota) {
      alert('Finalize a entrega atual antes de iniciar uma nova!');
      return;
    }
    const rota = {
      clienteId: cliente.id,
      clienteNome: cliente.nome,
      clienteEndereco: cliente.endereco,
      clienteApt: cliente.apt || '',
      clienteTelefone: cliente.telefone,
      codigoEntrega: cliente.codigoEntrega,
      entregador: nomeAtual,
      status: 'em_rota',
      iniciadoEm: new Date().toISOString(),
    };
    const ref = await addDoc(collection(db, 'rotas'), rota);
    setEmRota({ ...rota, id: ref.id });
  }

  async function concluirRota() {
    if (!window.confirm('Confirmar conclusão da entrega?')) return;
    await updateDoc(doc(db, 'rotas', emRota.id), {
      status: 'concluida',
      concluidoEm: new Date().toISOString(),
    });
    setEmRota(null);
  }

  function abrirGPS(endereco, apt) {
    const enderecoCompleto = `${endereco}${apt ? ` ${apt}` : ''}`;
    const url = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(enderecoCompleto)}`;
    window.open(url, '_blank');
  }

  function salvarNome() {
    if (!novoNome.trim()) { alert('Nome não pode ser vazio!'); return; }
    setNomeAtual(novoNome);
    setNomeEditando(false);
  }

  const filtrados = clientes.filter(c =>
    c.nome?.toLowerCase().includes(buscar.toLowerCase()) ||
    c.codigoEntrega?.includes(buscar)
  );

  if (emRota) return (
    <div style={{ ...styles.container, backgroundColor: tema.bg }}>
      <div style={styles.header}>
        <h2 style={{ ...styles.titulo, color: tema.titulo }}>🚚 Em Rota</h2>
        <button style={styles.botaoModo} onClick={() => setDarkMode(!darkMode)}>
          {darkMode ? '☀️' : '🌙'}
        </button>
      </div>
      <div style={{ ...styles.cardRota, borderColor: tema.destaque }}>
        <p style={{ ...styles.nome, color: tema.destaque }}>{emRota.clienteNome}</p>
        <p style={{ ...styles.info, color: tema.texto }}>📞 {emRota.clienteTelefone}</p>
        <p style={{ ...styles.info, color: tema.texto }}>📍 {emRota.clienteEndereco}{emRota.clienteApt ? `, Apt ${emRota.clienteApt}` : ''}</p>
        <p style={{ ...styles.info, color: tema.texto }}>🔑 Código: <strong style={{ color: tema.destaque }}>{emRota.codigoEntrega}</strong></p>
        <p style={{ ...styles.info, color: tema.texto }}>🕐 Iniciado: {new Date(emRota.iniciadoEm).toLocaleString('pt-BR')}</p>
        <button
          style={styles.botaoGPS}
          onClick={() => abrirGPS(emRota.clienteEndereco, emRota.clienteApt)}>
          📍 Abrir no GPS
        </button>
      </div>
      <button style={styles.botaoConcluir} onClick={concluirRota}>✅ Concluir Entrega</button>
    </div>
  );

  return (
    <div style={{ ...styles.container, backgroundColor: tema.bg }}>
      <div style={styles.header}>
        <div>
          {nomeEditando ? (
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <input
                style={{ ...styles.inputNome, backgroundColor: tema.card, color: tema.texto, borderColor: tema.borda }}
                value={novoNome}
                onChange={e => setNovoNome(e.target.value)}
              />
              <button style={styles.botaoSalvarNome} onClick={salvarNome}>✅</button>
              <button style={styles.botaoCancelarNome} onClick={() => setNomeEditando(false)}>❌</button>
            </div>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <h1 style={{ ...styles.titulo, color: tema.titulo }}>👤 {nomeAtual}</h1>
              <button style={styles.botaoEditarNome} onClick={() => setNomeEditando(true)}>✏️</button>
            </div>
          )}
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button style={styles.botaoModo} onClick={() => setDarkMode(!darkMode)}>
            {darkMode ? '☀️' : '🌙'}
          </button>
          <button style={styles.botaoLogout} onClick={onLogout}>Sair</button>
        </div>
      </div>

      <input
        style={{ ...styles.busca, backgroundColor: tema.card, color: tema.texto, borderColor: tema.borda }}
        placeholder="Buscar cliente ou código..."
        value={buscar}
        onChange={e => setBuscar(e.target.value)}
      />

      {filtrados.map(c => (
        <div key={c.id} style={{ ...styles.card, backgroundColor: tema.card, borderColor: tema.borda }}>
          <div style={{ flex: 1 }}>
            <p style={{ ...styles.nome, color: tema.destaque }}>{c.nome}</p>
            <p style={{ ...styles.info, color: tema.texto }}>📍 {c.endereco}{c.apt ? `, Apt ${c.apt}` : ''}</p>
            <p style={{ ...styles.info, color: tema.texto }}>📞 {c.telefone}</p>
          </div>
          <button style={styles.botaoRota} onClick={() => iniciarRota(c)}>🚚 Iniciar</button>
        </div>
      ))}
      {filtrados.length === 0 && <p style={{ ...styles.vazio, color: tema.texto }}>Nenhum cliente encontrado.</p>}
    </div>
  );
}

const temaEscuro = {
  bg: '#1a1a2e',
  card: '#16213e',
  texto: '#ccc',
  titulo: '#e2b96f',
  destaque: '#e2b96f',
  borda: '#2a2a4a',
};

const temaClaro = {
  bg: '#f5f5f5',
  card: '#fff',
  texto: '#333',
  titulo: '#b8860b',
  destaque: '#b8860b',
  borda: '#ddd',
};

const styles = {
  container: { minHeight: '100vh', padding: 16 },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, paddingTop: 20 },
  titulo: { fontSize: 20, margin: 0 },
  busca: { width: '100%', border: '1px solid', borderRadius: 10, padding: 12, marginBottom: 12, boxSizing: 'border-box', fontSize: 15 },
  card: { borderRadius: 12, padding: 14, marginBottom: 10, display: 'flex', alignItems: 'center', border: '1px solid' },
  cardRota: { borderRadius: 12, padding: 14, marginBottom: 10, border: '2px solid', backgroundColor: '#16213e' },
  nome: { fontWeight: 'bold', fontSize: 16, margin: '0 0 4px' },
  info: { fontSize: 13, margin: '0 0 2px' },
  botaoRota: { backgroundColor: '#e2b96f', color: '#1a1a2e', border: 'none', borderRadius: 8, padding: '8px 12px', fontWeight: 'bold', cursor: 'pointer' },
  botaoConcluir: { width: '100%', backgroundColor: '#27ae60', color: '#fff', border: 'none', borderRadius: 10, padding: 16, fontSize: 16, fontWeight: 'bold', cursor: 'pointer', marginTop: 12 },
  botaoLogout: { backgroundColor: '#c0392b', color: '#fff', border: 'none', borderRadius: 8, padding: '8px 12px', cursor: 'pointer' },
  botaoModo: { background: 'none', border: '1px solid #555', borderRadius: 8, padding: '6px 10px', fontSize: 18, cursor: 'pointer' },
  botaoGPS: { width: '100%', backgroundColor: '#2980b9', color: '#fff', border: 'none', borderRadius: 10, padding: 14, fontSize: 15, fontWeight: 'bold', cursor: 'pointer', marginTop: 12 },
  botaoEditarNome: { background: 'none', border: 'none', fontSize: 18, cursor: 'pointer' },
  botaoSalvarNome: { background: 'none', border: 'none', fontSize: 18, cursor: 'pointer' },
  botaoCancelarNome: { background: 'none', border: 'none', fontSize: 18, cursor: 'pointer' },
  inputNome: { border: '1px solid', borderRadius: 8, padding: '6px 10px', fontSize: 16 },
  vazio: { textAlign: 'center', marginTop: 40 },
};
