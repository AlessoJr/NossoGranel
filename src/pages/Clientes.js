import React, { useEffect, useState } from 'react';
import { collection, getDocs, deleteDoc, doc, addDoc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';

function copiar(texto, label) {
  navigator.clipboard.writeText(texto).then(() => alert(`${label} copiado!`));
}

export default function Clientes({ onLogout }) {
  const [clientes, setClientes] = useState([]);
  const [busca, setBusca] = useState('');
  const [form, setForm] = useState(null);

  async function carregar() {
    const snap = await getDocs(collection(db, 'clientes'));
    const lista = snap.docs.map(d => ({ 
      id: d.id, 
      ...d.data(),
      fixado: d.data().fixado === true ? true : false
    }));
    const ordenados = [...lista].sort((a, b) => {
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
    try {
      const dadosParaSalvar = {
        nome: dados.nome || '',
        telefone: dados.telefone || '',
        endereco: dados.endereco || '',
        apt: dados.apt || '',
        codigoEntrega: dados.codigoEntrega || '',
        qtdPedidos: Number(dados.qtdPedidos) || 0,
        observacoes: dados.observacoes || '',
        fixado: dados.fixado === true ? true : false
      };

      if (dados.id) {
        await updateDoc(doc(db, 'clientes', dados.id), dadosParaSalvar);
      } else {
        await addDoc(collection(db, 'clientes'), dadosParaSalvar);
      }
      setForm(null);
      await carregar();
    } catch (error) {
      console.error('Erro ao salvar:', error);
      alert('Erro ao salvar cliente');
    }
  }

  async function toggleFixado(id, fixadoAtual) {
    try {
      const novoFixado = !fixadoAtual;
      await updateDoc(doc(db, 'clientes', id), { fixado: novoFixado });
      await carregar();
    } catch (error) {
      console.error('Erro ao fixar:', error);
      alert('Erro ao fixar cliente');
    }
  }

  const filtrados = busca.trim() === '' 
    ? clientes 
    : clientes.filter(c =>
        c.nome?.toLowerCase().includes(busca.toLowerCase()) ||
        c.telefone?.includes(busca) ||
        c.codigoEntrega?.includes(busca)
      );

  if (form !== null) {
    return <FormCliente cliente={form} onSalvar={salvar} onCancelar={() => setForm(null)} />;
  }

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h1 style={styles.titulo}>🌾 Clientes</h1>
        <div style={{ display: 'flex', gap: 8 }}>
          <button style={styles.botaoAdd} onClick={() => setForm({ fixado: false, qtdPedidos: 0 })}>+ Novo</button>
          <button style={styles.botaoLogout} onClick={onLogout}>Sair</button>
        </div>
      </div>
      <input style={styles.busca} placeholder="Buscar por nome, telefone ou código..." value={busca} onChange={e => setBusca(e.target.value)} />
      {filtrados.map(c => (
        <div key={c.id} style={styles.card}>
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4, flexWrap: 'wrap' }}>
              <p style={styles.nome}>{c.nome || 'Sem nome'}</p>
              <button onClick={() => toggleFixado(c.id, c.fixado)} style={c.fixado ? styles.botaoFixadoAtivo : styles.botaoFixar}>
                {c.fixado ? '⭐ FIXADO' : '☆ FIXAR'}
              </button>
            </div>
            <p style={styles.info}>📞 <span style={styles.copiavel} onClick={() => copiar(c.telefone, 'Telefone')}>{c.telefone || '---'}</span></p>
            <p style={styles.info}>📍 {c.endereco || '---'}{c.apt ? `, Apt ${c.apt}` : ''}</p>
            <p style={styles.info}>🔑 <span style={styles.copiavel} onClick={() => copiar(c.codigoEntrega, 'Código')}>{c.codigoEntrega || '---'}</span> | 🛒 Pedidos: {c.qtdPedidos || 0}</p>
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
    fixado: cliente.fixado === true ? true : false,
    id: cliente.id || null,
  });

  function handleChange(e) {
    const value = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
    setDados({ ...dados, [e.target.name]: value });
  }

  function handleSubmit(e) {
    e.preventDefault();
    if (!dados.nome.trim()) { 
      alert('Nome é obrigatório!'); 
      return; 
    }
    onSalvar(dados);
  }

  return (
    <div style={styles.container}>
      <h2 style={styles.titulo}>{dados.id ? '✏️ Editar Cliente' : '➕ Novo Cliente'}</h2>
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 12, maxWidth: 500 }}>
        <div>
          <label style={{ color: '#aaa', fontSize: 13 }}>Nome *</label>
          <input style={styles.input} name="nome" type="text" value={dados.nome} onChange={handleChange} />
        </div>
        <div>
          <label style={{ color: '#aaa', fontSize: 13 }}>Telefone</label>
          <input style={styles.input} name="telefone" type="tel" value={dados.telefone} onChange={handleChange} />
        </div>
        <div>
          <label style={{ color: '#aaa', fontSize: 13 }}>Endereço</label>
          <input style={styles.input} name="endereco" type="text" value={dados.endereco} onChange={handleChange} />
        </div>
        <div>
          <label style={{ color: '#aaa', fontSize: 13 }}>Apartamento</label>
          <input style={styles.input} name="apt" type="text" value={dados.apt} onChange={handleChange} />
        </div>
        <div>
          <label style={{ color: '#aaa', fontSize: 13 }}>Código de Entrega</label>
          <input style={styles.input} name="codigoEntrega" type="text" value={dados.codigoEntrega} onChange={handleChange} />
        </div>
        <div>
          <label style={{ color: '#aaa', fontSize: 13 }}>Qtd. Pedidos</label>
          <input style={styles.input} name="qtdPedidos" type="number" value={dados.qtdPedidos} onChange={handleChange} />
        </div>
        <div>
          <label style={{ color: '#aaa', fontSize: 13 }}>Observações</label>
          <textarea style={{ ...styles.input, height: 80 }} name="observacoes" value={dados.observacoes} onChange={handleChange} />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <label style={{ color: '#aaa', fontSize: 13 }}>Fixar no topo:</label>
          <label style={{ color: '#e2b96f', display: 'flex', alignItems: 'center', gap: 6 }}>
            <input type="checkbox" name="fixado" checked={dados.fixado} onChange={handleChange} />
            {dados.fixado ? '⭐ Cliente fixado' : '☆ Cliente normal'}
          </label>
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
  botaoEditar: { background: '#2a2a4a', border: 'none', fontSize: 18, cursor: 'pointer', padding: '8px 12px', borderRadius: 8, minWidth: 44, minHeight: 44 },
  botaoDeletar: { background: '#2a2a4a', border: 'none', fontSize: 18, cursor: 'pointer', padding: '8px 12px', borderRadius: 8, minWidth: 44, minHeight: 44 },
  botaoFixar: { background: '#2a2a4a', border: 'none', fontSize: 14, fontWeight: 'bold', cursor: 'pointer', color: '#aaa', padding: '8px 16px', borderRadius: 20, minWidth: 100, minHeight: 44, display: 'flex', alignItems: 'center', justifyContent: 'center' },
  botaoFixadoAtivo: { background: '#e2b96f', border: 'none', fontSize: 14, fontWeight: 'bold', cursor: 'pointer', color: '#1a1a2e', padding: '8px 16px', borderRadius: 20, minWidth: 100, minHeight: 44, display: 'flex', alignItems: 'center', justifyContent: 'center' },
  vazio: { color: '#888', textAlign: 'center', marginTop: 40 },
};
