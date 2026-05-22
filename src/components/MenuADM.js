import React, { useState } from 'react';
import { useTema } from '../ThemeContext';

export default function MenuADM({ onLogout, temaEscuro, alternarTema, onRota, onImportarIfood }) {
  const [menuAberto, setMenuAberto] = useState(false);

  const cores = temaEscuro ? coresEscuro : coresClaro;

  return (
    <div style={styles.container}>
      <button 
        onClick={() => setMenuAberto(!menuAberto)} 
        style={{ ...styles.botaoFoto, backgroundColor: cores.card, borderColor: cores.borda }}
      >
        👤
      </button>

      {menuAberto && (
        <>
          <div style={styles.overlay} onClick={() => setMenuAberto(false)} />
          <div style={{ ...styles.menu, backgroundColor: cores.card, borderColor: cores.borda }}>
            <div style={{ ...styles.usuario, borderBottomColor: cores.borda }}>
              <span style={{ fontSize: 40 }}>👨‍💼</span>
              <div>
                <p style={{ ...styles.nome, color: cores.texto }}>Administrador</p>
                <p style={{ ...styles.email, color: cores.textoSecundario }}>admin@nossogranel.com</p>
              </div>
            </div>

            <div style={{ ...styles.item, borderBottomColor: cores.borda }} onClick={() => alert('Status: Online ✅')}>
              <span style={styles.icone}>🟢</span>
              <span style={{ ...styles.itemTexto, color: cores.texto }}>Status: Online</span>
            </div>

            <div style={{ ...styles.item, borderBottomColor: cores.borda }} onClick={onRota}>
              <span style={styles.icone}>🗺️</span>
              <span style={{ ...styles.itemTexto, color: cores.texto }}>Rota de Entrega</span>
            </div>

            <div style={{ ...styles.item, borderBottomColor: cores.borda }} onClick={onImportarIfood}>
              <span style={styles.icone}>🍔</span>
              <span style={{ ...styles.itemTexto, color: cores.texto }}>Importar do iFood</span>
            </div>

            <div style={{ ...styles.item, borderBottomColor: cores.borda }} onClick={alternarTema}>
              <span style={styles.icone}>🌓</span>
              <span style={{ ...styles.itemTexto, color: cores.texto }}>{temaEscuro ? 'Modo Claro' : 'Modo Escuro'}</span>
            </div>

            <div style={styles.item} onClick={onLogout}>
              <span style={styles.icone}>🚪</span>
              <span style={{ ...styles.itemTexto, color: '#e74c3c' }}>Sair</span>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

const coresEscuro = {
  card: '#16213e',
  texto: '#fff',
  textoSecundario: '#aaa',
  borda: '#333'
};

const coresClaro = {
  card: '#ffffff',
  texto: '#333',
  textoSecundario: '#666',
  borda: '#ddd'
};

const styles = {
  container: { position: 'relative' },
  botaoFoto: { 
    width: 48, 
    height: 48, 
    borderRadius: '50%', 
    border: '2px solid',
    fontSize: 24,
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'none'
  },
  overlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 998
  },
  menu: {
    position: 'absolute',
    top: 55,
    right: 0,
    width: 260,
    borderRadius: 12,
    border: '1px solid',
    boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
    zIndex: 999,
    overflow: 'hidden'
  },
  usuario: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    padding: 16,
    borderBottom: '1px solid'
  },
  nome: {
    margin: 0,
    fontWeight: 'bold',
    fontSize: 14
  },
  email: {
    margin: 0,
    fontSize: 12
  },
  item: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    padding: '12px 16px',
    cursor: 'pointer',
    borderBottom: '1px solid',
    transition: 'background 0.2s'
  },
  icone: {
    fontSize: 20,
    width: 32
  },
  itemTexto: {
    fontSize: 14
  }
};
