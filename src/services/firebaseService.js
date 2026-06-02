import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc, onSnapshot, query, where, orderBy, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../firebase';

// NOTIFICAÇÕES
export const criarNotificacao = async (titulo, mensagem, tipo, destinatario) => {
  const notificacao = {
    titulo,
    mensagem,
    tipo,
    destinatario,
    lida: false,
    criadaEm: new Date().toISOString()
  };
  await addDoc(collection(db, 'notificacoes'), notificacao);
};

export const getNotificacoesRealtime = (callback, destinatario) => {
  const q = query(collection(db, 'notificacoes'), where('destinatario', '==', destinatario), orderBy('criadaEm', 'desc'));
  return onSnapshot(q, (snap) => {
    const lista = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    callback(lista);
  });
};

export const marcarNotificacaoLida = async (id) => {
  await updateDoc(doc(db, 'notificacoes', id), { lida: true });
};

// CLIENTES
export const getClientesRealtime = (callback) => {
  return onSnapshot(collection(db, 'clientes'), (snap) => {
    const lista = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    callback(lista);
  });
};

export const salvarCliente = async (cliente) => {
  if (cliente.id) {
    const { id, ...dados } = cliente;
    await updateDoc(doc(db, 'clientes', id), dados);
    return { id, ...dados };
  } else {
    const docRef = await addDoc(collection(db, 'clientes'), cliente);
    return { id: docRef.id, ...cliente };
  }
};

export const excluirCliente = async (id) => {
  await deleteDoc(doc(db, 'clientes', id));
};

// ROTAS
export const getRotasRealtime = (callback) => {
  return onSnapshot(collection(db, 'rotas'), (snap) => {
    const lista = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    callback(lista);
  });
};

export const iniciarRota = async (cliente, entregador) => {
  const rota = {
    clienteId: cliente.id,
    clienteNome: cliente.nome,
    clienteEndereco: cliente.endereco,
    clienteTelefone: cliente.telefone,
    clienteApt: cliente.apt || '',
    codigoEntrega: cliente.codigoEntrega,
    entregador: entregador,
    status: 'em_andamento',
    iniciadoEm: new Date().toISOString(),
    ordem: []
  };
  const docRef = await addDoc(collection(db, 'rotas'), rota);
  return { id: docRef.id, ...rota };
};

export const concluirRota = async (rotaId) => {
  await updateDoc(doc(db, 'rotas', rotaId), {
    status: 'concluida',
    concluidoEm: new Date().toISOString()
  });
};

export const excluirRota = async (rotaId) => {
  await deleteDoc(doc(db, 'rotas', rotaId));
};

// CONFIGURAÇÕES
export const getConfiguracoes = async () => {
  const docRef = doc(db, 'configuracoes', 'geral');
  const docSnap = await getDoc(docRef);
  if (docSnap.exists()) {
    return docSnap.data();
  }
  return { assinaturaOpcional: false };
};

export const salvarConfiguracoes = async (config) => {
  await setDoc(doc(db, 'configuracoes', 'geral'), config);
};
