import React, { useState } from 'react';
import { useTheme, getTheme } from '../contexts/ThemeContext';

export default function FormCliente({ cliente, onSalvar, onCancelar }) {
  const { darkMode } = useTheme();
  const cores = getTheme(darkMode);
  
  const [dados, setDados] = useState({
    nome: cliente?.nome || '',
    telefone: cliente?.telefone || '',
    endereco: cliente?.endereco || '',
    apt: cliente?.apt || '',
    codigoEntrega: cliente?.codigoEntrega || '',
    qtdPedidos: cliente?.qtdPedidos || 0,
    observacoes: cliente?.observacoes || '',
    id: cliente?.id || null
  });

  const handleChange = (e) => {
    setDados({ ...dados, [e.target.name]: e.target.value });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!dados.nome.trim()) {
      alert('Nome é obrigatório!');
      return;
    }
    // Envia os dados completos incluindo o ID se existir
    onSalvar({ ...dados, qtdPedidos: parseInt(dados.qtdPedidos) || 0 });
  };

  const isEditando = !!dados.id;

  return (
    <div style={{ ...styles.container, backgroundColor: cores.background, minHeight: '100vh' }}>
      <h2 style={{ ...styles.titulo, color: cores.primary }}>{isEditando ? '✏️ Editar Cliente' : '➕ Novo Cliente'}</h2>
      <form onSubmit={handleSubmit} style={styles.form}>
        <input style={{ ...styles.input, backgroundColor: cores.card, color: cores.text, borderColor: cores.cardBorder }} name="nome" placeholder="Nome *" value={dados.nome} onChange={handleChange} />
        <input style={{ ...styles.input, backgroundColor: cores.card, color: cores.text, borderColor: cores.cardBorder }} name="telefone" placeholder="Telefone" value={dados.telefone} onChange={handleChange} />
        <input style={{ ...styles.input, backgroundColor: cores.card, color: cores.text, borderColor: cores.cardBorder }} name="endereco" placeholder="Endereço" value={dados.endereco} onChange={handleChange} />
        <input style={{ ...styles.input, backgroundColor: cores.card, color: cores.text, borderColor: cores.cardBorder }} name="apt" placeholder="Apartamento" value={dados.apt} onChange={handleChange} />
        <input style={{ ...styles.input, backgroundColor: cores.card, color: cores.text, borderColor: cores.cardBorder }} name="codigoEntrega" placeholder="Código de Entrega" value={dados.codigoEntrega} onChange={handleChange} />
        <input style={{ ...styles.input, backgroundColor: cores.card, color: cores.text, borderColor: cores.cardBorder }} name="qtdPedidos" type="number" placeholder="Qtd. Pedidos" value={dados.qtdPedidos} onChange={handleChange} />
        <textarea style={{ ...styles.textarea, backgroundColor: cores.card, color: cores.text, borderColor: cores.cardBorder }} name="observacoes" placeholder="Observações" value={dados.observacoes} onChange={handleChange} rows={3} />
        <button style={{ ...styles.botaoSalvar, backgroundColor: cores.primary, color: cores.background }} type="submit">💾 Salvar</button>
        <button style={{ ...styles.botaoCancelar, backgroundColor: cores.danger, color: '#fff' }} type="button" onClick={onCancelar}>Cancelar</button>
      </form>
    </div>
  );
}

const styles = {
  container: { padding: 16 },
  titulo: { fontSize: 24, marginBottom: 20 },
  form: { display: 'flex', flexDirection: 'column', gap: 12, maxWidth: 500 },
  input: { border: '1px solid', borderRadius: 10, padding: 12, fontSize: 15 },
  textarea: { border: '1px solid', borderRadius: 10, padding: 12, fontSize: 15, fontFamily: 'inherit' },
  botaoSalvar: { border: 'none', borderRadius: 8, padding: '12px 16px', fontWeight: 'bold', cursor: 'pointer' },
  botaoCancelar: { border: 'none', borderRadius: 8, padding: '12px 16px', fontWeight: 'bold', cursor: 'pointer' }
};
