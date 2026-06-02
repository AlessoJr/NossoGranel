import React, { useState } from 'react';

const USUARIOS = [
  { email: 'admin@nossogranel.com', senha: '1234', tipo: 'admin', nome: 'Administrador' },
  { email: 'entregador@nossogranel.com', senha: '1234', tipo: 'entregador', nome: 'Entregador' }
];

export default function Login({ onLogin }) {
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [erro, setErro] = useState('');

  const handleLogin = (e) => {
    e.preventDefault();
    const usuario = USUARIOS.find(u => u.email === email && u.senha === senha);
    if (usuario) {
      onLogin(usuario);
    } else {
      setErro('Email ou senha incorretos.');
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.logo}>🌾</div>
      <h1 style={styles.titulo}>NossoGranel</h1>
      <p style={styles.sub}>- ALIMENTOS SAUDÁVEIS -</p>
      <p style={styles.painel}>Painel Administrativo</p>
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
  logo: { fontSize: 80, marginBottom: 16 },
  titulo: { color: '#e2b96f', fontSize: 28, margin: 0 },
  sub: { color: '#aaa', fontSize: 14, marginTop: 4 },
  painel: { color: '#aaa', fontSize: 14, marginBottom: 40 },
  form: { width: '100%', maxWidth: 400, display: 'flex', flexDirection: 'column', gap: 16 },
  input: { backgroundColor: '#16213e', color: '#fff', border: '1px solid #333', borderRadius: 10, padding: 14, fontSize: 16 },
  botao: { backgroundColor: '#e2b96f', color: '#1a1a2e', border: 'none', borderRadius: 10, padding: 16, fontSize: 16, fontWeight: 'bold', cursor: 'pointer' },
  erro: { color: '#e74c3c', textAlign: 'center' }
};
