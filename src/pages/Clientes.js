import React, { useEffect, useState } from 'react';
import { collection, deleteDoc, doc, addDoc, updateDoc, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';

function copiar(texto, label) {
  navigator.clipboard.writeText(texto).then(() => alert(`${label} copiado!`));
}

export default function Clientes({ onLogout }) {
  const [clientes, setClientes] = useState([]);
  const [rotas, setRotas] = useState([]);
  const [busca, setBusca] = useState('');
  const [form, setForm] = useState(null);
  const [aba, setAba] = useState('clientes');
  const [darkMode, setDarkMode] = useState(true);

  const tema = darkMode ? temaEscuro : temaClaro;

  useEffect(() => {
    const unsub1 = onSnapshot(collection(db, 'clientes'), snap => {
      setClientes(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    const unsub2 = onSnapshot(collection(db, 'rotas'), snap => {
      setRotas(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    return () => { unsub1(); unsub2(); };
  }, []);

  async function excluirCliente(id) {
    if (window.confirm('Excluir este cliente?')) await deleteDoc(doc(db, 'clientes', id));
  }

  async function excluirRota(id) {
    if (window.confirm('Excluir esta rota?')) await deleteDoc(doc(db, 'rotas', id));
  }

  async function salvar(dados) {
    if (dados.id) {
      const { id, ...resto } = dados;
      await updateDoc(doc(db, 'clientes', id), resto);
    } else {
      await addDoc(collection(db, 'clientes'), dados);
    }
    setForm(null);
  }

  const filtrados = clientes.filter(c =>
    c.nome?.toLowerCase().includes(busca.toLowerCase()) ||
    c.telefone?.includes(busca) ||
    c.codigoEntrega?.includes(busca)
  );

  const rotasEmAndamento = rotas.filter(r => r.status === 'em_rota');
  const rotasConcluidas = rotas.filter(r => r.status === 'concluida').sort((a, b) => new Date(b.concluidoEm) - new Date(a.concluidoEm));

  if (form !== null) return <FormCliente cliente={form} onSalvar={salvar} onCancelar={() => setForm(null)} darkMode={darkMode} />;

  return (
    <div style={{ ...styles.container, backgroundColor: tema.bg }}>
      <div style={styles.header}>
        <h1 style={{ ...styles.titulo, color: tema.destaque }}>🌾 NossoGranel</h1>
        <div style={{ display: 'flex', gap: 8 }}>
          <button style={styles.botaoModo} onClick={() => setDarkMode(!darkMode)}>
            {darkMode ? '☀️' : '🌙'}
          </button>
          <button style={styles.botaoLogout} onClick={onLogout}>Sair</button>
        </div>
      </div>

      <div style={styles.abas}>
        <button style={aba === 'clientes' ? styles.abaAtiva : { ...styles.aba, backgroundColor: tema.card, color: tema.texto, borderColor: tema.borda }} onClick={() => setAba('clientes')}>👥 Clientes</button>
        <button style={aba === 'rotas' ? styles.abaAtiva : { ...styles.aba, backgroundColor: tema.card, color: tema.texto, borderColor: tema.borda }} onClick={() => setAba('rotas')}>
          🚚 Rotas {rotasEmAndamento.length > 0 && <span style={styles.badge}>{rotasEmAndamento.length}</span>}
        </button>
        <button style={aba === 'historico' ? styles.abaAtiva : { ...styles.aba, backgroundColor: tema.card, color: tema.texto, borderColor: tema.borda }} onClick={() => setAba('historico')}>📋 Histórico</button>
      </div>

      {aba === 'clientes' && (
        <>
          <button style={styles.botaoAdd} onClick={() => setForm({})}>+ Novo Cliente</button>
          <input style={{ ...styles.busca, backgroundColor: tema.card, color: tema.texto, borderColor: tema.borda }} placeholder="Buscar por nome, telefone ou código..." value={busca} onChange={e => setBusca(e.target.value)} />
          {filtrados.map(c => (
            <div key={c.id} style={{ ...styles.card, backgroundColor: tema.card, borderColor: tema.borda }}>
              <div style={{ flex: 1 }}>
                <p style={{ ...styles.nome, color: tema.destaque }}>{c.nome}</p>
                <p style={{ ...styles.info, color: tema.texto }}>📞 <span style={styles.copiavel} onClick={() => copiar(c.telefone, 'Telefone')}>{c.telefone}</span></p>
                <p style={{ ...styles.info, color: tema.texto }}>📍 {c.endereco}{c.apt ? `, Apt ${c.apt}` : ''}</p>
                <p style={{ ...styles.info, color: tema.texto }}>🔑 <span style={styles.copiavel} onClick={() => copiar(c.codigoEntrega, 'Código')}>{c.codigoEntrega}</span> | 🛒 {c.qtdPedidos}</p>
                {c.observacoes && <p style={{ ...styles.info, color: tema.texto }}>📝 {c.observacoes}</p>}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <button style={styles.botaoEditar} onClick={() => setForm(c)}>✏️</button>
                <button style={styles.botaoDeletar} onClick={() => excluirCliente(c.id)}>🗑️</button>
              </div>
            </div>
          ))}
          {filtrados.length === 0 && <p style={{ ...styles.vazio, color: tema.texto }}>Nenhum cliente encontrado.</p>}
        </>
      )}

      {aba === 'rotas' && (
        <>
          <h3 style={{ color: tema.destaque, marginBottom: 12 }}>🚚 Em Andamento</h3>
          {rotasEmAndamento.length === 0 && <p style={{ ...styles.vazio, color: tema.texto }}>Nenhuma rota em andamento.</p>}
          {rotasEmAndamento.map(r => (
            <div key={r.id} style={{ ...styles.cardRota, backgroundColor: tema.card }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div style={{ flex: 1 }}>
                  <p style={{ ...styles.nome, color: tema.destaque }}>{r.clienteNome}</p>
                  <p style={{ ...styles.info, color: tema.texto }}>👤 Entregador: <strong style={{ color: tema.destaque }}>{r.entregador}</strong></p>
                  <p style={{ ...styles.info, color: tema.texto }}>🔑 Código: <span style={styles.copiavel} onClick={() => copiar(r.codigoEntrega, 'Código')}>{r.codigoEntrega}</span></p>
                  <p style={{ ...styles.info, color: tema.texto }}>🕐 Iniciado: {new Date(r.iniciadoEm).toLocaleString('pt-BR')}</p>
                </div>
                <button style={styles.botaoDeletar} onClick={() => excluirRota(r.id)}>🗑️</button>
              </div>
            </div>
          ))}
        </>
      )}

      {aba === 'historico' && (
        <>
          <h3 style={{ color: tema.destaque, marginBottom: 12 }}>📋 Entregas Concluídas</h3>
          {rotasConcluidas.length === 0 && <p style={{ ...styles.vazio, color: tema.texto }}>Nenhuma entrega concluída.</p>}
          {rotasConcluidas.map(r => (
            <div key={r.id} style={{ ...styles.cardConcluido, backgroundColor: tema.card }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div style={{ flex: 1 }}>
                  <p style={{ ...styles.nome, color: tema.destaque }}>{r.clienteNome}</p>
                  <p style={{ ...styles.info, color: tema.texto }}>👤 Entregador: {r.entregador}</p>
                  <p style={{ ...styles.info, color: tema.texto }}>🔑 Código: <span style={styles.copiavel} onClick={() => copiar(r.codigoEntrega, 'Código')}>{r.codigoEntrega}</span></p>
                  <p style={{ ...styles.info, color: tema.texto }}>🕐 Iniciado: {new Date(r.iniciadoEm).toLocaleString('pt-BR')}</p>
                  <p style={{ ...styles.info, color: tema.texto }}>✅ Concluído: {new Date(r.concluidoEm).toLocaleString('pt-BR')}</p>
                </div>
                <button style={styles.botaoDeletar} onClick={() => excluirRota(r.id)}>🗑️</button>
              </div>
            </div>
          ))}
        </>
      )}
    </div>
  );
}

function FormCliente({ cliente, onSalvar, onCancelar, darkMode }) {
  const tema = darkMode ? temaEscuro : temaClaro;
  const [dados, setDados] = useState({
    nome: cliente.nome || '',
    telefone: cliente.telefone || '',
    endereco: cliente.endereco || '',
    apt: cliente.apt || '',
    codigoEntrega: cliente.codigoEntrega || '',
    qtdPedidos: cliente.qtdPedidos || 0,
    observacoes: cliente.observacoes || '',
    id: cliente.id || null,
  });

  function handleChange(e) {
    setDados({ ...dados, [e.target.name]: e.target.value });
  }

  function handleSubmit(e) {
    e.preventDefault();
    if (!dados.nome.trim()) { alert('Nome é obrigatório!'); return; }
    onSalvar({ ...dados, qtdPedidos: parseInt(dados.qtdPedidos) || 0 });
  }

  return (
    <div style={{ ...styles.container, backgroundColor: tema.bg }}>
      <h2 style={{ ...styles.titulo, color: tema.destaque }}>{dados.id ? '✏️ Editar Cliente' : '➕ Novo Cliente'}</h2>
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 12, maxWidth: 500 }}>
        {[
          { label: 'Nome *', name: 'nome', type: 'text' },
          { label: 'Telefone', name: 'telefone', type: 'tel' },
          { label: 'Endereço', name: 'endereco', type: 'text' },
          { label: 'Apartamento', name: 'apt', type: 'text' },
          { label: 'Código de Entrega', name: 'codigoEntrega', type: 'text' },
          { label: 'Qtd. Pedidos', name: 'qtdPedidos', type: 'number' },
        ].map(campo => (
          <div key={campo.name}>
            <label style={{ color: tema.texto, fontSize: 13 }}>{campo.label}</label>
            <input style={{ ...styles.input, backgroundColor: tema.card, color: tema.texto, borderColor: tema.borda }} name={campo.name} type={campo.type} value={dados[campo.name]} onChange={handleChange} />
          </div>
        ))}
        <div>
          <label style={{ color: tema.texto, fontSize: 13 }}>Observações</label>
          <textarea style={{ ...styles.input, backgroundColor: tema.card, color: tema.texto, borderColor: tema.borda, height: 80 }} name="observacoes" value={dados.observacoes} onChange={handleChange} />
        </div>
        <button style={styles.botaoAdd} type="submit">💾 Salvar</button>
        <button style={styles.botaoLogout} type="button" onClick={onCancelar}>Cancelar</button>
      </form>
    </div>
  );
}

const temaEscuro = {
  bg: '#1a1a2e',
  card: '#16213e',
  texto: '#ccc',
  destaque: '#e2b96f',
  borda: '#2a2a4a',
};

const temaClaro = {
  bg: '#f5f5f5',
  card: '#fff',
  texto: '#333',
  destaque: '#b8860b',
  borda: '#ddd',
};

const styles = {
  container: { minHeight: '100vh', padding: 16 },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, paddingTop: 20 },
  titulo: { fontSize: 24, margin: 0 },
  abas: { display: 'flex', gap: 8, marginBottom: 16 },
  aba: { flex: 1, border: '1px solid', borderRadius: 8, padding: '8px 4px', fontSize: 13, cursor: 'pointer' },
  abaAtiva: { flex: 1, backgroundColor: '#e2b96f', color: '#1a1a2e', border: 'none', borderRadius: 8, padding: '8px 4px', fontSize: 13, fontWeight: 'bold', cursor: 'pointer' },
  badge: { backgroundColor: '#c0392b', color: '#fff', borderRadius: '50%', padding: '2px 6px', fontSize: 11, marginLeft: 4 },
  busca: { width: '100%', border: '1px solid', borderRadius: 10, padding: 12, marginBottom: 12, boxSizing: 'border-box', fontSize: 15 },
  card: { borderRadius: 12, padding: 14, marginBottom: 10, display: 'flex', border: '1px solid' },
  cardRota: { borderRadius: 12, padding: 14, marginBottom: 10, border: '2px solid #e2b96f' },
  cardConcluido: { borderRadius: 12, padding: 14, marginBottom: 10, border: '2px solid #27ae60' },
  nome: { fontWeight: 'bold', fontSize: 16, margin: '0 0 4px' },
  info: { fontSize: 13, margin: '0 0 2px' },
  copiavel: { color: '#e2b96f', textDecoration: 'underline', cursor: 'pointer' },
  input: { width: '100%', border: '1px solid', borderRadius: 10, padding: 12, fontSize: 15, boxSizing: 'border-box' },
  botaoAdd: { backgroundColor: '#e2b96f', color: '#1a1a2e', border: 'none', borderRadius: 8, padding: '8px 16px', fontWeight: 'bold', cursor: 'pointer', marginBottom: 12 },
  botaoLogout: { backgroundColor: '#c0392b', color: '#fff', border: 'none', borderRadius: 8, padding: '8px 16px', cursor: 'pointer' },
  botaoEditar: { background: 'none', border: 'none', fontSize: 20, cursor: 'pointer' },
  botaoDeletar: { background: 'none', border: 'none', fontSize: 20, cursor: 'pointer' },
  botaoModo: { background: 'none', border: '1px solid #555', borderRadius: 8, padding: '6px 10px', fontSize: 18, cursor: 'pointer' },
  vazio: { textAlign: 'center', marginTop: 40 },
};
