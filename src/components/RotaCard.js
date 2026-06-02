import React from 'react';

export default function RotaCard({ rota, tipo, onExcluir, onCopiar }) {
  const isEmAndamento = rota.status === 'em_andamento';
  const isConcluida = rota.status === 'concluida';

  const styles = {
    em_andamento: { borderLeft: '4px solid #e2b96f', backgroundColor: '#16213e' },
    concluida: { borderLeft: '4px solid #27ae60', backgroundColor: '#16213e', opacity: 0.8 }
  };

  return (
    <div style={{ ...cardStyles.base, ...styles[tipo] }}>
      <div style={cardStyles.content}>
        <div style={cardStyles.info}>
          <p style={cardStyles.nome}>{rota.clienteNome}</p>
          <p style={cardStyles.detalhe}>📍 {rota.clienteEndereco}{rota.clienteApt ? `, Apt ${rota.clienteApt}` : ''}</p>
          <p style={cardStyles.detalhe}>📞 {rota.clienteTelefone}</p>
          <p style={cardStyles.detalhe}>
            🔑 Código: <span onClick={() => onCopiar(rota.codigoEntrega, 'Código')} style={cardStyles.copiavel}>{rota.codigoEntrega}</span>
          </p>
          <p style={cardStyles.detalhe}>👤 Entregador: <strong style={{ color: '#e2b96f' }}>{rota.entregador}</strong></p>
          <p style={cardStyles.detalhe}>🕐 Iniciado: {new Date(rota.iniciadoEm).toLocaleString('pt-BR')}</p>
          {isConcluida && (
            <p style={cardStyles.detalhe}>✅ Concluído: {new Date(rota.concluidoEm).toLocaleString('pt-BR')}</p>
          )}
        </div>
        <button onClick={() => onExcluir(rota.id)} style={cardStyles.botaoExcluir}>🗑️</button>
      </div>
    </div>
  );
}

const cardStyles = {
  base: {
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    border: '1px solid #2a2a4a'
  },
  content: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start'
  },
  info: { flex: 1 },
  nome: { color: '#e2b96f', fontWeight: 'bold', fontSize: 16, margin: '0 0 6px 0' },
  detalhe: { color: '#ccc', fontSize: 13, margin: '4px 0' },
  copiavel: { color: '#e2b96f', textDecoration: 'underline', cursor: 'pointer' },
  botaoExcluir: { background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', padding: 8 }
};
