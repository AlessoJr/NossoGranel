import React, { useState, useEffect } from 'react';
import { useTheme, getTheme } from '../contexts/ThemeContext';

export default function FormCliente({ cliente, onSalvar, onCancelar, clientes = [] }) {
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

  const [avisos, setAvisos] = useState({});

  const isEditando = !!dados.id;

  useEffect(() => {
    const novosAvisos = {};
    const outrosClientes = clientes.filter(c => c.id !== dados.id);

    if (dados.nome.trim().length >= 3) {
      const dup = outrosClientes.find(c =>
        c.nome?.toLowerCase().trim() === dados.nome.toLowerCase().trim()
      );
      if (dup) novosAvisos.nome = `⚠️ Nome já cadastrado para outro cliente`;
    }

    if (dados.telefone.replace(/\D/g, '').length >= 8) {
      const dup = outrosClientes.find(c =>
        c.telefone?.replace(/\D/g, '') === dados.telefone.replace(/\D/g, '') && c.telefone?.replace(/\D/g, '') !== ''
      );
      if (dup) novosAvisos.telefone = `⚠️ Telefone já cadastrado para: "${dup.nome}"`;
    }

    if (dados.codigoEntrega.trim().length >= 1) {
      const dup = outrosClientes.find(c =>
        c.codigoEntrega?.trim() === dados.codigoEntrega.trim() && c.codigoEntrega?.trim() !== ''
      );
      if (dup) novosAvisos.codigoEntrega = `⚠️ Código já cadastrado para: "${dup.nome}"`;
    }

    if (dados.endereco.trim().length >= 5) {
      const dup = outrosClientes.find(c =>
        c.endereco?.toLowerCase().trim() === dados.endereco.toLowerCase().trim() &&
        (c.apt || '') === (dados.apt || '') &&
        c.endereco?.trim() !== ''
      );
      if (dup) novosAvisos.endereco = `⚠️ Endereço já cadastrado para: "${dup.nome}"`;
    }

    setAvisos(novosAvisos);
  }, [dados.nome, dados.telefone, dados.codigoEntrega, dados.endereco, dados.apt, clientes, dados.id]);

  const handleChange = (e) => {
    setDados({ ...dados, [e.target.name]: e.target.value });
  };

  const temDuplicata = Object.keys(avisos).length > 0;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!dados.nome.trim()) { alert('Nome é obrigatório!'); return; }
    if (avisos.nome) { alert(avisos.nome.replace('⚠️ ', '')); return; }
    if (avisos.telefone) { alert(avisos.telefone.replace('⚠️ ', '')); return; }
    if (avisos.codigoEntrega) { alert(avisos.codigoEntrega.replace('⚠️ ', '')); return; }
    if (avisos.endereco) { alert(avisos.endereco.replace('⚠️ ', '')); return; }
    onSalvar({ ...dados, qtdPedidos: parseInt(dados.qtdPedidos) || 0 });
  };

  return (
    <div style={{ ...styles.container, backgroundColor: cores.background, minHeight: '100vh' }}>
      <h2 style={{ ...styles.titulo, color: cores.primary }}>{isEditando ? '✏️ Editar Cliente' : '➕ Novo Cliente'}</h2>
      <form onSubmit={handleSubmit} style={styles.form}>

        <div>
          <input style={{ ...styles.input, backgroundColor: cores.card, color: cores.text, borderColor: avisos.nome ? '#e67e22' : cores.cardBorder }} name="nome" placeholder="Nome *" value={dados.nome} onChange={handleChange} />
          {avisos.nome && <p style={styles.aviso}>{avisos.nome}</p>}
        </div>

        <div>
          <input style={{ ...styles.input, backgroundColor: cores.card, color: cores.text, borderColor: avisos.telefone ? '#e67e22' : cores.cardBorder }} name="telefone" placeholder="Telefone" value={dados.telefone} onChange={handleChange} />
          {avisos.telefone && <p style={styles.aviso}>{avisos.telefone}</p>}
        </div>

        <div>
          <input style={{ ...styles.input, backgroundColor: cores.card, color: cores.text, borderColor: avisos.endereco ? '#e67e22' : cores.cardBorder }} name="endereco" placeholder="Endereço" value={dados.endereco} onChange={handleChange} />
          {avisos.endereco && <p style={styles.aviso}>{avisos.endereco}</p>}
        </div>

        <input style={{ ...styles.input, backgroundColor: cores.card, color: cores.text, borderColor: cores.cardBorder }} name="apt" placeholder="Apartamento" value={dados.apt} onChange={handleChange} />

        <div>
          <input style={{ ...styles.input, backgroundColor: cores.card, color: cores.text, borderColor: avisos.codigoEntrega ? '#e67e22' : cores.cardBorder }} name="codigoEntrega" placeholder="Código de Entrega" value={dados.codigoEntrega} onChange={handleChange} />
          {avisos.codigoEntrega && <p style={styles.aviso}>{avisos.codigoEntrega}</p>}
        </div>

        <input style={{ ...styles.input, backgroundColor: cores.card, color: cores.text, borderColor: cores.cardBorder }} name="qtdPedidos" type="number" placeholder="Qtd. Pedidos" value={dados.qtdPedidos} onChange={handleChange} />
        <textarea style={{ ...styles.textarea, backgroundColor: cores.card, color: cores.text, borderColor: cores.cardBorder }} name="observacoes" placeholder="Observações" value={dados.observacoes} onChange={handleChange} rows={3} />

        <button style={{ ...styles.botaoSalvar, backgroundColor: temDuplicata ? '#888' : cores.primary, color: cores.background, opacity: temDuplicata ? 0.7 : 1 }} type="submit">
          {temDuplicata ? '⚠️ Dados duplicados' : '💾 Salvar'}
        </button>
        <button style={{ ...styles.botaoCancelar, backgroundColor: cores.danger, color: '#fff' }} type="button" onClick={onCancelar}>Cancelar</button>
      </form>
    </div>
  );
}

const styles = {
  container: { padding: 16 },
  titulo: { fontSize: 24, marginBottom: 20 },
  form: { display: 'flex', flexDirection: 'column', gap: 12, maxWidth: 500 },
  input: { width: '100%', border: '1px solid', borderRadius: 10, padding: 12, fontSize: 15, boxSizing: 'border-box' },
  textarea: { width: '100%', border: '1px solid', borderRadius: 10, padding: 12, fontSize: 15, fontFamily: 'inherit', boxSizing: 'border-box' },
  aviso: { color: '#e67e22', fontSize: 12, margin: '4px 0 0 4px' },
  botaoSalvar: { border: 'none', borderRadius: 8, padding: '12px 16px', fontWeight: 'bold', cursor: 'pointer' },
  botaoCancelar: { border: 'none', borderRadius: 8, padding: '12px 16px', fontWeight: 'bold', cursor: 'pointer' }
};
