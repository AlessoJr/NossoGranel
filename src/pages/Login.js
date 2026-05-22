import React, { useState } from 'react';
import { useTema } from '../ThemeContext';

const ADM_EMAIL = 'admin@nossogranel.com';
const ADM_SENHA = '1234';

export default function Login({ onLogin }) {
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [erro, setErro] = useState('');
  const { temaEscuro, alternarTema } = useTema();

  function handleLogin(e) {
    e.preventDefault();
    if (email === ADM_EMAIL && senha === ADM_SENHA) {
      onLogin();
    } else {
      setErro('Email ou senha incorretos.');
    }
  }

  const cores = temaEscuro ? coresEscuro : coresClaro;

  return (
    <div style={{ ...styles.container, backgroundColor: cores.fundo, minHeight: '100vh' }}>
      <button onClick={alternarTema} style={{ ...styles.botaoTema, backgroundColor: cores.card, color: cores.texto }}>🌓</button>
      <img src="/icon.png" alt="NossoGranel" style={styles.logo} />
      <p style={{ ...styles.sub, color: cores.textoSecundario }}>Painel Administrativo</p>
      <form onSubmit={handleLogin} style={styles.form}>
        <input style={{ ...styles.input, backgroundColor: cores.card, color: cores.texto, borderColor: cores.borda }} type="email" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} />
        <input style={{ ...styles.input, backgroundColor: cores.card, color: cores.texto, borderColor: cores.borda }} type="password" placeholder="Senha" value={senha} onChange={e => setSenha(e.target.value)} />
        {erro && <p style={styles.erro}>{erro}</p>}
        <button style={{ ...styles.botao, backgroundColor: cores.destaque, color: cores.fundo }} type="submit">Entrar</button>
      </form>
    </div>
  );
}

const coresEscuro = {
  fundo: '#1a1a2e',
  card: '#16213e',
  texto: '#fff',
  textoSecundario: '#aaa',
  borda: '#333',
  destaque: '#e2b96f'
};

const coresClaro = {
  fundo: '#f5f5f5',
  card: '#fff',
  texto: '#333',
  textoSecundario: '#666',
  borda: '#ddd',
  destaque: '#e2b96f'
};

const styles = {
  container: { display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 20, position: 'relative' },
  botaoTema: { position: 'absolute', top: 20, right: 20, border: 'none', borderRadius: 30, padding: '8px 12px', fontSize: 20, cursor: 'pointer' },
  logo: { width: 180, height: 180, borderRadius: '50%', marginBottom: 16, objectFit: 'cover' },
  sub: { fontSize: 14, marginBottom: 40 },
  form: { width: '100%', maxWidth: 400, display: 'flex', flexDirection: 'column', gap: 16 },
  input: { border: '1px solid', borderRadius: 10, padding: 14, fontSize: 16 },
  botao: { border: 'none', borderRadius: 10, padding: 16, fontSize: 16, fontWeight: 'bold', cursor: 'pointer' },
  erro: { color: '#e74c3c', textAlign: 'center' },
};
