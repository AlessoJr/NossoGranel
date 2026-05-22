import React, { useState, useEffect } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../firebase';
import { useTema } from '../ThemeContext';

export default function RotaEntrega({ onVoltar }) {
  const [clientes, setClientes] = useState([]);
  const [clientesSelecionados, setClientesSelecionados] = useState([]);
  const [ordemRota, setOrdemRota] = useState([]);
  const { temaEscuro } = useTema();

  async function carregarClientes() {
    const snap = await getDocs(collection(db, 'clientes'));
    const lista = snap.docs
      .map(d => ({ id: d.id, ...d.data() }))
      .filter(c => c.endereco && c.endereco !== '')
      .map(c => ({
        id: c.id,
        nome: c.nome || 'Sem nome',
        endereco: c.endereco,
        apt: c.apt,
        telefone: c.telefone,
        observacoes: c.observacoes,
        selecionado: false
      }));
    setClientes(lista);
  }

  useEffect(() => { carregarClientes(); }, []);

  function toggleCliente(index) {
    const novos = [...clientes];
    novos[index].selecionado = !novos[index].selecionado;
    setClientes(novos);
    
    const selecionados = novos.filter(c => c.selecionado);
    setClientesSelecionados(selecionados);
  }

  function gerarRota() {
    setOrdemRota([...clientesSelecionados]);
  }

  function moverItem(index, direcao) {
    const novaOrdem = [...ordemRota];
    if (direcao === 'cima' && index > 0) {
      [novaOrdem[index], novaOrdem[index - 1]] = [novaOrdem[index - 1], novaOrdem[index]];
    } else if (direcao === 'baixo' && index < novaOrdem.length - 1) {
      [novaOrdem[index], novaOrdem[index + 1]] = [novaOrdem[index + 1], novaOrdem[index]];
    }
    setOrdemRota(novaOrdem);
  }

  function copiarRota() {
    let texto = "🗺️ ROTA DE ENTREGA\n\n";
    ordemRota.forEach((c, i) => {
      texto += `${i + 1}. ${c.nome}\n`;
      texto += `   📍 ${c.endereco}${c.apt ? `, Apt ${c.apt}` : ''}\n`;
      texto += `   📞 ${c.telefone || '---'}\n`;
      if (c.observacoes) texto += `   📝 ${c.observacoes}\n`;
      texto += `   🔑 Código: ${c.codigoEntrega || '---'}\n\n`;
    });
    navigator.clipboard.writeText(texto);
    alert('Rota copiada!');
  }

  const cores = temaEscuro ? coresEscuro : coresClaro;

  return (
    <div style={{ ...styles.container, backgroundColor: cores.fundo, minHeight: '100vh' }}>
      <div style={styles.header}>
        <h1 style={{ ...styles.titulo, color: cores.destaque }}>🗺️ Rota de Entrega</h1>
        <button style={{ ...styles.botaoVoltar, backgroundColor: cores.card, color: cores.destaque }} onClick={onVoltar}>
          ← Voltar
        </button>
      </div>

      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
        {/* Lista de clientes */}
        <div style={{ ...styles.painel, backgroundColor: cores.card, borderColor: cores.borda, flex: 1 }}>
          <h3 style={{ color: cores.texto }}>📋 Selecionar Clientes</h3>
          <div style={{ maxHeight: 400, overflowY: 'auto' }}>
            {clientes.map((c, idx) => (
              <div key={c.id} style={{ ...styles.itemCheck, borderBottomColor: cores.borda }}>
                <input 
                  type="checkbox" 
                  checked={c.selecionado} 
                  onChange={() => toggleCliente(idx)} 
                />
                <div>
                  <p style={{ color: cores.texto, margin: 0, fontWeight: 'bold' }}>{c.nome}</p>
                  <p style={{ color: cores.textoSecundario, margin: 0, fontSize: 12 }}>{c.endereco}</p>
                </div>
              </div>
            ))}
          </div>
          <button style={{ ...styles.botaoGerar, backgroundColor: cores.destaque, color: cores.fundo }} onClick={gerarRota}>
            🗺️ Gerar Rota
          </button>
        </div>

        {/* Rota gerada */}
        <div style={{ ...styles.painel, backgroundColor: cores.card, borderColor: cores.borda, flex: 1 }}>
          <h3 style={{ color: cores.texto }}>📍 Ordem da Rota</h3>
          {ordemRota.length === 0 ? (
            <p style={{ color: cores.textoSecundario }}>Nenhum cliente selecionado</p>
          ) : (
            <>
              {ordemRota.map((c, idx) => (
                <div key={idx} style={{ ...styles.itemRota, borderBottomColor: cores.borda }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ ...styles.numero, backgroundColor: cores.destaque, color: cores.fundo }}>{idx + 1}</span>
                    <div style={{ flex: 1 }}>
                      <p style={{ color: cores.texto, margin: 0, fontWeight: 'bold' }}>{c.nome}</p>
                      <p style={{ color: cores.textoSecundario, margin: 0, fontSize: 11 }}>{c.endereco}</p>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                      <button onClick={() => moverItem(idx, 'cima')} style={styles.botaoMovimento}>▲</button>
                      <button onClick={() => moverItem(idx, 'baixo')} style={styles.botaoMovimento}>▼</button>
                    </div>
                  </div>
                </div>
              ))}
              <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
                <button style={{ ...styles.botaoCopiar, backgroundColor: '#27ae60', color: '#fff' }} onClick={copiarRota}>
                  📋 Copiar Rota
                </button>
                <button style={{ ...styles.botaoLimpar, backgroundColor: '#e74c3c', color: '#fff' }} onClick={() => setOrdemRota([])}>
                  🗑️ Limpar
                </button>
              </div>
            </>
          )}
        </div>
      </div>
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
  painel: { borderRadius: 12, padding: 16, border: '1px solid', marginBottom: 16 },
  itemCheck: { display: 'flex', alignItems: 'center', gap: 12, padding: 10, borderBottom: '1px solid', cursor: 'pointer' },
  itemRota: { padding: 10, borderBottom: '1px solid', marginBottom: 8 },
  numero: { width: 28, height: 28, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: 14 },
  botaoGerar: { border: 'none', borderRadius: 8, padding: '10px 16px', fontWeight: 'bold', cursor: 'pointer', marginTop: 16, width: '100%' },
  botaoCopiar: { border: 'none', borderRadius: 8, padding: '8px 12px', fontWeight: 'bold', cursor: 'pointer', flex: 1 },
  botaoLimpar: { border: 'none', borderRadius: 8, padding: '8px 12px', fontWeight: 'bold', cursor: 'pointer', flex: 1 },
  botaoMovimento: { background: 'none', border: 'none', fontSize: 16, cursor: 'pointer', padding: '2px 6px' }
};
