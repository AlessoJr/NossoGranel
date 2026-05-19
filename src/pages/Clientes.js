import React, { useEffect, useState } from 'react';
import { collection, getDocs, deleteDoc, doc, addDoc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';

function copiar(texto, label) {
  navigator.clipboard.writeText(texto).then(() => {
    alert(`${label} copiado!`);
  });
}

export default function Clientes({ onLogout }) {
  const [clientes, setClientes] = useState([]);
  const [busca, setBusca] = useState('');
  const [form, setForm] = useState(null);

  async function carregar() {
    const snap = await getDocs(collection(db, 'clientes'));
    const lista = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    const ordenados = lista.sort((a, b) => {
      if (a.fixado && !b.fixado) return -1;
      if (!a.fixado && b.fixado) return 1;
      return (a.nome || '').localeCompare(b.nome || '');
    });
    setClientes(ordenados);
  }

  useEffect(() => { carregar(); }, []);

  async function excluir(id) {
    if (window.confirm('Excluir este cliente?')) {
      await deleteDoc(doc(db, 'clientes', id));
      carregar();
    }
  }

  async function salvar(dados) {
    if (dados.id) {
      await updateDoc(doc(db, 'clientes', dados.id), dados);
    } else {
      await addDoc(collection(db, 'clientes'), dados);
    }
    setForm(null);
    carregar();
  }

  async function toggleFixado(id, fixadoAtual) {
    await updateDoc(doc(db, 'clientes', id), { fixado: !fixadoAtual });
    carregar();
  }

  const filtrados = busca.trim() === '' 
    ? clientes 
    : clientes.filter(c =>
        c.nome?.toLowerCase().includes(busca.toLowerCase()) ||
        c.telefone?.includes(busca) ||
        c.codigoEntrega?.includes(busca)
      );

  if (form !== null) return <FormCliente cliente={form} onSalvar={salvar} onCancelar={() => setForm(null)} />;

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h1 style={styles.titulo}>🌾 Clientes</h1>
        <div style={{ display: 'flex', gap: 8 }}>
          <button style={styles.botaoAdd} onClick={() => setForm({})}>+ Novo</button>
          <button style={styles.botaoLogout} onClick={onLogout}>Sair</button>
        </div>
      </div>
      <input style={styles.busca} placeholder="Buscar por nome, telefone ou código..." value={busca} onChange={e => setBusca(e.target.value)} />
      {filtrados.map(c => (
        <div key={c.id} style={styles.card}>
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
              <p style={styles.nome}>{c.nome}</p>
              <button 
                onClick={() => toggleFixado(c.id, c.fixado)} 
                style={styles.botaoFixar}
                title={c.fixado ? 'Desfixar' : 'Fixar cliente'}
              >
                {c.fixado ? '⭐' : '☆'}
              </button>
            </div>
            <p style={styles.info}>📞 <span style={styles.copiavel} onClick={() => copiar(c.telefone, 'Telefone')}>{c.telefone}</span></p>
            <p style={styles.info}>📍 {c.endereco}{c.apt ? `, Apt ${c.apt}` : ''}</p>
            <p style={styles.info}>
              🔑 <span style={styles.copiavel} onClick={() => copiar(c.codigoEntrega, 'Código de entrega')}>{c.codigoEntrega}</span>
              {' '}| 🛒 Pedidos: {c.qtdPedidos || 0}
            </p>
            {c.observacoes && <p style={styles.info}>📝 {c.observacoes}</p>}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <button style={styles.botaoEditar} onClick={() => setForm(c)}>✏️</button>
            <button style={styles.botaoDeletar} onClick={() => excluir(c.id)}>🗑️</button>
          </div>
        </div>
      ))}
      {filtrados.length === 0 && <p style={styles.vazio}>Nenhum cliente encontrado.</p>}
    </div>
  );
}

function FormCliente({ cliente, onSalvar, onCancelar }) {
  const [dados, setDados] = useState({
    nome: cliente.nome || '',
    telefone: cliente.telefone || '',
    endereco: cliente.endereco || '',
    apt: cliente.apt || '',
    codigoEntrega: cliente.codigoEntrega || '',
    qtdPedidos: cliente.qtdPedidos || 0,
    observacoes: cliente.observacoes || '',
    fixado: cliente.fixado || false,
    id: cliente.id || null,
  });

  function handleChange(e) {
    const value = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
    setDados({ ...dados, [e.target.name]: value });
  }

  function handleSubmit(e) {
    e.preventDefault();
    if (!dados.nome.trim()) { alert('Nome é obrigatório!'); return; }
    onSalvar({ ...dados, qtdPedidos: parseInt(dados.qtdPedidos) || 0 });
  }

  return (
    <div style={styles.container}>
      <h2 style={styles.titulo}>{dados.id ? '✏️ Editar Cliente' : '➕ Novo Cliente'}</h2>
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
            <label style={{ color: '#aaa', fontSize: 13 }}>{campo.label}</label>
            <input style={styles.input} name={campo.name} type={campo.type} value={dados[campo.name]} onChange={handleChange} />
          </div>
        ))}
        
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <label style={{ color: '#aaa', fontSize: 13 }}>Fixar no topo:</label>
          <label style={{ color: '#e2b96f', display: 'flex', alignItems: 'center', gap: 6 }}>
            <input type="checkbox" name="fixado" checked={dados.fixado} onChange={handleChange} />
            {dados.fixado ? '⭐ Cliente fixado' : '☆ Cliente normal'}
          </label>
        </div>

        <div>
          <label style={{ color: '#aaa', fontSize: 13 }}>Observações</label>
          <textarea style={{ ...styles.input, height: 80 }} name="observacoes" value={dados.observacoes} onChange={handleChange} />
        </div>
        
        <button style={styles.botaoAdd} type="submit">💾 Salvar</button>
        <button style={styles.botaoLogout} type="button" onClick={onCancelar}>Cancelar</button>
      </form>
    </div>
  );
}

const styles = {
  container: { minHeight: '100vh', backgroundColor: '#1a1a2e', padding: 16 },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, paddingTop: 20 },
  titulo: { color: '#e2b96f', fontSize: 24, margin: 0 },
  busca: { width: '100%', backgroundColor: '#16213e', color: '#fff', border: '1px solid #333', borderRadius: 10, padding: 12, marginBottom: 12, boxSizing: 'border-box' },
  card: { backgroundColor: '#16213e', borderRadius: 12, padding: 14, marginBottom: 10, display: 'flex', border: '1px solid #2a2a4a' },
  nome: { color: '#e2b96f', fontWeight: 'bold', fontSize: 16, margin: 0 },
  info: { color: '#ccc', fontSize: 13, margin: '0 0 2px' },
  copiavel: { color: '#e2b96f', textDecoration: 'underline', cursor: 'pointer' },
  input: { width: '100%', backgroundColor: '#16213e', color: '#fff', border: '1px solid #2a2a4a', borderRadius: 10, padding: 12, fontSize: 15, boxSizing: 'border-box' },
  botaoAdd: { backgroundColor: '#e2b96f', color: '#1a1a2e', border: 'none', borderRadius: 8, padding: '8px 16px', fontWeight: 'bold', cursor: 'pointer' },
  botaoLogout: { backgroundColor: '#c0392b', color: '#fff', border: 'none', borderRadius: 8, padding: '8px 16px', cursor: 'pointer' },
  botaoEditar: { background: 'none', border: 'none', fontSize: 20, cursor: 'pointer' },
  botaoDeletar: { background: 'none', border: 'none', fontSize: 20, cursor: 'pointer' },
  botaoFixar: { background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: '#f1c40f' },
  vazio: { color: '#888', textAlign: 'center', marginTop: 40 },
};
