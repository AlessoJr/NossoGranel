import React, { useState } from 'react';
import { useTheme, getTheme } from '../contexts/ThemeContext';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../firebase';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase';

export default function Login({ onLogin }) {
  const { darkMode, toggleTheme } = useTheme();
  const cores = getTheme(darkMode);
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [erro, setErro] = useState('');
  const [carregando, setCarregando] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    setErro('');
    setCarregando(true);
    try {
      const result = await signInWithEmailAndPassword(auth, email, senha);
      const user = result.user;

      // Busca perfil no Firestore
      const perfilDoc = await getDoc(doc(db, 'usuarios', user.uid));
      if (perfilDoc.exists()) {
        const perfil = perfilDoc.data();
        onLogin({ uid: user.uid, email: user.email, nome: perfil.nome, tipo: perfil.tipo });
      } else {
        // Fallback por email
        const tipo = email.includes('admin') ? 'admin' : 'entregador';
        const nome = tipo === 'admin' ? 'Administrador' : 'Entregador';
        onLogin({ uid: user.uid, email: user.email, nome, tipo });
      }
    } catch (error) {
      setErro('Email ou senha incorretos.');
    } finally {
      setCarregando(false);
    }
  };

  return (
    <div style={{ ...styles.container, backgroundColor: cores.background, minHeight: '100vh' }}>
      <button onClick={toggleTheme} style={{ ...styles.botaoTema, backgroundColor: cores.card, color: cores.text }}>🌗</button>
      <img src="/granel.png" alt="NossoGranel" style={{ width: 180, marginBottom: 16 }} />
      <form onSubmit={handleLogin} style={styles.form}>
        <input style={{ ...styles.input, backgroundColor: cores.card, color: cores.text, borderColor: cores.cardBorder }} type="email" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} />
        <input style={{ ...styles.input, backgroundColor: cores.card, color: cores.text, borderColor: cores.cardBorder }} type="password" placeholder="Senha" value={senha} onChange={e => setSenha(e.target.value)} />
        {erro && <p style={styles.erro}>{erro}</p>}
        <button style={{ ...styles.botao, backgroundColor: cores.primary, color: cores.background, opacity: carregando ? 0.7 : 1 }} type="submit" disabled={carregando}>
          {carregando ? 'Entrando...' : 'Entrar'}
        </button>
      </form>
    </div>
  );
}

const styles = {
  container: { display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 20, position: 'relative' },
  botaoTema: { position: 'absolute', top: 20, right: 20, border: 'none', borderRadius: 30, padding: '8px 12px', fontSize: 20, cursor: 'pointer' },
  form: { width: '100%', maxWidth: 400, display: 'flex', flexDirection: 'column', gap: 16 },
  input: { border: '1px solid', borderRadius: 10, padding: 14, fontSize: 16 },
  botao: { border: 'none', borderRadius: 10, padding: 16, fontSize: 16, fontWeight: 'bold', cursor: 'pointer' },
  erro: { color: '#e74c3c', textAlign: 'center' }
};
