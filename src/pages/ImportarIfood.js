import React, { useState } from 'react';
import { collection, addDoc, query, where, getDocs } from 'firebase/firestore';
import { db } from '../firebase';
import { useTema } from '../ThemeContext';

export default function ImportarIfood({ onVoltar }) {
  const [dadosCsv, setDadosCsv] = useState('');
  const [importando, setImportando] = useState(false);
  const [resultado, setResultado] = useState(null);
  const { temaEscuro } = useTema();

  function parseIfoodCsv(texto) {
    const linhas = texto.split('\n');
    
    const clientes = [];
    
    for (let i = 0; i < linhas.length; i++) {
      const linha = linhas[i].trim();
      if (!linha) continue;
      
      let colunas = linha.split(',');
      if (colunas.length < 2) {
        colunas = linha.split(';');
      }
      if (colunas.length < 2) {
        colunas = linha.split('\t');
      }
      
      const cliente = {
        nome: colunas[0]?.trim() || `Cliente ${i + 1}`,
        telefone: colunas[1]?.trim() || '',
        endereco: colunas[2]?.trim() || '',
        apt: '',
        codigoEntrega: `IF${String(Math.floor(Math.random() * 10000)).padStart(4, '0')}`,
        qtdPedidos: 1,
        observacoes: 'Importado do iFood',
        fixado: false,
        aguardandoProduto: '',
      };
      
      if (cliente.nome && cliente.nome !== '') {
        clientes.push(cliente);
      }
    }
    
    return clientes;
  }

  async function importarClientes() {
    if (!dadosCsv.trim()) {
      alert('Cole os dados do iFood primeiro!');
      return;
    }
    
    setImportando(true);
    setResultado(null);
    
    const clientes = parseIfoodCsv(dadosCsv);
    let importados = 0;
    let duplicados = 0;
    let erros = 0;
    
    for (const cliente of clientes) {
      try {
        const q = query(collection(db, 'clientes'), where('nome', '==', cliente.nome));
        const snap = await getDocs(q);
        
        if (snap.empty) {
          await addDoc(collection(db, 'clientes'), cliente);
          importados++;
        } else {
          duplicados++;
        }
      } catch (error) {
        erros++;
        console.error('Erro ao importar:', error);
      }
    }
    
    setResultado({ importados, duplicados, erros, total: clientes.length });
    setImportando(false);
  }

  const cores = temaEscuro ? coresEscuro : coresClaro;

  return (
    <div style={{ ...styles.container, backgroundColor: cores.fundo, minHeight: '100vh' }}>
      <div style={styles.header}>
        <h1 style={{ ...styles.titulo, color: cores.destaque }}>🍔 Importar do iFood</h1>
        <button style={{ ...styles.botaoVoltar, backgroundColor: cores.card, color: cores.destaque }} onClick={onVoltar}>
          ← Voltar
        </button>
      </div>

      <div style={{ ...styles.card, backgroundColor: cores.card, borderColor: cores.borda }}>
        <h3 style={{ color: cores.texto }}>📋 Como exportar do iFood:</h3>
        <ol style={{ color: cores.textoSecundario }}>
          <li>Acesse o <strong>iFood para Parceiros</strong> (painel do restaurante)</li>
          <li>Vá em <strong>Relatórios → Pedidos</strong></li>
          <li>Selecione o período desejado</li>
          <li>Clique em <strong>Exportar CSV</strong></li>
          <li>Copie as colunas: <strong>Nome, Telefone, Endereço</strong></li>
          <li>Cole abaixo no formato: <strong>Nome,Telefone,Endereço</strong></li>
        </ol>
      </div>

      <div style={{ ...styles.card, backgroundColor: cores.card, borderColor: cores.borda }}>
        <label style={{ color: cores.texto, fontWeight: 'bold' }}>📋 Cole os dados do CSV:</label>
        <textarea
          style={{ ...styles.textarea, backgroundColor: cores.card, color: cores.texto, borderColor: cores.borda }}
          rows={8}
          placeholder="Exemplo:&#10;João Silva,11999999999,Rua das Flores 123&#10;Maria Santos,11888888888,Av. Paulista 1000"
          value={dadosCsv}
          onChange={e => setDadosCsv(e.target.value)}
        />
        <button 
          style={{ ...styles.botaoImportar, backgroundColor: cores.destaque, color: cores.fundo }}
          onClick={importarClientes}
          disabled={importando}
        >
          {importando ? '⏳ Importando...' : '🍔 Importar do iFood'}
        </button>
      </div>

      {resultado && (
        <div style={{ ...styles.resultado, backgroundColor: cores.card, borderColor: cores.borda }}>
          <h3 style={{ color: cores.destaque }}>✅ Resultado da importação:</h3>
          <p style={{ color: cores.texto }}>📦 Total no arquivo: {resultado.total}</p>
          <p style={{ color: '#27ae60' }}>➕ Importados: {resultado.importados}</p>
          <p style={{ color: '#e67e22' }}>⚠️ Duplicados: {resultado.duplicados}</p>
          {resultado.erros > 0 && <p style={{ color: '#e74c3c' }}>❌ Erros: {resultado.erros}</p>}
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
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, flexWrap: 'wrap', gap: 10 },
  titulo: { fontSize: 24, margin: 0 },
  botaoVoltar: { border: 'none', borderRadius: 8, padding: '8px 16px', fontWeight: 'bold', cursor: 'pointer' },
  card: { borderRadius: 12, padding: 16, marginBottom: 16, border: '1px solid' },
  textarea: { width: '100%', border: '1px solid', borderRadius: 8, padding: 12, fontSize: 14, fontFamily: 'monospace', marginTop: 8, marginBottom: 12, boxSizing: 'border-box' },
  botaoImportar: { border: 'none', borderRadius: 8, padding: '12px 20px', fontWeight: 'bold', cursor: 'pointer', width: '100%' },
  resultado: { borderRadius: 12, padding: 16, marginBottom: 16, border: '1px solid' }
};
