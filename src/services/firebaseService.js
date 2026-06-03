import { collection, addDoc, updateDoc, deleteDoc, doc, onSnapshot, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../firebase';

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

export const criarRota = async (cliente, entregador, criadoPor) => {
  const rota = {
    clienteId: cliente.id,
    clienteNome: cliente.nome,
    clienteEndereco: cliente.endereco,
    clienteTelefone: cliente.telefone,
    clienteApt: cliente.apt || '',
    codigoEntrega: cliente.codigoEntrega,
    entregador: entregador,
    status: 'em_andamento',
    criadoPor: criadoPor, // 'adm' ou 'entregador'
    iniciadoEm: new Date().toISOString()
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

// LOCALIZAÇÕES
export const atualizarLocalizacao = async (entregador, lat, lng) => {
  await setDoc(doc(db, 'localizacoes', entregador), {
    entregador, lat, lng,
    atualizadoEm: new Date().toISOString()
  });
};

export const getLocalizacoesRealtime = (callback) => {
  return onSnapshot(collection(db, 'localizacoes'), (snap) => {
    callback(snap.docs.map(d => ({ id: d.id, ...d.data() })));
  });
};

// ENTREGADORES (lista fixa - pode expandir)
export const getEntregadores = (callback) => {
  callback(['Entregador']);
};

// CONFIGURAÇÕES
export const getConfiguracoes = async () => {
  const docRef = doc(db, 'configuracoes', 'geral');
  const docSnap = await getDoc(docRef);
  return docSnap.exists() ? docSnap.data() : { assinaturaOpcional: false };
};

export const salvarConfiguracoes = async (config) => {
  await setDoc(doc(db, 'configuracoes', 'geral'), config);
};
