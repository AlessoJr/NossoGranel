import React, { useEffect, useState } from 'react';
import { collection, getDocs, deleteDoc, doc, addDoc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { useTema } from '../ThemeContext';
import MenuADM from '../components/MenuADM';

function copiar(texto, label) {
  if (!texto || texto === 'null' || texto === 'undefined') {
    alert('Nada para copiar');
    return;
  }
  navigator.clipboard.writeText(texto).then(() => alert(`${label} copiado!`));
}

function tratarCampo(valor) {
  if (valor === null || valor === undefined || valor === 'null' || valor === 'undefined') {
    return '';
  }
  return String(valor);
}

export default function Clientes({ onLogout, onStats, onRota, onImportarIfood }) {
  const [clientes, setClientes] = useState([]);
  const [busca, setBusca] = useState('');
  const [form, setForm] = useState(null);
  const [filtroEspera, setFiltroEspera] = useState(false);
  const { temaEscuro, alternarTema } = useTema();

  async function carregar() {
    const snap = await getDocs(collection(db, 'clientes'));
    const lista = snap.docs.map(d => {
      const data = d.data();
      return {
        id: d.id,
        nome: tratarCampo(data.nome),
        telefone: tratarCampo(data.telefone),
        endereco: tratarCampo(data.endereco),
        apt: tratarCampo(data.apt),
        codigoEntrega: tratarCampo(data.codigoEntrega),
        qtdPedidos: data.qtdPedidos || 0,
        observacoes: tratarCampo(data.observacoes),
        fixado: data.fixado === true ? true : false,
        aguardandoProduto: data.aguardandoProduto || '',
      };
    });
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
      await carregar();
    }
  }

  async function salvar(dados) {
    const dadosParaSalvar = {
      nome: tratarCampo(dados.nome),
      telefone: tratarCampo(dados.telefone),
      endereco: tratarCampo(dados.endereco),
      apt: tratarCampo(dados.apt),
      codigoEntrega: tratarCampo(dados.codigoEntrega),
      qtdPedidos: Number(dados.qtdPedidos) || 0,
      observacoes: tratarCampo(dados.observacoes),
      fixado: dados.fixado === true ? true : false,
      aguardandoProduto: dados.aguardandoProduto || '',
    };

    if (dados.id) {
      await updateDoc(doc(db, 'clientes', dados.id), dadosParaSalvar);
    } else {
      await addDoc(collection(db, 'clientes'), dadosParaSalvar);
    }
    setForm(null);
    await carregar();
  }

  async function toggleFixado(id, fixadoAtual) {
    const novoFixado = !fixadoAtual;
    await updateDoc(doc(db, 'clientes', id), { fixado: novoFixado });
    await carregar();
  }

  async function limparEspera(id) {
    await updateDoc(doc(db, 'clientes', id), { aguardandoProduto: '' });
    await carregar();
  }

  let listaFiltrada = clientes;
  
  if (busca.trim() !== '') {
    listaFiltrada = clientes.filter(c =>
      c.nome?.toLowerCase().includes(busca.toLowerCase()) ||
      c.telefone?.includes(busca) ||
      c.codigoEntrega?.includes(busca)
    );
  }
  
  if (filtroEspera) {
    listaFiltrada = listaFiltrada.filter(c => c.aguardandoProduto && c.aguardandoProduto !== '');
  }

  if (form !== null) {
    return <FormCliente cliente={form} onSalvar={salvar} onCancelar={() => setForm(null)} />;
  }

  const cores = temaEscuro ? coresEscuro : coresClaro;

  return (
    <div style={{ ...styles.container, backgroundColor: cores.fundo }}>
      <div style={styles.header}>
        <h1 style={{ ...styles.titulo, color: cores.destaque }}>🌾 Clientes</h1>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          <button style={{ ...styles.botaoAdd, backgroundColor: cores.destaque, color: cores.fundo }} onClick={() => setForm({ fixado: false, qtdPedidos: 0 })}>+ Novo</button>
          <button style={{ ...styles.botaoEstatisticas, backgroundColor: cores.estats, color: '#fff' }} onClick={onStats}>📊 Stats</button>
          <button 
            onClick={() => setFiltroEspera(!filtroEspera)} 
            style={{ ...styles.botaoEspera, backgroundColor: filtroEspera ? '#e67e22' : cores.card, color: filtroEspera ? '#fff' : cores.texto }}
          >
            ⏳ Lista de Espera
          </button>
          <MenuADM onLogout={onLogout} temaEscuro={temaEscuro} alternarTema={alternarTema} onRota={onRota} onImportarIfood={onImportarIfood} />
        </div>
      </div>
      <input style={{ ...styles.busca, backgroundColor: cores.card, color: cores.texto, borderColor: cores.borda }} placeholder="Buscar por nome, telefone ou código..." value={busca} onChange={e => setBusca(e.target.value)} />
      
      {listaFiltrada.map(c => (
        <div key={c.id} style={{ ...styles.card, backgroundColor: cores.card, borderColor: cores.borda }}>
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4, flexWrap: 'wrap' }}>
              <p style={{ ...styles.nome, color: cores.destaque }}>{c.nome || 'Sem nome'}</p>
              <button onClick={() => toggleFixado(c.id, c.fixado)} style={c.fixado ? { ...styles.botaoFixadoAtivo, backgroundColor: cores.destaque, color: cores.fundo } : { ...styles.botaoFixar, backgroundColor: cores.botaoFixar, color: cores.textoSecundario }}>
                {c.fixado ? '⭐ FIXADO' : '☆ FIXAR'}
              </button>
              {c.aguardandoProduto && (
                <button onClick={() => limparEspera(c.id)} style={{ ...styles.botaoEsperaPequeno, backgroundColor: '#e67e22', color: '#fff' }}>
                  ⏳ {c.aguardandoProduto}
                </button>
              )}
            </div>
            <p style={{ ...styles.info, color: cores.textoSecundario }}>📞 <span style={styles.copiavel} onClick={() => copiar(c.telefone, 'Telefone')}>{c.telefone || '---'}</span></p>
            <p style={{ ...styles.info, color: cores.textoSecundario }}>📍 {c.endereco || '---'}{c.apt ? `, Apt ${c.apt}` : ''}</p>
            <p style={{ ...styles.info, color: cores.textoSecundario }}>🔑 <span style={styles.copiavel} onClick={() => copiar(c.codigoEntrega, 'Código')}>{c.codigoEntrega || '---'}</span> | 🛒 Pedidos: {c.qtdPedidos || 0}</p>
            {c.observacoes && <p style={{ ...styles.info, color: cores.textoSecundario }}>📝 {c.observacoes}</p>}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <button style={{ ...styles.botaoEditar, backgroundColor: cores.botaoAcao }} onClick={() => setForm(c)}>✏️</button>
            <button style={{ ...styles.botaoDeletar, backgroundColor: cores.botaoAcao }} onClick={() => excluir(c.id)}>🗑️</button>
          </div>
        </div>
      ))}
      {listaFiltrada.length === 0 && <p style={{ ...styles.vazio, color: cores.textoSecundario }}>Nenhum cliente encontrado.</p>}
    </div>
  );
}

function FormCliente({ cliente, onSalvar, onCancelar }) {
  const { temaEscuro } = useTema();
  const cores = temaEscuro ? coresEscuro : coresClaro;

  const [dados, setDados] = useState({
    nome: cliente.nome || '',
    telefone: cliente.telefone || '',
    endereco: cliente.endereco || '',
    apt: cliente.apt || '',
    codigoEntrega: cliente.codigoEntrega || '',
    qtdPedidos: cliente.qtdPedidos || 0,
    observacoes: cliente.observacoes || '',
    fixado: cliente.fixado === true ? true : false,
    aguardandoProduto: cliente.aguardandoProduto || '',
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
    <div style={{ ...styles.container, backgroundColor: cores.fundo, minHeight: '100vh' }}>
      <h2 style={{ ...styles.titulo, color: cores.destaque }}>{dados.id ? '✏️ Editar Cliente' : '➕ Novo Cliente'}</h2>
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 12, maxWidth: 500 }}>
        <div>
          <label style={{ color: cores.textoSecundario, fontSize: 13 }}>Nome *</label>
          <input style={{ ...styles.input, backgroundColor: cores.card, color: cores.texto, borderColor: cores.borda }} name="nome" type="text" value={dados.nome} onChange={handleChange} />
        </div>
        <div>
          <label style={{ color: cores.textoSecundario, fontSize: 13 }}>Telefone</label>
          <input style={{ ...styles.input, backgroundColor: cores.card, color: cores.texto, borderColor: cores.borda }} name="telefone" type="tel" value={dados.telefone} onChange={handleChange} />
        </div>
        <div>
          <label style={{ color: cores.textoSecundario, fontSize: 13 }}>Endereço</label>
          <input style={{ ...styles.input, backgroundColor: cores.card, color: cores.texto, borderColor: cores.borda }} name="endereco" type="text" value={dados.endereco} onChange={handleChange} />
        </div>
        <div>
          <label style={{ color: cores.textoSecundario, fontSize: 13 }}>Apartamento</label>
          <input style={{ ...styles.input, backgroundColor: cores.card, color: cores.texto, borderColor: cores.borda }} name="apt" type="text" value={dados.apt} onChange={handleChange} />
        </div>
        <div>
          <label style={{ color: cores.textoSecundario, fontSize: 13 }}>Código de Entrega</label>
          <input style={{ ...styles.input, backgroundColor: cores.card, color: cores.texto, borderColor: cores.borda }} name="codigoEntrega" type="text" value={dados.codigoEntrega} onChange={handleChange} />
        </div>
        <div>
          <label style={{ color: cores.textoSecundario, fontSize: 13 }}>Qtd. Pedidos</label>
          <input style={{ ...styles.input, backgroundColor: cores.card, color: cores.texto, borderColor: cores.borda }} name="qtdPedidos" type="number" value={dados.qtdPedidos} onChange={handleChange} />
        </div>
        <div>
          <label style={{ color: cores.textoSecundario, fontSize: 13 }}>Lista de Espera</label>
          <input style={{ ...styles.input, backgroundColor: cores.card, color: cores.texto, borderColor: cores.borda }} name="aguardandoProduto" type="text" placeholder="Ex: Arroz 5kg, Feijão, Óleo..." value={dados.aguardandoProduto} onChange={handleChange} />
        </div>
        <div>
          <label style={{ color: cores.textoSecundario, fontSize: 13 }}>Observações</label>
          <textarea style={{ ...styles.input, backgroundColor: cores.card, color: cores.texto, borderColor: cores.borda, height: 80 }} name="observacoes" value={dados.observacoes} onChange={handleChange} />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <label style={{ color: cores.textoSecundario, fontSize: 13 }}>Fixar no topo:</label>
          <label style={{ color: cores.destaque, display: 'flex', alignItems: 'center', gap: 6 }}>
            <input type="checkbox" name="fixado" checked={dados.fixado} onChange={handleChange} />
            {dados.fixado ? '⭐ Cliente fixado' : '☆ Cliente normal'}
          </label>
        </div>
        <button style={{ ...styles.botaoAdd, backgroundColor: cores.destaque, color: cores.fundo }} type="submit">💾 Salvar</button>
        <button style={{ ...styles.botaoLogout, backgroundColor: cores.sair }} type="button" onClick={onCancelar}>Cancelar</button>
      </form>
    </div>
  );
}

const coresEscuro = {
  fundo: '#1a1a2e',
  card: '#16213e',
  texto: '#fff',
  textoSecundario: '#aaa',
  borda: '#333',
  destaque: '#e2b96f',
  sair: '#c0392b',
  estats: '#2980b9',
  botaoFixar: '#2a2a4a',
  botaoAcao: '#2a2a4a'
};

const coresClaro = {
  fundo: '#f0f0f0',
  card: '#ffffff',
  texto: '#333333',
  textoSecundario: '#666666',
  borda: '#dddddd',
  destaque: '#e2b96f',
  sair: '#c0392b',
  estats: '#2980b9',
  botaoFixar: '#e0e0e0',
  botaoAcao: '#e0e0e0'
};

const styles = {
  container: { minHeight: '100vh', padding: 16 },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, paddingTop: 20, flexWrap: 'wrap', gap: 10 },
  titulo: { fontSize: 24, margin: 0 },
  busca: { width: '100%', border: '1px solid', borderRadius: 10, padding: 12, marginBottom: 12, boxSizing: 'border-box' },
  card: { borderRadius: 12, padding: 14, marginBottom: 10, display: 'flex', border: '1px solid' },
  nome: { fontWeight: 'bold', fontSize: 16, margin: 0 },
  info: { fontSize: 13, margin: '0 0 2px' },
  copiavel: { textDecoration: 'underline', cursor: 'pointer' },
  input: { width: '100%', border: '1px solid', borderRadius: 10, padding: 12, fontSize: 15, boxSizing: 'border-box' },
  botaoAdd: { border: 'none', borderRadius: 8, padding: '8px 16px', fontWeight: 'bold', cursor: 'pointer' },
  botaoLogout: { border: 'none', borderRadius: 8, padding: '8px 16px', fontWeight: 'bold', cursor: 'pointer', color: '#fff' },
  botaoEditar: { border: 'none', fontSize: 18, cursor: 'pointer', padding: '8px 12px', borderRadius: 8, minWidth: 44, minHeight: 44 },
  botaoDeletar: { border: 'none', fontSize: 18, cursor: 'pointer', padding: '8px 12px', borderRadius: 8, minWidth: 44, minHeight: 44 },
  botaoFixar: { border: 'none', fontSize: 14, fontWeight: 'bold', cursor: 'pointer', padding: '8px 16px', borderRadius: 20, minWidth: 100, minHeight: 44, display: 'flex', alignItems: 'center', justifyContent: 'center' },
  botaoFixadoAtivo: { border: 'none', fontSize: 14, fontWeight: 'bold', cursor: 'pointer', padding: '8px 16px', borderRadius: 20, minWidth: 100, minHeight: 44, display: 'flex', alignItems: 'center', justifyContent: 'center' },
  botaoEstatisticas: { border: 'none', borderRadius: 8, padding: '8px 16px', fontWeight: 'bold', cursor: 'pointer', color: '#fff' },
  botaoEspera: { border: 'none', borderRadius: 8, padding: '8px 16px', fontWeight: 'bold', cursor: 'pointer' },
  botaoEsperaPequeno: { border: 'none', borderRadius: 20, padding: '4px 12px', fontSize: 12, fontWeight: 'bold', cursor: 'pointer', marginLeft: 8 },
  vazio: { textAlign: 'center', marginTop: 40 },
};
