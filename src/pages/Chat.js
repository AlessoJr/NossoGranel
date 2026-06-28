import React, { useEffect, useState, useRef } from 'react';
import { useTheme, getTheme } from '../contexts/ThemeContext';
import { collection, addDoc, onSnapshot, query, orderBy, where, or, and } from 'firebase/firestore';
import { db } from '../firebase';
import { criarNotificacao } from '../services/firebaseService';

export default function Chat({ usuario, onVoltar }) {
  const { darkMode } = useTheme();
  const cores = getTheme(darkMode);
  const [abaChat, setAbaChat] = useState('geral');
  const [mensagens, setMensagens] = useState([]);
  const [mensagensPrivadas, setMensagensPrivadas] = useState([]);
  const [texto, setTexto] = useState('');
  const [entregadorChat, setEntregadorChat] = useState(null);
  const [entregadores, setEntregadores] = useState([]);
  const fimRef = useRef(null);

  // Busca entregadores
  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'usuarios'), snap => {
      const lista = snap.docs
        .map(d => ({ id: d.id, ...d.data() }))
        .filter(u => u.tipo === 'entregador');
      setEntregadores(lista);
      if (lista.length > 0 && !entregadorChat) setEntregadorChat(lista[0]);
    });
    return () => unsub();
  }, []);

  // Chat geral
  useEffect(() => {
    const q = query(collection(db, 'chat_geral'), orderBy('criadoEm', 'asc'));
    const unsub = onSnapshot(q, snap => {
      setMensagens(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      setTimeout(() => fimRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
    });
    return () => unsub();
  }, []);

  // Chat privado com query otimizada usando or + and
  useEffect(() => {
    if (usuario.tipo === "admin" && !entregadorChat) return;
    const outroNome = usuario.tipo === "admin" ? entregadorChat?.nome : "Administrador";
    if (!outroNome) return;
    const q = query(
      collection(db, "chat_privado"),
      or(
        and(where("de", "==", usuario.nome), where("para", "==", outroNome)),
        and(where("de", "==", outroNome), where("para", "==", usuario.nome))
      ),
      orderBy("criadoEm", "asc")
    );
    const unsub = onSnapshot(q, snap => {
      setMensagensPrivadas(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      setTimeout(() => fimRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
    });
    return () => unsub();
  }, [entregadorChat, usuario.nome]);

  const enviar = async () => {
    if (!texto.trim()) return;
    const agora = new Date().toISOString();
    const textoEnviado = texto.trim();

    if (abaChat === 'geral') {
      await addDoc(collection(db, 'chat_geral'), {
        texto: textoEnviado,
        de: usuario.nome,
        tipo: usuario.tipo,
        criadoEm: agora
      });
      await criarNotificacao(
        '💬 Nova mensagem no grupo',
        `${usuario.nome}: ${textoEnviado}`,
        'chat_geral',
        usuario.tipo === 'admin' ? 'todos_entregadores' : 'admin'
      );
    } else {
      const para = usuario.tipo === 'admin' ? entregadorChat.nome : 'Administrador';
      await addDoc(collection(db, 'chat_privado'), {
        texto: textoEnviado,
        de: usuario.nome,
        para,
        tipo: usuario.tipo,
        criadoEm: agora
      });
      await criarNotificacao(
        '💬 Mensagem privada',
        `${usuario.nome}: ${textoEnviado}`,
        'chat_privado',
        para === 'Administrador' ? 'admin' : para
      );
    }
    setTexto('');
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); enviar(); }
  };

  const formatarHora = (iso) => {
    if (!iso) return '';
    const d = new Date(iso);
    return d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  };

  const formatarData = (iso) => {
    if (!iso) return '';
    const d = new Date(iso);
    return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
  };

  const msgExibidas = abaChat === 'geral' ? mensagens : mensagensPrivadas;

  const Mensagem = ({ m }) => {
    const minha = m.de === usuario.nome;
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: minha ? 'flex-end' : 'flex-start', marginBottom: 8 }}>
        {!minha && <span style={{ color: cores.primary, fontSize: 11, marginBottom: 2, fontWeight: 'bold' }}>{m.de}</span>}
        <div style={{
          backgroundColor: minha ? cores.primary : cores.card,
          color: minha ? cores.background : cores.text,
          borderRadius: minha ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
          padding: '8px 12px',
          maxWidth: '75%',
          border: minha ? 'none' : `1px solid ${cores.cardBorder}`
        }}>
          <p style={{ margin: 0, fontSize: 14 }}>{m.texto}</p>
        </div>
        <span style={{ color: cores.textSecondary, fontSize: 10, marginTop: 2 }}>
          {formatarData(m.criadoEm)} {formatarHora(m.criadoEm)}
        </span>
      </div>
    );
  };

  return (
    <div style={{ backgroundColor: cores.background, minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <div style={{ padding: '16px 16px 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1 style={{ color: cores.primary, fontSize: 22, margin: 0 }}>💬 Chat</h1>
        <button style={{ backgroundColor: cores.card, color: cores.text, border: 'none', borderRadius: 8, padding: '8px 16px', fontWeight: 'bold', cursor: 'pointer' }} onClick={onVoltar}>← Voltar</button>
      </div>

      {/* Abas */}
      <div style={{ display: 'flex', gap: 8, padding: '12px 16px' }}>
        <button style={{ flex: 1, border: 'none', borderRadius: 8, padding: '10px', fontWeight: 'bold', cursor: 'pointer', backgroundColor: abaChat === 'geral' ? cores.primary : cores.card, color: abaChat === 'geral' ? cores.background : cores.text }} onClick={() => setAbaChat('geral')}>
          👥 Geral
        </button>
        <button style={{ flex: 1, border: 'none', borderRadius: 8, padding: '10px', fontWeight: 'bold', cursor: 'pointer', backgroundColor: abaChat === 'privado' ? cores.primary : cores.card, color: abaChat === 'privado' ? cores.background : cores.text }} onClick={() => setAbaChat('privado')}>
          🔒 Privado
        </button>
      </div>

      {/* Seletor de entregador (privado + admin) */}
      {abaChat === 'privado' && usuario.tipo === 'admin' && entregadores.length > 0 && (
        <div style={{ padding: '0 16px 12px' }}>
          <select style={{ width: '100%', padding: 10, borderRadius: 8, border: `1px solid ${cores.cardBorder}`, backgroundColor: cores.card, color: cores.text, fontSize: 14 }}
            value={entregadorChat?.nome || ''} onChange={e => setEntregadorChat(entregadores.find(en => en.nome === e.target.value))}>
            {entregadores.map(e => <option key={e.id} value={e.nome}>{e.nome}</option>)}
          </select>
        </div>
      )}

      {abaChat === 'privado' && usuario.tipo === 'entregador' && (
        <div style={{ padding: '0 16px 12px' }}>
          <div style={{ backgroundColor: cores.card, borderRadius: 8, padding: 10, border: `1px solid ${cores.cardBorder}` }}>
            <p style={{ color: cores.text, margin: 0, fontSize: 13 }}>🔒 Conversa privada com <strong style={{ color: cores.primary }}>Administrador</strong></p>
          </div>
        </div>
      )}

      {/* Mensagens */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '0 16px', minHeight: 300 }}>
        {msgExibidas.length === 0 && (
          <p style={{ color: cores.textSecondary, textAlign: 'center', marginTop: 40 }}>
            {abaChat === 'geral' ? 'Nenhuma mensagem no grupo ainda.' : 'Nenhuma mensagem privada ainda.'}
          </p>
        )}
        {msgExibidas.map(m => <Mensagem key={`${m.id}-${m.criadoEm}`} m={m} />)}
        <div ref={fimRef} />
      </div>

      {/* Input */}
      <div style={{ padding: 16, display: 'flex', gap: 8, borderTop: `1px solid ${cores.cardBorder}`, backgroundColor: cores.background }}>
        <textarea
          style={{ flex: 1, backgroundColor: cores.card, color: cores.text, border: `1px solid ${cores.cardBorder}`, borderRadius: 10, padding: 10, fontSize: 14, resize: 'none', fontFamily: 'inherit' }}
          placeholder="Digite uma mensagem..."
          value={texto}
          onChange={e => setTexto(e.target.value)}
          onKeyPress={handleKeyPress}
          rows={1}
        />
        <button style={{ backgroundColor: cores.primary, color: cores.background, border: 'none', borderRadius: 10, padding: '10px 16px', fontWeight: 'bold', cursor: 'pointer', fontSize: 18 }} onClick={enviar}>
          ➤
        </button>
      </div>
    </div>
  );
}
