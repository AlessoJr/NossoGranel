import React, { useEffect, useState } from 'react';
import { useTheme, getTheme } from '../contexts/ThemeContext';
import { collection, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';

export default function Estatisticas({ onVoltar }) {
  const { darkMode } = useTheme();
  const cores = getTheme(darkMode);
  const [rotas, setRotas] = useState([]);
  const [clientes, setClientes] = useState([]);

  useEffect(() => {
    const unsub1 = onSnapshot(collection(db, 'rotas'), snap => {
      setRotas(snap.docs.map(d => { const data = d.data(); delete data.id; return { id: d.id, ...data }; }));
    });
    const unsub2 = onSnapshot(collection(db, 'clientes'), snap => {
      setClientes(snap.docs.map(d => { const data = d.data(); delete data.id; return { id: d.id, ...data }; }));
    });
    return () => { unsub1(); unsub2(); };
  }, []);

  const concluidas = rotas.filter(r => r.status === 'concluida');
  const emAndamento = rotas.filter(r => r.status === 'em_andamento');
  const hoje = new Date();

  const ultimos7dias = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(hoje);
    d.setDate(hoje.getDate() - (6 - i));
    const label = d.toLocaleDateString('pt-BR', { weekday: 'short' });
    const dateStr = d.toISOString().split('T')[0];
    const total = concluidas.filter(r => r.concluidoEm && r.concluidoEm.startsWith(dateStr)).length;
    return { label, total };
  });

  const ultimos6meses = Array.from({ length: 6 }, (_, i) => {
    const d = new Date(hoje);
    d.setMonth(hoje.getMonth() - (5 - i));
    const label = d.toLocaleDateString('pt-BR', { month: 'short' });
    const ano = d.getFullYear();
    const mesNum = String(d.getMonth() + 1).padStart(2, '0');
    const total = concluidas.filter(r => r.concluidoEm && r.concluidoEm.startsWith(`${ano}-${mesNum}`)).length;
    return { label, total };
  });

  const rankingEntregadores = Object.entries(
    concluidas.reduce((acc, r) => {
      if (r.entregador) acc[r.entregador] = (acc[r.entregador] || 0) + 1;
      return acc;
    }, {})
  ).map(([nome, total]) => ({ nome, total }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 5);

  const rankingClientes = [...clientes]
    .filter(c => c.nome)
    .sort((a, b) => (b.qtdPedidos || 0) - (a.qtdPedidos || 0))
    .slice(0, 5);

  const mediaEntregas = rankingEntregadores.length > 0
    ? (concluidas.length / rankingEntregadores.length).toFixed(1)
    : 0;

  const maxDias = Math.max(...ultimos7dias.map(d => d.total), 1);
  const maxMeses = Math.max(...ultimos6meses.map(d => d.total), 1);

  const Barra = ({ valor, max, cor }) => (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
      <span style={{ color: cores.text, fontSize: 11, fontWeight: 'bold' }}>{valor > 0 ? valor : ''}</span>
      <div style={{ width: '100%', height: 100, display: 'flex', alignItems: 'flex-end' }}>
        <div style={{ width: '100%', height: `${(valor / max) * 100}%`, backgroundColor: cor, borderRadius: '4px 4px 0 0', minHeight: valor > 0 ? 4 : 0 }} />
      </div>
    </div>
  );

  return (
    <div style={{ backgroundColor: cores.background, minHeight: '100vh', padding: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h1 style={{ color: cores.primary, fontSize: 24, margin: 0 }}>📊 Estatísticas</h1>
        <button style={{ backgroundColor: cores.card, color: cores.text, border: 'none', borderRadius: 8, padding: '8px 16px', fontWeight: 'bold', cursor: 'pointer' }} onClick={onVoltar}>← Voltar</button>
      </div>

      {/* Cards resumo */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 16 }}>
        {[
          { label: 'Concluídas', valor: concluidas.length, cor: cores.success },
          { label: 'Em Andamento', valor: emAndamento.length, cor: cores.primary },
          { label: 'Clientes', valor: clientes.length, cor: cores.info },
          { label: 'Média/Entregador', valor: mediaEntregas, cor: cores.warning },
        ].map(card => (
          <div key={card.label} style={{ backgroundColor: cores.card, borderRadius: 12, padding: 14, border: `2px solid ${card.cor}`, textAlign: 'center' }}>
            <p style={{ color: card.cor, fontSize: 28, fontWeight: 'bold', margin: 0 }}>{card.valor}</p>
            <p style={{ color: cores.textSecondary, fontSize: 12, margin: '4px 0 0' }}>{card.label}</p>
          </div>
        ))}
      </div>

      {/* Gráfico 7 dias */}
      <div style={{ backgroundColor: cores.card, borderRadius: 12, padding: 16, marginBottom: 14, border: `1px solid ${cores.cardBorder}` }}>
        <h3 style={{ color: cores.primary, marginBottom: 12, marginTop: 0 }}>📅 Últimos 7 Dias</h3>
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 4, height: 120 }}>
          {ultimos7dias.map((d, i) => (
            <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', height: '100%' }}>
              <div style={{ flex: 1, width: '100%', display: 'flex', alignItems: 'flex-end' }}>
                <div style={{ width: '100%', height: `${(d.total / maxDias) * 100}%`, backgroundColor: cores.primary, borderRadius: '4px 4px 0 0', minHeight: d.total > 0 ? 4 : 0, transition: 'height 0.3s' }} />
              </div>
              <span style={{ color: cores.textSecondary, fontSize: 9, marginTop: 4, textAlign: 'center' }}>{d.label}</span>
              {d.total > 0 && <span style={{ color: cores.text, fontSize: 10, fontWeight: 'bold' }}>{d.total}</span>}
            </div>
          ))}
        </div>
      </div>

      {/* Gráfico 6 meses */}
      <div style={{ backgroundColor: cores.card, borderRadius: 12, padding: 16, marginBottom: 14, border: `1px solid ${cores.cardBorder}` }}>
        <h3 style={{ color: cores.primary, marginBottom: 12, marginTop: 0 }}>📆 Últimos 6 Meses</h3>
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 6, height: 120 }}>
          {ultimos6meses.map((d, i) => (
            <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', height: '100%' }}>
              <div style={{ flex: 1, width: '100%', display: 'flex', alignItems: 'flex-end' }}>
                <div style={{ width: '100%', height: `${(d.total / maxMeses) * 100}%`, backgroundColor: cores.info, borderRadius: '4px 4px 0 0', minHeight: d.total > 0 ? 4 : 0, transition: 'height 0.3s' }} />
              </div>
              <span style={{ color: cores.textSecondary, fontSize: 10, marginTop: 4 }}>{d.label}</span>
              {d.total > 0 && <span style={{ color: cores.text, fontSize: 10, fontWeight: 'bold' }}>{d.total}</span>}
            </div>
          ))}
        </div>
      </div>

      {/* Ranking entregadores */}
      <div style={{ backgroundColor: cores.card, borderRadius: 12, padding: 16, marginBottom: 14, border: `1px solid ${cores.cardBorder}` }}>
        <h3 style={{ color: cores.primary, marginBottom: 12, marginTop: 0 }}>🏆 Ranking Entregadores</h3>
        {rankingEntregadores.length === 0 && <p style={{ color: cores.textSecondary, textAlign: 'center' }}>Nenhuma entrega concluída ainda.</p>}
        {rankingEntregadores.map((e, i) => (
          <div key={e.nome} style={{ marginBottom: 10 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
              <span style={{ color: cores.text, fontSize: 13 }}>{i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}.`} {e.nome}</span>
              <span style={{ color: cores.success, fontWeight: 'bold', fontSize: 13 }}>{e.total}</span>
            </div>
            <div style={{ backgroundColor: cores.cardBorder, borderRadius: 4, height: 8 }}>
              <div style={{ backgroundColor: cores.success, borderRadius: 4, height: 8, width: `${(e.total / rankingEntregadores[0].total) * 100}%`, transition: 'width 0.3s' }} />
            </div>
          </div>
        ))}
      </div>

      {/* Ranking clientes */}
      <div style={{ backgroundColor: cores.card, borderRadius: 12, padding: 16, marginBottom: 14, border: `1px solid ${cores.cardBorder}` }}>
        <h3 style={{ color: cores.primary, marginBottom: 12, marginTop: 0 }}>👥 Top Clientes</h3>
        {rankingClientes.length === 0 && <p style={{ color: cores.textSecondary, textAlign: 'center' }}>Nenhum cliente cadastrado.</p>}
        {rankingClientes.map((c, i) => (
          <div key={c.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: `1px solid ${cores.cardBorder}` }}>
            <span style={{ color: cores.text, fontSize: 13 }}>{i + 1}. {c.nome}</span>
            <span style={{ color: cores.primary, fontWeight: 'bold', fontSize: 13 }}>{c.qtdPedidos || 0} pedidos</span>
          </div>
        ))}
      </div>
    </div>
  );
}
