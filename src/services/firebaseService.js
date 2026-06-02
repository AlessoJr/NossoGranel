import { collection, addDoc, updateDoc, deleteDoc, doc, onSnapshot, query, where, orderBy, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../firebase';

// NOTIFICAÇÕES
export const criarNotificacao = async (titulo, mensagem, tipo, destinatario) => {
  await addDoc(collection(db, 'notificacoes'), {
    titulo, mensagem, tipo, destinatario,
    lida: false,
    criadaEm: new Date().toISOString()
  });
};

// CLIENTES
export const getClientesRealtime = (callback) => {
  return onSnapshot(collection(db, 'clientes'), (snap) => {
    callback(snap.docs.map(d => ({ id: d.id, ...d.data() })));
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
    callback(snap.docs.map(d => ({ id: d.id, ...d.data() })));
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
    iniciadoEm: new Date().toISOString()
  };
  const docRef = await addDoc(collection(db, 'rotas'), rota);
  return { id: docRef.id, ...rota };
};

export const concluirRota = async (rotaId, codigoEntrega) => {
  await updateDoc(doc(db, 'rotas', rotaId), {
    status: 'concluida',
    concluidoEm: new Date().toISOString(),
    codigoConfirmacao: codigoEntrega
  });
};

export const excluirRota = async (rotaId) => {
  await deleteDoc(doc(db, 'rotas', rotaId));
};

// LOCALIZAÇÕES
export const atualizarLocalizacao = async (entregador, lat, lng) => {
  const localizacaoRef = doc(db, 'localizacoes', entregador);
  await setDoc(localizacaoRef, {
    entregador,
    lat,
    lng,
    atualizadoEm: new Date().toISOString()
  });
};

export const getLocalizacoesRealtime = (callback) => {
  return onSnapshot(collection(db, 'localizacoes'), (snap) => {
    callback(snap.docs.map(d => ({ id: d.id, ...d.data() })));
  });
};

// ENTREGADORES
export const getEntregadores = (callback) => {
  // Busca entregadores únicos das rotas e da lista fixa
  const unsub = onSnapshot(collection(db, 'rotas'), (snap) => {
    const entregadoresSet = new Set();
    snap.docs.forEach(d => {
      const data = d.data();
      if (data.entregador) entregadoresSet.add(data.entregador);
    });
    callback(Array.from(entregadoresSet));
  });
  return unsub;
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
