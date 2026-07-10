import { collection, addDoc, updateDoc, deleteDoc, doc, onSnapshot, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../firebase';

// CLIENTES
export const getClientesRealtime = (callback) => {
  return onSnapshot(collection(db, 'clientes'), (snap) => {
    callback(snap.docs.map(d => { const data = d.data(); delete data.id; return { id: d.id, ...data }; }));
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

// EXCLUSÃO SIMPLES – sem nenhuma lógica extra
export const excluirCliente = async (id) => {
  if (!id) throw new Error('ID do cliente é obrigatório');
  await deleteDoc(doc(db, 'clientes', id));
};

// ROTAS
export const getRotasRealtime = (callback) => {
  return onSnapshot(collection(db, 'rotas'), (snap) => {
    callback(snap.docs.map(d => { const data = d.data(); delete data.id; return { id: d.id, ...data }; }));
  });
};

export const criarRota = async (cliente, entregador, criadoPor) => {
  const rota = {
    clienteId: cliente.id,
    clienteNome: cliente.nome || '',
    clienteEndereco: cliente.endereco || '',
    clienteTelefone: cliente.telefone || '',
    clienteApt: cliente.apt || '',
    codigoEntrega: cliente.codigoEntrega || '',
    entregador,
    status: 'em_andamento',
    criadoPor,
    iniciadoEm: new Date().toISOString()
  };
  const docRef = await addDoc(collection(db, 'rotas'), rota);
  return { id: docRef.id, ...rota };
};

export const concluirRota = async (rotaId) => {
  const rotaRef = doc(db, 'rotas', rotaId);
  const rotaSnap = await getDoc(rotaRef);
  await updateDoc(rotaRef, {
    status: 'concluida',
    concluidoEm: new Date().toISOString()
  });
  if (rotaSnap.exists()) {
    const clienteId = rotaSnap.data().clienteId;
    if (clienteId) {
      const clienteRef = doc(db, 'clientes', clienteId);
      const clienteSnap = await getDoc(clienteRef);
      if (clienteSnap.exists()) {
        const atual = clienteSnap.data().qtdPedidos || 0;
        await updateDoc(clienteRef, { qtdPedidos: atual + 1 });
      }
    }
  }
};

export const excluirRota = async (rotaId) => {
  if (!rotaId) throw new Error('ID da rota é obrigatório');
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
    callback(snap.docs.map(d => { const data = d.data(); delete data.id; return { id: d.id, ...data }; }));
  });
};

// ENTREGADORES
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

// AUTENTICAÇÃO
import { signInWithEmailAndPassword, signOut, createUserWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../firebase';

export const loginComEmail = async (email, senha) => {
  const result = await signInWithEmailAndPassword(auth, email, senha);
  return result.user;
};

export const logoutFirebase = async () => {
  await signOut(auth);
};

export const criarUsuario = async (email, senha) => {
  const result = await createUserWithEmailAndPassword(auth, email, senha);
  return result.user;
};

// NOTIFICAÇÕES
export const criarNotificacao = async (titulo, mensagem, tipo, destinatario) => {
  try {
    await addDoc(collection(db, 'notificacoes'), {
      titulo,
      mensagem,
      tipo,
      destinatario,
      lida: false,
      criadaEm: new Date().toISOString()
    });
  } catch (error) {
    console.error('Erro ao criar notificacao:', error.code, error.message);
  }
};
