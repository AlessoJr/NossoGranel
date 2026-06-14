import React, { useState, useEffect, useRef } from 'react';
import { useTheme, getTheme } from '../contexts/ThemeContext';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { auth, db, storage } from '../firebase';
import { collection, onSnapshot, doc, deleteDoc, setDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { toast } from 'react-toastify';

export default function CadastroEntregador({ onVoltar }) {
  const { darkMode } = useTheme();
  const cores = getTheme(darkMode);
  const [entregadores, setEntregadores] = useState([]);
  const [form, setForm] = useState({ nome: '', email: '', telefone: '', senha: '' });
  const [foto, setFoto] = useState(null);
  const [fotoPreview, setFotoPreview] = useState(null);
  const [carregando, setCarregando] = useState(false);
  const [mostrarForm, setMostrarForm] = useState(false);
  const inputFotoRef = useRef(null);

  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'usuarios'), snap => {
      const lista = snap.docs
        .map(d => ({ id: d.id, ...d.data() }))
        .filter(u => u.tipo === 'entregador');
      setEntregadores(lista);
    });
    return () => unsub();
  }, []);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleFoto = (e) => {
    const arquivo = e.target.files[0];
    if (!arquivo) return;
    if (arquivo.size > 5 * 1024 * 1024) { toast.error('Foto muito grande! Máximo 5MB'); return; }
    setFoto(arquivo);
    setFotoPreview(URL.createObjectURL(arquivo));
  };

  const handleCadastrar = async (e) => {
    e.preventDefault();
    if (!form.nome.trim()) { toast.error('Nome é obrigatório'); return; }
    if (!form.email.trim()) { toast.error('Email é obrigatório'); return; }
    if (form.senha.length < 6) { toast.error('Senha mínima de 6 caracteres'); return; }

    setCarregando(true);
    try {
      const result = await createUserWithEmailAndPassword(auth, form.email, form.senha);
      
      let fotoURL = null;
      if (foto) {
        const fotoRef = ref(storage, `perfis/${result.user.uid}`);
        await uploadBytes(fotoRef, foto);
        fotoURL = await getDownloadURL(fotoRef);
      }

      await setDoc(doc(db, 'usuarios', result.user.uid), {
        nome: form.nome,
        email: form.email,
        telefone: form.telefone,
        tipo: 'entregador',
        fotoURL: fotoURL || null,
        criadoEm: new Date().toISOString()
      });

      toast.success(`Entregador ${form.nome} cadastrado!`);
      setForm({ nome: '', email: '', telefone: '', senha: '' });
      setFoto(null);
      setFotoPreview(null);
      setMostrarForm(false);
    } catch (error) {
      if (error.code === 'auth/email-already-in-use') toast.error('Email já cadastrado');
      else toast.error('Erro ao cadastrar: ' + error.message);
    } finally {
      setCarregando(false);
    }
  };

  const handleExcluir = async (entregador) => {
    if (!window.confirm(`Excluir entregador ${entregador.nome}?`)) return;
    try {
      await deleteDoc(doc(db, 'usuarios', entregador.id));
      toast.success(`${entregador.nome} removido!`);
    } catch (error) {
      toast.error('Erro ao excluir');
    }
  };

  return (
    <div style={{ ...styles.container, backgroundColor: cores.background, minHeight: '100vh' }}>
      <div style={styles.header}>
        <h1 style={{ ...styles.titulo, color: cores.primary }}>👤 Entregadores</h1>
        <button style={{ ...styles.botaoVoltar, backgroundColor: cores.card, color: cores.text }} onClick={onVoltar}>← Voltar</button>
      </div>

      <button style={{ ...styles.botaoNovo, backgroundColor: cores.primary, color: cores.background }} onClick={() => setMostrarForm(!mostrarForm)}>
        {mostrarForm ? '✕ Cancelar' : '➕ Novo Entregador'}
      </button>

      {mostrarForm && (
        <div style={{ ...styles.card, backgroundColor: cores.card, borderColor: cores.cardBorder }}>
          <h3 style={{ color: cores.primary, marginBottom: 12 }}>➕ Cadastrar Entregador</h3>
          
          {/* Foto */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: 16 }}>
            <div style={{ width: 90, height: 90, borderRadius: '50%', backgroundColor: cores.cardBorder, overflow: 'hidden', marginBottom: 8, border: `2px solid ${cores.primary}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              onClick={() => inputFotoRef.current?.click()}>
              {fotoPreview
                ? <img src={fotoPreview} alt="preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                : <span style={{ fontSize: 36 }}>👤</span>
              }
            </div>
            <button type="button" style={{ backgroundColor: cores.cardBorder, color: cores.text, border: 'none', borderRadius: 8, padding: '6px 12px', fontSize: 12, cursor: 'pointer' }}
              onClick={() => inputFotoRef.current?.click()}>
              📷 {fotoPreview ? 'Trocar foto' : 'Adicionar foto'}
            </button>
            <input ref={inputFotoRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleFoto} />
          </div>

          <form onSubmit={handleCadastrar} style={styles.form}>
            <input style={{ ...styles.input, backgroundColor: cores.background, color: cores.text, borderColor: cores.cardBorder }} name="nome" placeholder="Nome completo *" value={form.nome} onChange={handleChange} />
            <input style={{ ...styles.input, backgroundColor: cores.background, color: cores.text, borderColor: cores.cardBorder }} name="email" type="email" placeholder="Email *" value={form.email} onChange={handleChange} />
            <input style={{ ...styles.input, backgroundColor: cores.background, color: cores.text, borderColor: cores.cardBorder }} name="telefone" placeholder="Telefone" value={form.telefone} onChange={handleChange} />
            <input style={{ ...styles.input, backgroundColor: cores.background, color: cores.text, borderColor: cores.cardBorder }} name="senha" type="password" placeholder="Senha (mín. 6 caracteres) *" value={form.senha} onChange={handleChange} />
            <button style={{ ...styles.botaoSalvar, backgroundColor: cores.primary, color: cores.background, opacity: carregando ? 0.7 : 1 }} type="submit" disabled={carregando}>
              {carregando ? 'Cadastrando...' : '💾 Cadastrar'}
            </button>
          </form>
        </div>
      )}

      <h3 style={{ color: cores.primary, marginTop: 20 }}>👥 Entregadores ({entregadores.length})</h3>
      {entregadores.length === 0 && <p style={{ color: cores.textSecondary, textAlign: 'center', marginTop: 20 }}>Nenhum entregador cadastrado.</p>}
      {entregadores.map(e => (
        <div key={e.id} style={{ ...styles.card, backgroundColor: cores.card, borderColor: cores.cardBorder, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 50, height: 50, borderRadius: '50%', backgroundColor: cores.cardBorder, overflow: 'hidden', border: `2px solid ${cores.primary}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              {e.fotoURL
                ? <img src={e.fotoURL} alt={e.nome} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                : <span style={{ fontSize: 24 }}>👤</span>
              }
            </div>
            <div>
              <p style={{ color: cores.primary, fontWeight: 'bold', margin: '0 0 4px' }}>{e.nome}</p>
              <p style={{ color: cores.text, fontSize: 13, margin: '0 0 2px' }}>📧 {e.email}</p>
              {e.telefone && <p style={{ color: cores.text, fontSize: 13, margin: 0 }}>📞 {e.telefone}</p>}
            </div>
          </div>
          <button style={{ ...styles.botaoDeletar, backgroundColor: cores.danger }} onClick={() => handleExcluir(e)}>🗑️</button>
        </div>
      ))}
    </div>
  );
}

const styles = {
  container: { padding: 16 },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  titulo: { fontSize: 24, margin: 0 },
  botaoVoltar: { border: 'none', borderRadius: 8, padding: '8px 16px', fontWeight: 'bold', cursor: 'pointer' },
  botaoNovo: { border: 'none', borderRadius: 8, padding: '10px 16px', fontWeight: 'bold', cursor: 'pointer', marginBottom: 16 },
  card: { borderRadius: 12, padding: 16, marginBottom: 10, border: '1px solid' },
  form: { display: 'flex', flexDirection: 'column', gap: 12 },
  input: { border: '1px solid', borderRadius: 10, padding: 12, fontSize: 15 },
  botaoSalvar: { border: 'none', borderRadius: 8, padding: '12px 16px', fontWeight: 'bold', cursor: 'pointer' },
  botaoDeletar: { color: '#fff', border: 'none', borderRadius: 8, padding: '8px 12px', cursor: 'pointer', fontSize: 18 }
};
