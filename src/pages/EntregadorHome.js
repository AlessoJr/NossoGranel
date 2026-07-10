import React, { useEffect, useState, useRef } from 'react';
import Chat from './Chat';
import { getClientesRealtime, getRotasRealtime, criarRota, concluirRota, atualizarLocalizacao, criarNotificacao } from '../services/firebaseService';
import { doc, updateDoc, getDoc } from 'firebase/firestore';
import { db, storage } from '../firebase';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import ProfileMenu from '../components/ProfileMenu';
import { useTheme, getTheme } from '../contexts/ThemeContext';
import { toast } from 'react-toastify';

function abrirGPS(endereco, apt) {
  const end = `${endereco}${apt ? ` ${apt}` : ''}`;
  window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(end)}`, '_blank');
}

function abrirRotaOtimizada(rotas) {
  if (rotas.length === 0) return;
  const enderecos = rotas.map(r => `${r.clienteEndereco}${r.clienteApt ? ` ${r.clienteApt}` : ''}`);
  const destino = encodeURIComponent(enderecos[enderecos.length - 1]);
  const waypoints = enderecos.slice(0, -1).map(e => encodeURIComponent(e)).join('|');
  const url = waypoints
    ? `https://www.google.com/maps/dir/?api=1&destination=${destino}&waypoints=${waypoints}&travelmode=driving`
    : `https://www.google.com/maps/dir/?api=1&destination=${destino}&travelmode=driving`;
  window.open(url, '_blank');
}

// Distância entre dois pontos (Haversine)
function distancia(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon/2) * Math.sin(dLon/2);
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
}

// Algoritmo do vizinho mais próximo
function otimizarRota(rotas, latAtual, lngAtual) {
  if (rotas.length <= 1) return rotas;
  const rotasComCoord = rotas.filter(r => r.lat && r.lng);
  const rotasSemCoord = rotas.filter(r => !r.lat || !r.lng);
  if (rotasComCoord.length <= 1) return rotas;

  const resultado = [];
  let restantes = [...rotasComCoord];
  let latAtl = latAtual;
  let lngAtl = lngAtual;

  while (restantes.length > 0) {
    let maisProximo = restantes[0];
    let menorDist = distancia(latAtl, lngAtl, maisProximo.lat, maisProximo.lng);
    for (const r of restantes) {
      const d = distancia(latAtl, lngAtl, r.lat, r.lng);
      if (d < menorDist) { menorDist = d; maisProximo = r; }
    }
    resultado.push(maisProximo);
    latAtl = maisProximo.lat;
    lngAtl = maisProximo.lng;
    restantes = restantes.filter(r => r.id !== maisProximo.id);
  }

  return [...resultado, ...rotasSemCoord];
}

const NOTIFICACOES_VISTAS_KEY = 'entregador_notificacoes_vistas';

export default function EntregadorHome({ usuario, onLogout, onNavigate: onNavigateApp }) {
  const { darkMode, toggleTheme } = useTheme();
  const cores = getTheme(darkMode);
  const [clientes, setClientes] = useState([]);
  const [rotas, setRotas] = useState([]);
  const [busca, setBusca] = useState('');
  const [aba, setAba] = useState('rotas');
  const [posAtual, setPosAtual] = useState(null);
  const [rotasOtimizadas, setRotasOtimizadas] = useState(null);
  const [otimizando, setOtimizando] = useState(false);
  const [showChat, setShowChat] = useState(false);
  const [status, setStatus] = useState('disponivel');
  const [showObservacao, setShowObservacao] = useState(null);
  const [observacao, setObservacao] = useState('');
  const [showEditarPerfil, setShowEditarPerfil] = useState(false);
  const [novoTelefone, setNovoTelefone] = useState(usuario?.telefone || '');
  const [novaFoto, setNovaFoto] = useState(null);
  const [salvandoPerfil, setSalvandoPerfil] = useState(false);
  const watchIdRef = useRef(null);

  const getNotificacoesVistas = () => {
    const saved = sessionStorage.getItem(NOTIFICACOES_VISTAS_KEY);
    return saved ? new Set(JSON.parse(saved)) : new Set();
  };

  const salvarNotificacoesVistas = (set) => {
    sessionStorage.setItem(NOTIFICACOES_VISTAS_KEY, JSON.stringify([...set]));
  };

  useEffect(() => {
    const unsubClientes = getClientesRealtime(setClientes);
    const unsubRotas = getRotasRealtime((novasRotas) => {
      const notificadas = getNotificacoesVistas();
      let atualizado = false;
      novasRotas.forEach(r => {
        const idAtribuida = `adm_${r.id}`;
        if (r.entregador === usuario.nome && r.criadoPor === 'adm' && r.status === 'em_andamento' && !notificadas.has(idAtribuida)) {
          notificadas.add(idAtribuida);
          atualizado = true;
          toast.info(`🔔 ADM atribuiu: ${r.clienteNome}`);
        }
      });
      if (atualizado) salvarNotificacoesVistas(notificadas);
      setRotas(novasRotas);
      setRotasOtimizadas(null);
    });

    if (navigator.geolocation) {
      watchIdRef.current = navigator.geolocation.watchPosition(
        (pos) => {
          setPosAtual({ lat: pos.coords.latitude, lng: pos.coords.longitude });
          atualizarLocalizacao(usuario.nome, pos.coords.latitude, pos.coords.longitude);
        },
        (err) => console.log('GPS erro:', err),
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 5000 }
      );
    }

    return () => {
      unsubClientes();
      unsubRotas();
      if (watchIdRef.current) navigator.geolocation.clearWatch(watchIdRef.current);
    };
  }, [usuario.nome]);

  const atualizarStatus = async (novoStatus) => {
    setStatus(novoStatus);
    try {
      if (usuario?.uid) {
        await updateDoc(doc(db, 'usuarios', usuario.uid), { status: novoStatus });
      }
    } catch (e) { console.log('erro status', e); }
  };

  const handleSalvarPerfil = async () => {
    setSalvandoPerfil(true);
    try {
      const dados = { telefone: novoTelefone };
      if (novaFoto && usuario?.uid) {
        const fotoRef = ref(storage, `perfis/${usuario.uid}`);
        await uploadBytes(fotoRef, novaFoto);
        dados.fotoURL = await getDownloadURL(fotoRef);
      }
      if (usuario?.uid) await updateDoc(doc(db, 'usuarios', usuario.uid), dados);
      toast.success('Perfil atualizado!');
      setShowEditarPerfil(false);
    } catch (e) {
      toast.error('Erro ao salvar perfil');
    } finally {
      setSalvandoPerfil(false);
    }
  };

  const handleAtivarRota = async (cliente) => {
    await criarRota(cliente, usuario.nome, 'entregador');
    await criarNotificacao(
      '🔔 Rota ativada',
      `${usuario.nome} ativou rota para ${cliente.nome}`,
      'rota_ativada',
      'admin'
    );
    toast.success(`Rota ativada para ${cliente.nome}!`);
    setAba('rotas');
  };

  const handleConcluirRota = async (rota) => {
    setShowObservacao(rota);
    setObservacao('');
  };

  const confirmarConclusao = async () => {
    const rota = showObservacao;
    if (!rota) return;
    await concluirRota(rota.id);
    if (observacao.trim()) {
      await updateDoc(doc(db, 'rotas', rota.id), { observacao: observacao.trim() });
    }
    await criarNotificacao(
      '✅ Entrega concluída',
      `${usuario.nome} entregou para ${rota.clienteNome} — Código: ${rota.codigoEntrega}${observacao ? ' — ' + observacao : ''}`,
      'entrega_concluida',
      'admin'
    );
    toast.success(`✅ Entrega de ${rota.clienteNome} concluída!`);
    setShowObservacao(null);
    setObservacao('');
  };

  const handleOtimizarRota = async () => {
    if (minhasRotas.length < 2) { toast.warning('Precisa de pelo menos 2 rotas para otimizar!'); return; }
    setOtimizando(true);
    toast.info('Calculando melhor rota...');

    try {
      // Geocodifica endereços sem coordenadas
      const rotasComCoord = await Promise.all(minhasRotas.map(async (r) => {
        if (r.lat && r.lng) return r;
        try {
          const end = `${r.clienteEndereco}${r.clienteApt ? ` ${r.clienteApt}` : ''}`;
          const resp = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(end)}&limit=1`);
          const data = await resp.json();
          if (data.length > 0) return { ...r, lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
        } catch {}
        return r;
      }));

      const lat = posAtual?.lat || -8.0476;
      const lng = posAtual?.lng || -34.8770;
      const otimizadas = otimizarRota(rotasComCoord, lat, lng);
      setRotasOtimizadas(otimizadas);
      toast.success('Rota otimizada! 🗺️');
    } catch (e) {
      toast.error('Erro ao otimizar rota');
    } finally {
      setOtimizando(false);
    }
  };

  const minhasRotas = rotas.filter(r => r.entregador === usuario.nome && r.status === 'em_andamento');
  const minhasConcluidas = rotas.filter(r => r.entregador === usuario.nome && r.status === 'concluida').sort((a, b) => new Date(b.concluidoEm) - new Date(a.concluidoEm));
  const rotasExibidas = rotasOtimizadas || minhasRotas;

  const clientesFiltrados = clientes.filter(c =>
    (c.nome ?? '').toLowerCase().includes(busca.toLowerCase()) ||
    (c.codigoEntrega ?? '').includes(busca)
  );

  const perfilEntregador = { nome: usuario.nome, tipo: 'entregador' };
  if (showChat) return <Chat usuario={usuario} onVoltar={() => setShowChat(false)} />;
  const handleNavigate = (pagina) => {
    if (pagina === 'chat') setShowChat(true);
    else if (pagina === 'notificacoes') { if (onNavigateApp) onNavigateApp('notificacoes'); }
    else setAba(pagina);
  };

  const corStatus = status === 'disponivel' ? cores.success : status === 'em_rota' ? cores.primary : cores.warning;
  const labelStatus = status === 'disponivel' ? '🟢 Disponível' : status === 'em_rota' ? '🚚 Em Rota' : '⏸️ Pausado';

  if (showEditarPerfil) return (
    <div style={{ ...styles.container, backgroundColor: cores.background }}>
      <div style={styles.header}>
        <h2 style={{ color: cores.primary, margin: 0 }}>✏️ Editar Perfil</h2>
        <button style={{ backgroundColor: cores.card, color: cores.text, border: 'none', borderRadius: 8, padding: '8px 16px', fontWeight: 'bold', cursor: 'pointer' }} onClick={() => setShowEditarPerfil(false)}>← Voltar</button>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16, padding: 16 }}>
        <div style={{ width: 90, height: 90, borderRadius: '50%', backgroundColor: cores.cardBorder, overflow: 'hidden', border: `3px solid ${cores.primary}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          onClick={() => document.getElementById('fotoInput').click()}>
          {novaFoto
            ? <img src={URL.createObjectURL(novaFoto)} alt="nova foto" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            : usuario?.fotoURL
              ? <img src={usuario.fotoURL} alt="foto" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              : <span style={{ fontSize: 36 }}>👤</span>
          }
        </div>
        <input id="fotoInput" type="file" accept="image/*" style={{ display: 'none' }} onChange={e => setNovaFoto(e.target.files[0])} />
        <button style={{ backgroundColor: cores.cardBorder, color: cores.text, border: 'none', borderRadius: 8, padding: '8px 16px', cursor: 'pointer', fontSize: 13 }}
          onClick={() => document.getElementById('fotoInput').click()}>📷 Trocar foto</button>
        <div style={{ width: '100%', maxWidth: 400 }}>
          <label style={{ color: cores.textSecondary, fontSize: 13 }}>Telefone</label>
          <input style={{ width: '100%', border: `1px solid ${cores.cardBorder}`, borderRadius: 10, padding: 12, fontSize: 15, backgroundColor: cores.card, color: cores.text, boxSizing: 'border-box', marginTop: 4 }}
            value={novoTelefone} onChange={e => setNovoTelefone(e.target.value)} placeholder="Seu telefone" />
        </div>
        <button style={{ width: '100%', maxWidth: 400, backgroundColor: cores.primary, color: cores.background, border: 'none', borderRadius: 10, padding: 14, fontSize: 16, fontWeight: 'bold', cursor: 'pointer', opacity: salvandoPerfil ? 0.7 : 1 }}
          onClick={handleSalvarPerfil} disabled={salvandoPerfil}>
          {salvandoPerfil ? 'Salvando...' : '💾 Salvar'}
        </button>
      </div>
    </div>
  );

  return (
    <div style={{ ...styles.container, backgroundColor: cores.background }}>
      {/* Modal de observação ao concluir */}
      {showObservacao && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.7)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <div style={{ backgroundColor: cores.card, borderRadius: 16, padding: 24, width: '100%', maxWidth: 400 }}>
            <h3 style={{ color: cores.primary, margin: '0 0 8px' }}>✅ Concluir entrega</h3>
            <p style={{ color: cores.text, margin: '0 0 16px', fontSize: 14 }}>Cliente: <strong>{showObservacao.clienteNome}</strong></p>
            <textarea
              style={{ width: '100%', border: `1px solid ${cores.cardBorder}`, borderRadius: 10, padding: 12, fontSize: 14, backgroundColor: cores.background, color: cores.text, fontFamily: 'inherit', resize: 'none', boxSizing: 'border-box' }}
              placeholder="Observação (opcional): ex: deixei com porteiro, cliente não estava..."
              rows={3}
              value={observacao}
              onChange={e => setObservacao(e.target.value)}
            />
            <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
              <button style={{ flex: 1, backgroundColor: cores.success, color: '#fff', border: 'none', borderRadius: 10, padding: 12, fontWeight: 'bold', cursor: 'pointer' }}
                onClick={confirmarConclusao}>✅ Confirmar</button>
              <button style={{ flex: 1, backgroundColor: cores.cardBorder, color: cores.text, border: 'none', borderRadius: 10, padding: 12, fontWeight: 'bold', cursor: 'pointer' }}
                onClick={() => setShowObservacao(null)}>Cancelar</button>
            </div>
          </div>
        </div>
      )}

      <div style={styles.header}>
        <div>
          <h1 style={{ ...styles.titulo, color: cores.primary, margin: 0 }}>🚚 {usuario.nome}</h1>
          <div style={{ display: 'flex', gap: 6, marginTop: 6 }}>
            {['disponivel', 'em_rota', 'pausado'].map(s => (
              <button key={s} onClick={() => atualizarStatus(s)}
                style={{ border: 'none', borderRadius: 20, padding: '4px 10px', fontSize: 11, fontWeight: 'bold', cursor: 'pointer',
                  backgroundColor: status === s ? corStatus : cores.cardBorder,
                  color: status === s ? '#fff' : cores.textSecondary }}>
                {s === 'disponivel' ? '🟢' : s === 'em_rota' ? '🚚' : '⏸️'}
              </button>
            ))}
            <button onClick={() => setShowEditarPerfil(true)}
              style={{ border: 'none', borderRadius: 20, padding: '4px 10px', fontSize: 11, cursor: 'pointer', backgroundColor: cores.cardBorder, color: cores.textSecondary }}>
              ✏️ Perfil
            </button>
          </div>
        </div>
        <ProfileMenu usuario={perfilEntregador} onLogout={onLogout} toggleTheme={toggleTheme} onNavigate={handleNavigate} />
      </div>

      {aba === 'clientes' && (
        <>
          <input style={{ ...styles.busca, backgroundColor: cores.card, color: cores.text, borderColor: cores.cardBorder }} placeholder="Buscar cliente..." value={busca} onChange={e => setBusca(e.target.value)} />
          {clientesFiltrados.map(c => {
            const rotaAtiva = minhasRotas.some(r => r.clienteId === c.id);
            return (
              <div key={c.id} style={{ ...styles.card, backgroundColor: cores.card, borderColor: rotaAtiva ? cores.success : cores.cardBorder, borderWidth: rotaAtiva ? 2 : 1 }}>
                <div style={{ flex: 1 }}>
                  <p style={{ ...styles.nome, color: cores.primary }}>{c.nome}</p>
                  <p style={{ ...styles.info, color: cores.text }}>📍 {c.endereco}{c.apt ? `, Apt ${c.apt}` : ''}</p>
                  <p style={{ ...styles.info, color: cores.text }}>📞 {c.telefone}</p>
                  <p style={{ ...styles.info, color: cores.text }}>🔑 {c.codigoEntrega}</p>
                </div>
                <button style={{ ...styles.botaoAtivar, backgroundColor: cores.primary, color: cores.background }} onClick={() => handleAtivarRota(c)}>🚚 Ativar</button>
              </div>
            );
          })}
        </>
      )}

      {aba === 'rotas' && (
        <>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <h3 style={{ color: cores.primary, margin: 0 }}>🚚 Em Andamento ({minhasRotas.length})</h3>
            <div style={{ display: 'flex', gap: 8 }}>
              {rotasOtimizadas && (
                <button style={{ ...styles.botaoGPS, backgroundColor: cores.info, color: '#fff', fontSize: 12 }}
                  onClick={() => abrirRotaOtimizada(rotasExibidas)}>
                  🗺️ Abrir GPS
                </button>
              )}
              {minhasRotas.length >= 2 && (
                <button style={{ ...styles.botaoOtimizar, backgroundColor: otimizando ? '#888' : cores.warning, color: '#fff' }}
                  onClick={handleOtimizarRota} disabled={otimizando}>
                  {otimizando ? '⏳' : '✨ Otimizar'}
                </button>
              )}
            </div>
          </div>

          {rotasOtimizadas && (
            <div style={{ backgroundColor: cores.card, borderRadius: 8, padding: '8px 12px', marginBottom: 12, border: `1px solid ${cores.success}` }}>
              <p style={{ color: cores.success, fontSize: 12, margin: 0 }}>✅ Rota otimizada — ordem pelo caminho mais curto</p>
            </div>
          )}

          {minhasRotas.length === 0 && <p style={{ color: cores.textSecondary, textAlign: 'center' }}>Nenhuma rota em andamento.</p>}
          {rotasExibidas.map((r, i) => (
            <div key={r.id} style={{ ...styles.cardRota, backgroundColor: cores.card, borderColor: cores.primary }}>
              {rotasOtimizadas && (
                <p style={{ color: cores.warning, fontSize: 11, margin: '0 0 6px', fontWeight: 'bold' }}>📍 Parada {i + 1}</p>
              )}
              <p style={{ ...styles.info, color: cores.text }}>
                <strong style={{ color: cores.primary }}>{r.clienteNome}</strong>
                {r.criadoPor === 'adm' && <span style={{ fontSize: 11, color: cores.primary }}> (ADM)</span>}
              </p>
              <p style={{ ...styles.info, color: cores.text }}>📍 {r.clienteEndereco}{r.clienteApt ? `, Apt ${r.clienteApt}` : ''}</p>
              <p style={{ ...styles.info, color: cores.text }}>📞 {r.clienteTelefone}</p>
              <p style={{ ...styles.info, color: cores.text }}>🔑 <strong style={{ fontSize: 20, color: cores.primary }}>{r.codigoEntrega}</strong></p>
              <div style={{ display: 'flex', gap: 8, marginTop: 12, flexWrap: 'wrap' }}>
                <button style={{ ...styles.botaoGPS, backgroundColor: cores.info, color: '#fff' }} onClick={() => abrirGPS(r.clienteEndereco, r.clienteApt)}>📍 GPS</button>
                <button style={{ ...styles.botaoConcluir, backgroundColor: cores.success, color: '#fff' }} onClick={() => handleConcluirRota(r)}>✅ Concluir</button>
                <button style={{ ...styles.botaoConcluir, backgroundColor: cores.warning, color: '#fff' }} onClick={async () => {
                  if (!window.confirm('Reagendar entrega de ' + r.clienteNome + '?')) return;
                  await updateDoc(doc(db, 'rotas', r.id), { reagendado: true, reagendadoEm: new Date().toISOString() });
                  await criarNotificacao('🔄 Entrega reagendada', r.clienteNome + ' — ' + usuario.nome + ' sinalizou reagendamento', 'reagendamento', 'admin');
                  toast.info('Entrega de ' + r.clienteNome + ' marcada para reagendamento');
                }}>🔄 Reagendar</button>
              </div>
            </div>
          ))}
        </>
      )}

      {aba === 'concluidas' && (
        <>
          <h3 style={{ color: cores.primary }}>✅ Concluídas ({minhasConcluidas.length})</h3>
          {minhasConcluidas.map(r => (
            <div key={r.id} style={{ ...styles.cardConcluido, backgroundColor: cores.card, borderColor: cores.success }}>
              <p style={{ ...styles.info, color: cores.primary, fontWeight: 'bold' }}>{r.clienteNome}</p>
              <p style={{ ...styles.info, color: cores.text }}>🔑 {r.codigoEntrega}</p>
              <p style={{ ...styles.info, color: cores.success }}>✅ {new Date(r.concluidoEm).toLocaleString()}</p>
            </div>
          ))}
        </>
      )}
    </div>
  );
}

const styles = {
  container: { minHeight: '100vh', padding: 16 },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 10 },
  titulo: { fontSize: 24, margin: 0 },
  busca: { width: '100%', border: '1px solid', borderRadius: 10, padding: 12, marginBottom: 12 },
  card: { borderRadius: 12, padding: 14, marginBottom: 10, display: 'flex', justifyContent: 'space-between', alignItems: 'center', border: '1px solid' },
  cardRota: { borderRadius: 12, padding: 14, marginBottom: 10, border: '2px solid' },
  cardConcluido: { borderRadius: 12, padding: 14, marginBottom: 10, border: '2px solid' },
  nome: { fontWeight: 'bold', fontSize: 16, margin: 0 },
  info: { fontSize: 13, margin: '2px 0' },
  botaoAtivar: { border: 'none', borderRadius: 8, padding: '8px 16px', fontWeight: 'bold', cursor: 'pointer' },
  botaoOtimizar: { border: 'none', borderRadius: 8, padding: '8px 12px', fontWeight: 'bold', cursor: 'pointer', fontSize: 13 },
  botaoGPS: { flex: 1, border: 'none', borderRadius: 8, padding: '10px', cursor: 'pointer', textAlign: 'center' },
  botaoConcluir: { flex: 1, border: 'none', borderRadius: 8, padding: '10px', cursor: 'pointer', textAlign: 'center' }
};
