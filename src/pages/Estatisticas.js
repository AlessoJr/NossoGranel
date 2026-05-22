import React, { useEffect, useState } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../firebase';
import { useTema } from '../ThemeContext';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer } from 'recharts';

export default function Estatisticas({ onVoltar }) {
  const [stats, setStats] = useState({
    total: 0,
    totalPedidos: 0,
    mediaPedidos: 0,
    fixados: 0,
    clientesComTelefone: 0,
    clientesComEndereco: 0
  });
  const [clientesPorPedido, setClientesPorPedido] = useState([]);
  const { temaEscuro, alternarTema } = useTema();

  async function carregarStats() {
    const snap = await getDocs(collection(db, 'clientes'));
    const lista = snap.docs.map(d => d.data());
    
    const total = lista.length;
    const totalPedidos = lista.reduce((acc, c) => acc + (c.qtdPedidos || 0), 0);
    const mediaPedidos = total > 0 ? (totalPedidos / total).toFixed(1) : 0;
    const fixados = lista.filter(c => c.fixado === true).length;
    const clientesComTelefone = lista.filter(c => c.telefone && c.telefone !== '').length;
    const clientesComEndereco = lista.filter(c => c.endereco && c.endereco !== '').length;

    setStats({
      total,
      totalPedidos,
      mediaPedidos,
      fixados,
      clientesComTelefone,
      clientesComEndereco
    });

    // Dados para gráfico de barras - top 5 clientes com mais pedidos
    const topClientes = lista
      .filter(c => c.nome && c.nome !== '')
      .sort((a, b) => (b.qtdPedidos || 0) - (a.qtdPedidos || 0))
      .slice(0, 5)
      .map(c => ({
        nome: c.nome.length > 15 ? c.nome.substring(0, 12) + '...' : c.nome,
        pedidos: c.qtdPedidos || 0
      }));
    setClientesPorPedido(topClientes);
  }

  useEffect(() => { carregarStats(); }, []);

  const cores = temaEscuro ? coresEscuro : coresClaro;

  // Dados para gráfico de pizza
  const pizzaData = [
    { name: 'Fixados ⭐', value: stats.fixados, cor: '#e2b96f' },
    { name: 'Normais', value: stats.total - stats.fixados, cor: '#2980b9' }
  ];

  const pizzaDataContato = [
    { name: 'Com Telefone', value: stats.clientesComTelefone, cor: '#27ae60' },
    { name: 'Sem Telefone', value: stats.total - stats.clientesComTelefone, cor: '#e74c3c' }
  ];

  return (
    <div style={{ ...styles.container, backgroundColor: cores.fundo, minHeight: '100vh' }}>
      <div style={styles.header}>
        <h1 style={{ ...styles.titulo, color: cores.destaque }}>📊 Estatísticas</h1>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={alternarTema} style={{ ...styles.botaoTema, backgroundColor: cores.card, color: cores.texto }}>🌓</button>
          <button style={{ ...styles.botaoVoltar, backgroundColor: cores.card, color: cores.destaque }} onClick={onVoltar}>← Voltar</button>
        </div>
      </div>

      {/* Cards de números */}
      <div style={styles.grid}>
        <div style={{ ...styles.card, backgroundColor: cores.card, borderColor: cores.borda }}>
          <p style={{ ...styles.numero, color: cores.destaque }}>{stats.total}</p>
          <p style={{ ...styles.label, color: cores.textoSecundario }}>Total de Clientes</p>
        </div>
        <div style={{ ...styles.card, backgroundColor: cores.card, borderColor: cores.borda }}>
          <p style={{ ...styles.numero, color: cores.destaque }}>{stats.totalPedidos}</p>
          <p style={{ ...styles.label, color: cores.textoSecundario }}>Total de Pedidos</p>
        </div>
        <div style={{ ...styles.card, backgroundColor: cores.card, borderColor: cores.borda }}>
          <p style={{ ...styles.numero, color: cores.destaque }}>{stats.mediaPedidos}</p>
          <p style={{ ...styles.label, color: cores.textoSecundario }}>Média de Pedidos</p>
        </div>
      </div>

      {/* Gráficos lado a lado */}
      <div style={{ ...styles.graficosContainer, backgroundColor: cores.card, borderColor: cores.borda }}>
        <h3 style={{ ...styles.graficoTitulo, color: cores.texto }}>📌 Status de Fixação</h3>
        <ResponsiveContainer width="100%" height={250}>
          <PieChart>
            <Pie
              data={pizzaData}
              cx="50%"
              cy="50%"
              labelLine={false}
              label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
              outerRadius={80}
              fill="#8884d8"
              dataKey="value"
            >
              {pizzaData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.cor} />
              ))}
            </Pie>
            <Tooltip />
            <Legend />
          </PieChart>
        </ResponsiveContainer>
      </div>

      <div style={{ ...styles.graficosContainer, backgroundColor: cores.card, borderColor: cores.borda }}>
        <h3 style={{ ...styles.graficoTitulo, color: cores.texto }}>📞 Contato dos Clientes</h3>
        <ResponsiveContainer width="100%" height={250}>
          <PieChart>
            <Pie
              data={pizzaDataContato}
              cx="50%"
              cy="50%"
              labelLine={false}
              label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
              outerRadius={80}
              fill="#8884d8"
              dataKey="value"
            >
              {pizzaDataContato.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.cor} />
              ))}
            </Pie>
            <Tooltip />
            <Legend />
          </PieChart>
        </ResponsiveContainer>
      </div>

      {/* Gráfico de barras - Top clientes */}
      {clientesPorPedido.length > 0 && (
        <div style={{ ...styles.graficosContainer, backgroundColor: cores.card, borderColor: cores.borda }}>
          <h3 style={{ ...styles.graficoTitulo, color: cores.texto }}>🏆 Top 5 Clientes com Mais Pedidos</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={clientesPorPedido}>
              <XAxis dataKey="nome" stroke={cores.textoSecundario} />
              <YAxis stroke={cores.textoSecundario} />
              <Tooltip contentStyle={{ backgroundColor: cores.card, color: cores.texto }} />
              <Legend />
              <Bar dataKey="pedidos" fill={cores.destaque} name="Total de Pedidos" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
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
  fundo: '#f0f0f0',
  card: '#ffffff',
  texto: '#333',
  textoSecundario: '#666',
  borda: '#ddd',
  destaque: '#e2b96f'
};

const styles = {
  container: { padding: 16 },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, paddingTop: 20, flexWrap: 'wrap', gap: 10 },
  titulo: { fontSize: 24, margin: 0 },
  botaoVoltar: { border: 'none', borderRadius: 8, padding: '8px 16px', fontWeight: 'bold', cursor: 'pointer' },
  botaoTema: { border: 'none', borderRadius: 30, padding: '8px 12px', fontSize: 20, cursor: 'pointer' },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 16, marginBottom: 20 },
  card: { borderRadius: 12, padding: 20, textAlign: 'center', border: '1px solid' },
  numero: { fontSize: 36, fontWeight: 'bold', margin: 0 },
  label: { fontSize: 14, marginTop: 8 },
  graficosContainer: { borderRadius: 12, padding: 16, marginBottom: 20, border: '1px solid' },
  graficoTitulo: { fontSize: 18, marginBottom: 16, textAlign: 'center' }
};
