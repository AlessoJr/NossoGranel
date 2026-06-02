import React, { useState } from 'react';

export default function FormCliente({ cliente, onSalvar, onCancelar }) {
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
    onSalvar({ ...dados, qtdPedidos: parseInt(dados.qtdPedidos) || 0 });
  };

  return (
    <div style={styles.container}>
      <h2 style={styles.titulo}>{dados.id ? '✏️ Editar Cliente' : '➕ Novo Cliente'}</h2>
      <form onSubmit={handleSubmit} style={styles.form}>
        <input style={styles.input} name="nome" placeholder="Nome *" value={dados.nome} onChange={handleChange} />
        <input style={styles.input} name="telefone" placeholder="Telefone" value={dados.telefone} onChange={handleChange} />
        <input style={styles.input} name="endereco" placeholder="Endereço" value={dados.endereco} onChange={handleChange} />
        <input style={styles.input} name="apt" placeholder="Apartamento" value={dados.apt} onChange={handleChange} />
        <input style={styles.input} name="codigoEntrega" placeholder="Código de Entrega" value={dados.codigoEntrega} onChange={handleChange} />
        <input style={styles.input} name="qtdPedidos" type="number" placeholder="Qtd. Pedidos" value={dados.qtdPedidos} onChange={handleChange} />
        <textarea style={styles.textarea} name="observacoes" placeholder="Observações" value={dados.observacoes} onChange={handleChange} rows={3} />
        <button style={styles.botaoSalvar} type="submit">💾 Salvar</button>
        <button style={styles.botaoCancelar} type="button" onClick={onCancelar}>Cancelar</button>
      </form>
    </div>
  );
}

const styles = {
  container: { minHeight: '100vh', backgroundColor: '#1a1a2e', padding: 16 },
  titulo: { color: '#e2b96f', fontSize: 24, marginBottom: 20 },
  form: { display: 'flex', flexDirection: 'column', gap: 12, maxWidth: 500 },
  input: { backgroundColor: '#16213e', color: '#fff', border: '1px solid #2a2a4a', borderRadius: 10, padding: 12, fontSize: 15 },
  textarea: { backgroundColor: '#16213e', color: '#fff', border: '1px solid #2a2a4a', borderRadius: 10, padding: 12, fontSize: 15, fontFamily: 'inherit' },
  botaoSalvar: { backgroundColor: '#e2b96f', color: '#1a1a2e', border: 'none', borderRadius: 8, padding: '12px 16px', fontWeight: 'bold', cursor: 'pointer' },
  botaoCancelar: { backgroundColor: '#c0392b', color: '#fff', border: 'none', borderRadius: 8, padding: '12px 16px', fontWeight: 'bold', cursor: 'pointer' }
};
