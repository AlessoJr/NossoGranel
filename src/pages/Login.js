import React, { useState } from 'react';
import { useTheme, getTheme } from '../contexts/ThemeContext';

const USUARIOS = [
  { email: 'admin@nossogranel.com', senha: '1234', tipo: 'admin', nome: 'Administrador' },
  { email: 'entregador@nossogranel.com', senha: '1234', tipo: 'entregador', nome: 'Entregador' }
];

export default function Login({ onLogin }) {
  const { darkMode, toggleTheme } = useTheme();
  const cores = getTheme(darkMode);
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [erro, setErro] = useState('');

  const handleLogin = (e) => {
    e.preventDefault();
    const usuario = USUARIOS.find(u => u.email === email && u.senha === senha);
    if (usuario) onLogin(usuario);
    else setErro('Email ou senha incorretos.');
  };

  return (
    <div style={{ ...styles.container, backgroundColor: cores.background, minHeight: '100vh' }}>
      <button onClick={toggleTheme} style={{ ...styles.botaoTema, backgroundColor: cores.card, color: cores.text }}>🌓</button>
      <div style={{ fontSize: 80, marginBottom: 16 }}>🌾</div>
      <h1 style={{ ...styles.titulo, color: cores.primary }}>NossoGranel</h1>
      <p style={{ ...styles.sub, color: cores.textSecondary }}>- ALIMENTOS SAUDÁVEIS -</p>
      <p style={{ ...styles.painel, color: cores.textSecondary }}>Painel Administrativo</p>
      <form onSubmit={handleLogin} style={styles.form}>
        <input style={{ ...styles.input, backgroundColor: cores.card, color: cores.text, borderColor: cores.cardBorder }} type="email" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} />
        <input style={{ ...styles.input, backgroundColor: cores.card, color: cores.text, borderColor: cores.cardBorder }} type="password" placeholder="Senha" value={senha} onChange={e => setSenha(e.target.value)} />
        {erro && <p style={styles.erro}>{erro}</p>}
        <button style={{ ...styles.botao, backgroundColor: cores.primary, color: cores.background }} type="submit">Entrar</button>
      </form>
    </div>
  );
}

const styles = {
  container: { display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 20, position: 'relative' },
  botaoTema: { position: 'absolute', top: 20, right: 20, border: 'none', borderRadius: 30, padding: '8px 12px', fontSize: 20, cursor: 'pointer' },
  titulo: { fontSize: 28, margin: 0 },
  sub: { fontSize: 14, marginTop: 4 },
  painel: { fontSize: 14, marginBottom: 40 },
  form: { width: '100%', maxWidth: 400, display: 'flex', flexDirection: 'column', gap: 16 },
  input: { border: '1px solid', borderRadius: 10, padding: 14, fontSize: 16 },
  botao: { border: 'none', borderRadius: 10, padding: 16, fontSize: 16, fontWeight: 'bold', cursor: 'pointer' },
  erro: { color: '#e74c3c', textAlign: 'center' }
};
