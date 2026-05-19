import React, { useState } from 'react';

const ADM_EMAIL = 'admin@nossogranel.com';
const ADM_SENHA = '1234';

export default function Login({ onLogin }) {
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [erro, setErro] = useState('');

  function handleLogin(e) {
    e.preventDefault();
    if (email === ADM_EMAIL && senha === ADM_SENHA) {
      onLogin();
    } else {
      setErro('Email ou senha incorretos.');
    }
  }

  return (
    <div style={styles.container}>
      <h1 style={styles.titulo}>🌾 NossoGranel</h1>
      <p style={styles.sub}>Painel Administrativo</p>
      <form onSubmit={handleLogin} style={styles.form}>
        <input style={styles.input} type="email" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} />
        <input style={styles.input} type="password" placeholder="Senha" value={senha} onChange={e => setSenha(e.target.value)} />
        {erro && <p style={styles.erro}>{erro}</p>}
        <button style={styles.botao} type="submit">Entrar</button>
      </form>
    </div>
  );
}

const styles = {
  container: { minHeight: '100vh', backgroundColor: '#1a1a2e', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 20 },
  titulo: { color: '#e2b96f', fontSize: 32, marginBottom: 8 },
  sub: { color: '#aaa', fontSize: 14, marginBottom: 40 },
  form: { width: '100%', maxWidth: 400, display: 'flex', flexDirection: 'column', gap: 16 },
  input: { backgroundColor: '#16213e', color: '#fff', border: '1px solid #333', borderRadius: 10, padding: 14, fontSize: 16 },
  botao: { backgroundColor: '#e2b96f', color: '#1a1a2e', border: 'none', borderRadius: 10, padding: 16, fontSize: 16, fontWeight: 'bold', cursor: 'pointer' },
  erro: { color: '#e74c3c', textAlign: 'center' },
};
