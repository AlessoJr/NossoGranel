import React, { useEffect, useState } from 'react';
import { collection, getDocs, addDoc, updateDoc, doc, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';

export default function EntregadorHome({ usuario, onLogout }) {
  const [clientes, setClientes] = useState([]);
  const [busca, setBusca] = useState('');
  const [emRota, setEmRota] = useState(null);

  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'clientes'), snap => {
      setClientes(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    return unsub;
  }, []);

  async function iniciarRota(cliente) {
    const rota = {
      clienteId: cliente.id,
      clienteNome: cliente.nome,
      codigoEntrega: cliente.codigoEntrega,
      entregador: usuario.nome,
      status: 'em_rota',
      iniciadoEm: new Date().toISOString(),
    };
    const ref = await addDoc(collection(db, 'rotas'), rota);
    setEmRota({ ...rota, rotaId: ref.id, cliente });
  }

  async function concluirRota() {
    await updateDoc(doc(db, 'rotas', emRota.rotaId), {
      status: 'concluida',
      concluidoEm: new Date().toISOString(),
    });
    setEmRota(null);
  }

  const filtrados = clientes.filter(c =>
    c.nome?.toLowerCase().includes(busca.toLowerCase()) ||
    c.codigoEntrega?.includes(busca)
  );

  if (emRota) return (
    <div style={styles.container}>
      <h2 style={styles.titulo}>🚚 Em Rota</h2>
      <div style={styles.card}>
        <p style={styles.nome}>{emRota.clienteNome}</p>
        <p style={styles.info}>📍 {emRota.cliente.endereco}{emRota.cliente.apt ? `, Apt ${emRota.cliente.apt}` : ''}</p>
        <p style={styles.info}>📞 {emRota.cliente.telefone}</p>
        <p style={styles.info}>🔑 Código: <strong style={{ color: '#e2b96f' }}>{emRota.codigoEntrega}</strong></p>
      </div>
      <button style={styles.botaoConcluir} onClick={concluirRota}>✅ Concluir Entrega</button>
      <button style={styles.botaoLogout} onClick={() => setEmRota(null)}>← Voltar</button>
    </div>
  );

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h1 style={styles.titulo}>🚚 {usuario.nome}</h1>
        <button style={styles.botaoLogout} onClick={onLogout}>Sair</button>
      </div>
      <input style={styles.busca} placeholder="Buscar cliente ou código..." value={busca} onChange={e => setBusca(e.target.value)} />
      {filtrados.map(c => (
        <div key={c.id} style={styles.card}>
          <div style={{ flex: 1 }}>
            <p style={styles.nome}>{c.nome}</p>
            <p style={styles.info}>📍 {c.endereco}{c.apt ? `, Apt ${c.apt}` : ''}</p>
            <p style={styles.info}>📞 {c.telefone}</p>
          </div>
          <button style={styles.botaoRota} onClick={() => iniciarRota(c)}>🚚 Iniciar</button>
        </div>
      ))}
      {filtrados.length === 0 && <p style={styles.vazio}>Nenhum cliente encontrado.</p>}
    </div>
  );
}

const styles = {
  container: { minHeight: '100vh', backgroundColor: '#1a1a2e', padding: 16 },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, paddingTop: 20 },
  titulo: { color: '#e2b96f', fontSize: 24, margin: 0 },
  busca: { width: '100%', backgroundColor: '#16213e', color: '#fff', border: '1px solid #333', borderRadius: 10, padding: 12, marginBottom: 12, boxSizing: 'border-box' },
  card: { backgroundColor: '#16213e', borderRadius: 12, padding: 14, marginBottom: 10, display: 'flex', alignItems: 'center', border: '1px solid #2a2a4a' },
  nome: { color: '#e2b96f', fontWeight: 'bold', fontSize: 16, margin: '0 0 4px' },
  info: { color: '#ccc', fontSize: 13, margin: '0 0 2px' },
  botaoRota: { backgroundColor: '#e2b96f', color: '#1a1a2e', border: 'none', borderRadius: 8, padding: '8px 12px', fontWeight: 'bold', cursor: 'pointer' },
  botaoConcluir: { width: '100%', backgroundColor: '#27ae60', color: '#fff', border: 'none', borderRadius: 10, padding: 16, fontSize: 16, fontWeight: 'bold', cursor: 'pointer', marginTop: 20 },
  botaoLogout: { backgroundColor: '#c0392b', color: '#fff', border: 'none', borderRadius: 8, padding: '8px 16px', cursor: 'pointer', marginTop: 10, width: '100%' },
  vazio: { color: '#888', textAlign: 'center', marginTop: 40 },
};
