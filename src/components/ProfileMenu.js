import React, { useState } from 'react';
import { useTheme, getTheme } from '../contexts/ThemeContext';

export default function ProfileMenu({ usuario, onLogout, toggleTheme, onNavigate }) {
  const { darkMode } = useTheme();
  const cores = getTheme(darkMode);
  const [menuAberto, setMenuAberto] = useState(false);

  const opcoesAdmin = [
    { id: 'clientes', label: 'Clientes', icone: '👥' },
    { id: 'rotas', label: 'Entregas', icone: '🚚' },
    { id: 'historico', label: 'Histórico', icone: '📋' },
    { id: 'entregadores', label: 'Entregadores', icone: '📍' },
    { id: 'entregadores_cadastro', label: 'Cadastrar Entregador', icone: '➕' },
    { id: 'estatisticas', label: 'Estatísticas', icone: '📊' },
    { id: 'configuracoes', label: 'Configurações', icone: '⚙️' },
    { id: 'sair', label: 'Sair', icone: '🚪', cor: '#c0392b' }
  ];

  const opcoesEntregador = [
    { id: 'clientes', label: 'Clientes', icone: '👥' },
    { id: 'rotas', label: 'Minhas Entregas', icone: '🚚' },
    { id: 'concluidas', label: 'Concluídas', icone: '✅' },
    { id: 'sair', label: 'Sair', icone: '🚪', cor: '#c0392b' }
  ];

  const itens = usuario?.tipo === 'admin' ? opcoesAdmin : opcoesEntregador;

  const handleClick = (item) => {
    setMenuAberto(false);
    if (item.id === 'sair') onLogout();
    else onNavigate(item.id);
  };

  return (
    <div style={styles.container}>
      <button onClick={() => setMenuAberto(!menuAberto)} style={{ ...styles.botaoPerfil, backgroundColor: cores.card, borderColor: cores.cardBorder }}>
        <span style={styles.avatar}>👤</span>
        <span style={{ ...styles.nome, color: cores.text }}>{usuario?.nome}</span>
        <span style={{ ...styles.seta, color: cores.text }}>{menuAberto ? '▲' : '▼'}</span>
      </button>

      {menuAberto && (
        <>
          <div style={styles.overlay} onClick={() => setMenuAberto(false)} />
          <div style={{ ...styles.menu, backgroundColor: cores.card, borderColor: cores.cardBorder }}>
            <div style={{ ...styles.cabecalho, borderBottomColor: cores.cardBorder }}>
              <span style={styles.avatarGrande}>👤</span>
              <div>
                <p style={{ ...styles.nomeGrande, color: cores.text }}>{usuario?.nome}</p>
                <p style={{ ...styles.email, color: cores.textSecondary }}>{usuario?.tipo === 'admin' ? 'Administrador' : 'Entregador'}</p>
              </div>
            </div>

            <div style={{ ...styles.item, borderBottomColor: cores.cardBorder }} onClick={() => { toggleTheme(); setMenuAberto(false); }}>
              <span style={styles.icone}>🌗</span>
              <span style={{ color: cores.text }}>{darkMode ? 'Modo Claro' : 'Modo Escuro'}</span>
            </div>

            {itens.map(item => (
              <div key={item.id} style={{ ...styles.item, borderBottomColor: cores.cardBorder }} onClick={() => handleClick(item)}>
                <span style={styles.icone}>{item.icone}</span>
                <span style={{ color: item.cor || cores.text }}>{item.label}</span>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

const styles = {
  container: { position: 'relative' },
  botaoPerfil: { display: 'flex', alignItems: 'center', gap: 8, border: '1px solid', borderRadius: 40, padding: '6px 12px', cursor: 'pointer', background: 'none' },
  avatar: { fontSize: 20 },
  nome: { fontSize: 14, fontWeight: 'bold' },
  seta: { fontSize: 10, marginLeft: 4 },
  overlay: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 998 },
  menu: { position: 'absolute', top: 55, right: 0, width: 260, borderRadius: 16, border: '1px solid', boxShadow: '0 4px 20px rgba(0,0,0,0.3)', zIndex: 999, overflow: 'hidden' },
  cabecalho: { display: 'flex', alignItems: 'center', gap: 12, padding: 16, borderBottom: '1px solid' },
  avatarGrande: { fontSize: 40 },
  nomeGrande: { fontWeight: 'bold', fontSize: 14, margin: 0 },
  email: { fontSize: 11, margin: 0 },
  item: { display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', cursor: 'pointer', borderBottom: '1px solid', fontSize: 14 },
  icone: { fontSize: 20, width: 32 }
};
