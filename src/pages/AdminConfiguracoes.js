import React, { useEffect, useState } from 'react';
import { getConfiguracoes, salvarConfiguracoes } from '../services/firebaseService';
import { useTheme, getTheme } from '../contexts/ThemeContext';

export default function AdminConfiguracoes({ onVoltar }) {
  const { darkMode, toggleTheme } = useTheme();
  const cores = getTheme(darkMode);
  const [config, setConfig] = useState({ assinaturaOpcional: false });
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    carregarConfig();
  }, []);

  const carregarConfig = async () => {
    const data = await getConfiguracoes();
    setConfig(data);
  };

  const handleSalvar = async () => {
    setSalvando(true);
    await salvarConfiguracoes(config);
    setSalvando(false);
    alert('Configurações salvas!');
  };

  return (
    <div style={{ ...styles.container, backgroundColor: cores.background, minHeight: '100vh' }}>
      <div style={styles.header}>
        <h1 style={{ ...styles.titulo, color: cores.primary }}>⚙️ Configurações</h1>
        <button style={{ ...styles.botaoVoltar, backgroundColor: cores.card, color: cores.text }} onClick={onVoltar}>← Voltar</button>
      </div>

      <div style={{ ...styles.card, backgroundColor: cores.card, borderColor: cores.cardBorder }}>
        <h3 style={{ color: cores.text }}>🎨 Aparência</h3>
        <button style={{ ...styles.botaoTema, backgroundColor: cores.primary, color: cores.background }} onClick={toggleTheme}>
          {darkMode ? '☀️ Modo Claro' : '🌙 Modo Escuro'}
        </button>
      </div>

      <div style={{ ...styles.card, backgroundColor: cores.card, borderColor: cores.cardBorder }}>
        <h3 style={{ color: cores.text }}>✍️ Assinatura Digital</h3>
        <label style={{ display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer' }}>
          <input
            type="checkbox"
            checked={config.assinaturaOpcional}
            onChange={(e) => setConfig({ ...config, assinaturaOpcional: e.target.checked })}
          />
          <span style={{ color: cores.text }}>Assinatura é opcional (entregador pode pular)</span>
        </label>
      </div>

      <button style={{ ...styles.botaoSalvar, backgroundColor: cores.primary, color: cores.background }} onClick={handleSalvar} disabled={salvando}>
        {salvando ? 'Salvando...' : '💾 Salvar Configurações'}
      </button>
    </div>
  );
}

const styles = {
  container: { padding: 16 },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, flexWrap: 'wrap', gap: 10 },
  titulo: { fontSize: 24, margin: 0 },
  botaoVoltar: { border: 'none', borderRadius: 8, padding: '8px 16px', fontWeight: 'bold', cursor: 'pointer' },
  card: { borderRadius: 12, padding: 16, marginBottom: 16, border: '1px solid' },
  botaoTema: { border: 'none', borderRadius: 8, padding: '10px 16px', fontWeight: 'bold', cursor: 'pointer', marginTop: 8 },
  botaoSalvar: { border: 'none', borderRadius: 8, padding: '14px 20px', fontWeight: 'bold', cursor: 'pointer', width: '100%' }
};
