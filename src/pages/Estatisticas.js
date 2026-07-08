import React, { useEffect, useState } from 'react';
import { useTheme, getTheme } from '../contexts/ThemeContext';
import { collection, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';

export default function Estatisticas({ onVoltar }) {
  const { darkMode } = useTheme();
  const cores = getTheme(darkMode);
  const [rotas, setRotas] = useState([]);
  const [clientes, setClientes] = useState([]);
  const [abaAtiva, setAbaAtiva] = useState('resumo');

  useEffect(() => {
    const unsub1 = onSnapshot(collection(db, 'rotas'), snap => {
      setRotas(snap.docs.map(d => { const data = d.data(); delete data.id; return { id: d.id, ...data }; }));
    });
    const unsub2 = onSnapshot(collection(db, 'clientes'), snap => {
      setClientes(snap.docs.map(d => { const data = d.data(); delete data.id; return { id: d.id, ...data }; }));
    });
    return () => { unsub1(); unsub2(); };
  }, []);

  const hoje = new Date();
  const concluidas = rotas.filter(r => r.status === 'concluida');
  const emAndamento = rotas.filter(r => r.status === 'em_andamento');
  const totalRotas = rotas.length;
  const taxaConclusao = totalRotas > 0 ? ((concluidas.length / totalRotas) * 100).toFixed(1) : 0;

  // Tempo médio de entrega (em minutos)
  const tempoMedio = (() => {
    const comTempo = concluidas.filter(r => r.iniciadoEm && r.concluidoEm);
    if (comTempo.length === 0) return 0;
    const total = comTempo.reduce((acc, r) => {
      const diff = new Date(r.concluidoEm) - new Date(r.iniciadoEm);
      return acc + diff;
    }, 0);
    return Math.round(total / comTempo.length / 60000);
  })();

  // Últimos 7 dias
  const ultimos7dias = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(hoje);
    d.setDate(hoje.getDate() - (6 - i));
    const label = d.toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit' });
    const dateStr = d.toISOString().split('T')[0];
    const total = concluidas.filter(r => r.concluidoEm && r.concluidoEm.startsWith(dateStr)).length;
    return { label, total };
  });

  // Últimos 6 meses com comparativo
  const ultimos6meses = Array.from({ length: 6 }, (_, i) => {
    const d = new Date(hoje);
    d.setMonth(hoje.getMonth() - (5 - i));
    const label = d.toLocaleDateString('pt-BR', { month: 'short' });
    const ano = d.getFullYear();
    const mesNum = String(d.getMonth() + 1).padStart(2, '0');
    const total = concluidas.filter(r => r.concluidoEm && r.concluidoEm.startsWith(`${ano}-${mesNum}`)).length;
    return { label, total, mesAno: `${ano}-${mesNum}` };
  });

  // Comparativo mês atual vs anterior
  const mesAtual = ultimos6meses[5]?.total || 0;
  const mesAnterior = ultimos6meses[4]?.total || 0;
  const variacaoMes = mesAnterior > 0 ? (((mesAtual - mesAnterior) / mesAnterior) * 100).toFixed(0) : null;

  // Dia da semana com mais entregas
  const diasSemana = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
  const porDiaSemana = Array(7).fill(0);
  concluidas.forEach(r => {
    if (r.concluidoEm) porDiaSemana[new Date(r.concluidoEm).getDay()]++;
  });
  const diaPico = porDiaSemana.indexOf(Math.max(...porDiaSemana));

  // Ranking entregadores
  const rankingEntregadores = Object.entries(
    concluidas.reduce((acc, r) => {
      if (r.entregador) acc[r.entregador] = (acc[r.entregador] || 0) + 1;
      return acc;
    }, {})
  ).map(([nome, total]) => ({ nome, total }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 5);

  // Tempo médio por entregador
  const tempoMedioPorEntregador = rankingEntregadores.map(e => {
    const rotasEnt = concluidas.filter(r => r.entregador === e.nome && r.iniciadoEm && r.concluidoEm);
    const media = rotasEnt.length > 0
      ? Math.round(rotasEnt.reduce((acc, r) => acc + (new Date(r.concluidoEm) - new Date(r.iniciadoEm)), 0) / rotasEnt.length / 60000)
      : 0;
    return { ...e, tempoMedio: media };
  });

  // Top clientes
  const rankingClientes = [...clientes]
    .filter(c => c.nome)
    .sort((a, b) => (b.qtdPedidos || 0) - (a.qtdPedidos || 0))
    .slice(0, 5);

  // Clientes inativos (sem entrega há mais de 30 dias)
  const clientesInativos = clientes.filter(c => {
    const ultimaEntrega = concluidas
      .filter(r => r.clienteId === c.id)
      .sort((a, b) => new Date(b.concluidoEm) - new Date(a.concluidoEm))[0];
    if (!ultimaEntrega) return c.qtdPedidos > 0;
    const diasDesde = (hoje - new Date(ultimaEntrega.concluidoEm)) / (1000 * 60 * 60 * 24);
    return diasDesde > 30;
  }).slice(0, 5);

  // Distribuição por bairro
  const porBairro = Object.entries(
    clientes.reduce((acc, c) => {
      if (c.endereco) {
        const partes = c.endereco.split('-');
        const bairro = partes.length > 1 ? partes[partes.length - 2].trim() : partes[0].trim();
        if (bairro) acc[bairro] = (acc[bairro] || 0) + 1;
      }
      return acc;
    }, {})
  ).map(([bairro, total]) => ({ bairro, total }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 5);

  const mediaEntregas = rankingEntregadores.length > 0
    ? (concluidas.length / rankingEntregadores.length).toFixed(1) : 0;

  const maxDias = Math.max(...ultimos7dias.map(d => d.total), 1);
  const maxMeses = Math.max(...ultimos6meses.map(d => d.total), 1);

  const medalha = (i) => i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}.`;
  const corMedalha = (i) => i === 0 ? '#FFD700' : i === 1 ? '#C0C0C0' : i === 2 ? '#CD7F32' : cores.textSecondary;

  const abas = [
    { id: 'resumo', label: '📊 Resumo' },
    { id: 'entregas', label: '🚚 Entregas' },
    { id: 'entregadores', label: '🏆 Entregadores' },
    { id: 'clientes', label: '👥 Clientes' },
  ];

  return (
    <div style={{ backgroundColor: cores.background, minHeight: '100vh', paddingBottom: 32 }}>
      {/* Header */}
      <div style={{ padding: '16px 16px 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <h1 style={{ color: cores.primary, fontSize: 22, margin: 0 }}>📊 Estatísticas</h1>
        <button style={{ backgroundColor: cores.card, color: cores.text, border: 'none', borderRadius: 8, padding: '8px 16px', fontWeight: 'bold', cursor: 'pointer' }} onClick={onVoltar}>← Voltar</button>
      </div>

      {/* Abas */}
      <div style={{ display: 'flex', gap: 6, padding: '0 16px 16px', overflowX: 'auto' }}>
        {abas.map(a => (
          <button key={a.id} onClick={() => setAbaAtiva(a.id)} style={{ border: 'none', borderRadius: 20, padding: '8px 14px', fontSize: 12, fontWeight: 'bold', cursor: 'pointer', whiteSpace: 'nowrap', backgroundColor: abaAtiva === a.id ? cores.primary : cores.card, color: abaAtiva === a.id ? cores.background : cores.text }}>
            {a.label}
          </button>
        ))}
      </div>

      <div style={{ padding: '0 16px' }}>

        {/* ABA RESUMO */}
        {abaAtiva === 'resumo' && (
          <>
            {/* Cards principais */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 16 }}>
              {[
                { label: '✅ Concluídas', valor: concluidas.length, cor: cores.success, sub: `${taxaConclusao}% de conclusão` },
                { label: '🚚 Em Andamento', valor: emAndamento.length, cor: cores.primary, sub: `${totalRotas} rotas total` },
                { label: '👥 Clientes', valor: clientes.length, cor: cores.info, sub: `${clientesInativos.length} inativos` },
                { label: '⏱️ Tempo Médio', valor: `${tempoMedio}min`, cor: cores.warning, sub: 'por entrega' },
              ].map(card => (
                <div key={card.label} style={{ backgroundColor: cores.card, borderRadius: 14, padding: 16, border: `2px solid ${card.cor}`, textAlign: 'center' }}>
                  <p style={{ color: card.cor, fontSize: 26, fontWeight: 'bold', margin: 0 }}>{card.valor}</p>
                  <p style={{ color: cores.text, fontSize: 12, margin: '4px 0 2px', fontWeight: 'bold' }}>{card.label}</p>
                  <p style={{ color: cores.textSecondary, fontSize: 10, margin: 0 }}>{card.sub}</p>
                </div>
              ))}
            </div>

            {/* Comparativo mês */}
            <div style={{ backgroundColor: cores.card, borderRadius: 14, padding: 16, marginBottom: 14, border: `1px solid ${cores.cardBorder}` }}>
              <h3 style={{ color: cores.primary, margin: '0 0 12px', fontSize: 15 }}>📈 Comparativo Mensal</h3>
              <div style={{ display: 'flex', justifyContent: 'space-around', alignItems: 'center' }}>
                <div style={{ textAlign: 'center' }}>
                  <p style={{ color: cores.textSecondary, fontSize: 11, margin: '0 0 4px' }}>Mês anterior</p>
                  <p style={{ color: cores.text, fontSize: 24, fontWeight: 'bold', margin: 0 }}>{mesAnterior}</p>
                </div>
                <div style={{ textAlign: 'center' }}>
                  {variacaoMes !== null && (
                    <p style={{ color: Number(variacaoMes) >= 0 ? cores.success : cores.danger, fontSize: 20, fontWeight: 'bold', margin: 0 }}>
                      {Number(variacaoMes) >= 0 ? '▲' : '▼'} {Math.abs(variacaoMes)}%
                    </p>
                  )}
                </div>
                <div style={{ textAlign: 'center' }}>
                  <p style={{ color: cores.textSecondary, fontSize: 11, margin: '0 0 4px' }}>Mês atual</p>
                  <p style={{ color: cores.primary, fontSize: 24, fontWeight: 'bold', margin: 0 }}>{mesAtual}</p>
                </div>
              </div>
            </div>

            {/* Dia de pico */}
            <div style={{ backgroundColor: cores.card, borderRadius: 14, padding: 16, marginBottom: 14, border: `1px solid ${cores.cardBorder}` }}>
              <h3 style={{ color: cores.primary, margin: '0 0 12px', fontSize: 15 }}>⚡ Dia de Pico</h3>
              <div style={{ display: 'flex', gap: 4 }}>
                {diasSemana.map((dia, i) => (
                  <div key={i} style={{ flex: 1, textAlign: 'center' }}>
                    <div style={{ backgroundColor: i === diaPico ? cores.primary : cores.cardBorder, borderRadius: 8, padding: '8px 2px', marginBottom: 4, border: i === diaPico ? `2px solid ${cores.primary}` : 'none' }}>
                      <p style={{ color: i === diaPico ? cores.background : cores.textSecondary, fontSize: 14, fontWeight: 'bold', margin: 0 }}>{porDiaSemana[i]}</p>
                    </div>
                    <p style={{ color: i === diaPico ? cores.primary : cores.textSecondary, fontSize: 9, margin: 0, fontWeight: i === diaPico ? 'bold' : 'normal' }}>{dia}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Taxa de conclusão visual */}
            <div style={{ backgroundColor: cores.card, borderRadius: 14, padding: 16, marginBottom: 14, border: `1px solid ${cores.cardBorder}` }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                <h3 style={{ color: cores.primary, margin: 0, fontSize: 15 }}>🎯 Taxa de Conclusão</h3>
                <span style={{ color: cores.success, fontWeight: 'bold', fontSize: 18 }}>{taxaConclusao}%</span>
              </div>
              <div style={{ backgroundColor: cores.cardBorder, borderRadius: 8, height: 14 }}>
                <div style={{ backgroundColor: cores.success, borderRadius: 8, height: 14, width: `${taxaConclusao}%`, transition: 'width 0.5s' }} />
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6 }}>
                <span style={{ color: cores.textSecondary, fontSize: 11 }}>{concluidas.length} concluídas</span>
                <span style={{ color: cores.textSecondary, fontSize: 11 }}>{totalRotas} total</span>
              </div>
            </div>
          </>
        )}

        {/* ABA ENTREGAS */}
        {abaAtiva === 'entregas' && (
          <>
            {/* Gráfico 7 dias */}
            <div style={{ backgroundColor: cores.card, borderRadius: 14, padding: 16, marginBottom: 14, border: `1px solid ${cores.cardBorder}` }}>
              <h3 style={{ color: cores.primary, marginBottom: 16, marginTop: 0, fontSize: 15 }}>📅 Últimos 7 Dias</h3>
              <div style={{ display: 'flex', alignItems: 'flex-end', gap: 6, height: 140 }}>
                {ultimos7dias.map((d, i) => (
                  <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', height: '100%' }}>
                    {d.total > 0 && <span style={{ color: cores.primary, fontSize: 10, fontWeight: 'bold', marginBottom: 2 }}>{d.total}</span>}
                    <div style={{ flex: 1, width: '100%', display: 'flex', alignItems: 'flex-end' }}>
                      <div style={{ width: '100%', height: `${(d.total / maxDias) * 100}%`, background: `linear-gradient(180deg, ${cores.primary} 0%, ${cores.primary}88 100%)`, borderRadius: '6px 6px 0 0', minHeight: d.total > 0 ? 6 : 2, backgroundColor: d.total === 0 ? cores.cardBorder : cores.primary, transition: 'height 0.4s ease' }} />
                    </div>
                    <span style={{ color: cores.textSecondary, fontSize: 8, marginTop: 6, textAlign: 'center' }}>{d.label}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Gráfico 6 meses */}
            <div style={{ backgroundColor: cores.card, borderRadius: 14, padding: 16, marginBottom: 14, border: `1px solid ${cores.cardBorder}` }}>
              <h3 style={{ color: cores.primary, marginBottom: 16, marginTop: 0, fontSize: 15 }}>📆 Últimos 6 Meses</h3>
              <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8, height: 140 }}>
                {ultimos6meses.map((d, i) => (
                  <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', height: '100%' }}>
                    {d.total > 0 && <span style={{ color: cores.info, fontSize: 11, fontWeight: 'bold', marginBottom: 2 }}>{d.total}</span>}
                    <div style={{ flex: 1, width: '100%', display: 'flex', alignItems: 'flex-end' }}>
                      <div style={{ width: '100%', height: `${(d.total / maxMeses) * 100}%`, background: `linear-gradient(180deg, ${cores.info} 0%, ${cores.info}88 100%)`, borderRadius: '6px 6px 0 0', minHeight: d.total > 0 ? 6 : 2, backgroundColor: d.total === 0 ? cores.cardBorder : cores.info, transition: 'height 0.4s ease' }} />
                    </div>
                    <span style={{ color: cores.textSecondary, fontSize: 10, marginTop: 6 }}>{d.label}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Distribuição por dia da semana */}
            <div style={{ backgroundColor: cores.card, borderRadius: 14, padding: 16, marginBottom: 14, border: `1px solid ${cores.cardBorder}` }}>
              <h3 style={{ color: cores.primary, margin: '0 0 12px', fontSize: 15 }}>📊 Por Dia da Semana</h3>
              {diasSemana.map((dia, i) => (
                <div key={i} style={{ marginBottom: 8 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
                    <span style={{ color: i === diaPico ? cores.primary : cores.text, fontSize: 12, fontWeight: i === diaPico ? 'bold' : 'normal' }}>{dia} {i === diaPico ? '⚡' : ''}</span>
                    <span style={{ color: cores.textSecondary, fontSize: 12 }}>{porDiaSemana[i]}</span>
                  </div>
                  <div style={{ backgroundColor: cores.cardBorder, borderRadius: 4, height: 6 }}>
                    <div style={{ backgroundColor: i === diaPico ? cores.primary : cores.info, borderRadius: 4, height: 6, width: `${(porDiaSemana[i] / Math.max(...porDiaSemana, 1)) * 100}%`, transition: 'width 0.4s' }} />
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        {/* ABA ENTREGADORES */}
        {abaAtiva === 'entregadores' && (
          <>
            {rankingEntregadores.length === 0 && (
              <p style={{ color: cores.textSecondary, textAlign: 'center', marginTop: 40 }}>Nenhuma entrega concluída ainda.</p>
            )}

            {/* Pódio top 3 */}
            {rankingEntregadores.length >= 3 && (
              <div style={{ backgroundColor: cores.card, borderRadius: 14, padding: 16, marginBottom: 14, border: `1px solid ${cores.cardBorder}` }}>
                <h3 style={{ color: cores.primary, margin: '0 0 16px', fontSize: 15, textAlign: 'center' }}>🏆 Pódio</h3>
                <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'center', gap: 8 }}>
                  {/* 2º lugar */}
                  <div style={{ textAlign: 'center', flex: 1 }}>
                    <p style={{ fontSize: 28, margin: '0 0 4px' }}>🥈</p>
                    <div style={{ backgroundColor: '#C0C0C0', borderRadius: '8px 8px 0 0', padding: '12px 4px 8px', minHeight: 60 }}>
                      <p style={{ color: '#1a1a2e', fontSize: 11, fontWeight: 'bold', margin: 0 }}>{rankingEntregadores[1]?.nome}</p>
                      <p style={{ color: '#1a1a2e', fontSize: 18, fontWeight: 'bold', margin: 0 }}>{rankingEntregadores[1]?.total}</p>
                    </div>
                  </div>
                  {/* 1º lugar */}
                  <div style={{ textAlign: 'center', flex: 1 }}>
                    <p style={{ fontSize: 36, margin: '0 0 4px' }}>🥇</p>
                    <div style={{ backgroundColor: '#FFD700', borderRadius: '8px 8px 0 0', padding: '16px 4px 8px', minHeight: 80 }}>
                      <p style={{ color: '#1a1a2e', fontSize: 11, fontWeight: 'bold', margin: 0 }}>{rankingEntregadores[0]?.nome}</p>
                      <p style={{ color: '#1a1a2e', fontSize: 22, fontWeight: 'bold', margin: 0 }}>{rankingEntregadores[0]?.total}</p>
                    </div>
                  </div>
                  {/* 3º lugar */}
                  <div style={{ textAlign: 'center', flex: 1 }}>
                    <p style={{ fontSize: 24, margin: '0 0 4px' }}>🥉</p>
                    <div style={{ backgroundColor: '#CD7F32', borderRadius: '8px 8px 0 0', padding: '8px 4px 8px', minHeight: 45 }}>
                      <p style={{ color: '#fff', fontSize: 11, fontWeight: 'bold', margin: 0 }}>{rankingEntregadores[2]?.nome}</p>
                      <p style={{ color: '#fff', fontSize: 16, fontWeight: 'bold', margin: 0 }}>{rankingEntregadores[2]?.total}</p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Ranking completo com tempo médio */}
            <div style={{ backgroundColor: cores.card, borderRadius: 14, padding: 16, marginBottom: 14, border: `1px solid ${cores.cardBorder}` }}>
              <h3 style={{ color: cores.primary, margin: '0 0 12px', fontSize: 15 }}>📋 Ranking Completo</h3>
              {tempoMedioPorEntregador.map((e, i) => (
                <div key={e.nome} style={{ marginBottom: 14, paddingBottom: 14, borderBottom: i < tempoMedioPorEntregador.length - 1 ? `1px solid ${cores.cardBorder}` : 'none' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                    <span style={{ color: corMedalha(i), fontWeight: 'bold', fontSize: 16 }}>{medalha(i)} {e.nome}</span>
                    <div style={{ textAlign: 'right' }}>
                      <span style={{ color: cores.success, fontWeight: 'bold', fontSize: 15 }}>{e.total}</span>
                      <span style={{ color: cores.textSecondary, fontSize: 10, display: 'block' }}>⏱️ {e.tempoMedio}min/entrega</span>
                    </div>
                  </div>
                  <div style={{ backgroundColor: cores.cardBorder, borderRadius: 6, height: 10 }}>
                    <div style={{ backgroundColor: corMedalha(i) === cores.textSecondary ? cores.info : corMedalha(i), borderRadius: 6, height: 10, width: `${(e.total / tempoMedioPorEntregador[0].total) * 100}%`, transition: 'width 0.5s' }} />
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        {/* ABA CLIENTES */}
        {abaAtiva === 'clientes' && (
          <>
            {/* Top clientes */}
            <div style={{ backgroundColor: cores.card, borderRadius: 14, padding: 16, marginBottom: 14, border: `1px solid ${cores.cardBorder}` }}>
              <h3 style={{ color: cores.primary, margin: '0 0 12px', fontSize: 15 }}>⭐ Top Clientes</h3>
              {rankingClientes.map((c, i) => (
                <div key={c.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: i < rankingClientes.length - 1 ? `1px solid ${cores.cardBorder}` : 'none' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{ fontSize: 20 }}>{medalha(i)}</span>
                    <div>
                      <p style={{ color: cores.text, fontSize: 13, margin: 0, fontWeight: 'bold' }}>{c.nome}</p>
                      <p style={{ color: cores.textSecondary, fontSize: 11, margin: 0 }}>{c.endereco?.split('-')[0]?.trim() || '---'}</p>
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <p style={{ color: cores.primary, fontWeight: 'bold', fontSize: 16, margin: 0 }}>{c.qtdPedidos || 0}</p>
                    <p style={{ color: cores.textSecondary, fontSize: 10, margin: 0 }}>pedidos</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Clientes inativos */}
            <div style={{ backgroundColor: cores.card, borderRadius: 14, padding: 16, marginBottom: 14, border: `1px solid ${cores.danger}` }}>
              <h3 style={{ color: cores.danger, margin: '0 0 12px', fontSize: 15 }}>⚠️ Clientes Inativos (+30 dias)</h3>
              {clientesInativos.length === 0
                ? <p style={{ color: cores.textSecondary, textAlign: 'center', margin: 0 }}>Nenhum cliente inativo.</p>
                : clientesInativos.map((c, i) => (
                  <div key={c.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: i < clientesInativos.length - 1 ? `1px solid ${cores.cardBorder}` : 'none' }}>
                    <span style={{ color: cores.text, fontSize: 13 }}>{c.nome}</span>
                    <span style={{ color: cores.danger, fontSize: 12 }}>{c.qtdPedidos || 0} pedidos</span>
                  </div>
                ))
              }
            </div>

            {/* Distribuição por bairro */}
            <div style={{ backgroundColor: cores.card, borderRadius: 14, padding: 16, marginBottom: 14, border: `1px solid ${cores.cardBorder}` }}>
              <h3 style={{ color: cores.primary, margin: '0 0 12px', fontSize: 15 }}>🗺️ Por Região/Bairro</h3>
              {porBairro.length === 0
                ? <p style={{ color: cores.textSecondary, textAlign: 'center', margin: 0 }}>Endereços não cadastrados.</p>
                : porBairro.map((b, i) => (
                  <div key={i} style={{ marginBottom: 10 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                      <span style={{ color: cores.text, fontSize: 13 }}>{b.bairro}</span>
                      <span style={{ color: cores.info, fontWeight: 'bold', fontSize: 13 }}>{b.total} clientes</span>
                    </div>
                    <div style={{ backgroundColor: cores.cardBorder, borderRadius: 4, height: 8 }}>
                      <div style={{ backgroundColor: cores.info, borderRadius: 4, height: 8, width: `${(b.total / porBairro[0].total) * 100}%`, transition: 'width 0.4s' }} />
                    </div>
                  </div>
                ))
              }
            </div>
          </>
        )}
      </div>
    </div>
  );
}
