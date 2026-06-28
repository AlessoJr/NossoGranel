import React, { useEffect, useState } from 'react';
import { collection, query, where, orderBy, onSnapshot, updateDoc, doc, or } from 'firebase/firestore';
import { db } from '../firebase';
import { useTheme, getTheme } from '../contexts/ThemeContext';

export default function Notificacoes({ usuario, onVoltar }) {
  const { darkMode } = useTheme();
  const cores = getTheme(darkMode);
  const [notificacoes, setNotificacoes] = useState([]);

  const destinatario = usuario?.tipo === 'admin' ? 'admin' : usuario?.nome;

  useEffect(() => {
    if (!destinatario) return;

    const q = usuario?.tipo === 'admin'
      ? query(
          collection(db, 'notificacoes'),
          where('destinatario', '==', 'admin'),
          orderBy('criadaEm', 'desc')
        )
      : query(
          collection(db, 'notificacoes'),
          or(
            where('destinatario', '==', destinatario),
            where('destinatario', '==', 'todos_entregadores')
          ),
          orderBy('criadaEm', 'desc')
        );

    const unsub = onSnapshot(q, (snap) => {
      setNotificacoes(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    return () => unsub();
  }, [destinatario, usuario?.tipo]);

  const marcarLida = async (id) => {
    await updateDoc(doc(db, 'notificacoes', id), { lida: true });
  };

  const naoLidas = notificacoes.filter(n => !n.lida).length;

  return (
    <div style={{ ...styles.container, backgroundColor: cores.background, minHeight: '100vh' }}>
      <div style={styles.header}>
        <h1 style={{ ...styles.titulo, color: cores.primary }}>
          🔔 Notificações {naoLidas > 0 && <span style={{ fontSize: 14, color: cores.danger }}>({naoLidas} novas)</span>}
        </h1>
        <button style={{ ...styles.botaoVoltar, backgroundColor: cores.card, color: cores.text }} onClick={onVoltar}>← Voltar</button>
      </div>

      {notificacoes.length === 0 ? (
        <p style={{ color: cores.textSecondary, textAlign: 'center', marginTop: 40 }}>Nenhuma notificação ainda.</p>
      ) : (
        notificacoes.map(n => (
          <div key={n.id} style={{ ...styles.card, backgroundColor: cores.card, borderColor: n.lida ? cores.cardBorder : cores.primary }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div style={{ flex: 1 }}>
                <p style={{ color: cores.text, fontWeight: 'bold', margin: '0 0 4px' }}>{n.titulo}</p>
                <p style={{ color: cores.textSecondary, margin: '0 0 4px' }}>{n.mensagem}</p>
                <p style={{ color: cores.textSecondary, fontSize: 11, margin: 0 }}>{new Date(n.criadaEm).toLocaleString('pt-BR')}</p>
              </div>
              {!n.lida && (
                <button style={{ ...styles.botaoLer, backgroundColor: cores.primary, color: cores.background }} onClick={() => marcarLida(n.id)}>✓ Lida</button>
              )}
            </div>
          </div>
        ))
      )}
    </div>
  );
}

const styles = {
  container: { padding: 16 },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, flexWrap: 'wrap', gap: 10 },
  titulo: { fontSize: 22, margin: 0 },
  botaoVoltar: { border: 'none', borderRadius: 8, padding: '8px 16px', fontWeight: 'bold', cursor: 'pointer' },
  card: { borderRadius: 12, padding: 14, marginBottom: 10, border: '1px solid' },
  botaoLer: { border: 'none', borderRadius: 8, padding: '6px 12px', fontWeight: 'bold', cursor: 'pointer', fontSize: 12, whiteSpace: 'nowrap' }
};
