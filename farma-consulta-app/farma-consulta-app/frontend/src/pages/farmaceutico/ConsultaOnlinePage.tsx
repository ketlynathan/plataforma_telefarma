import { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { gerarSala } from '../../utils/salaVideo';

export function ConsultaOnlinePage() {
  const { user } = useAuth();
  const [roomName, setRoomName] = useState(user ? `${user.nome}-sala` : 'consulta-online');
  const [entrou, setEntrou] = useState(false);

  const roomUrl = gerarSala(roomName);

  return (
    <div>
      <h1>Consulta online</h1>
      <p>Abra a sala de video para conduzir um atendimento remoto com conforto.</p>

      <div className="fc-field" style={{ maxWidth: 420 }}>
        <label>Nome da sala</label>
        <input className="fc-input" value={roomName} onChange={(e) => setRoomName(e.target.value)} />
      </div>

      <p style={{ color: 'var(--primary-color)', fontSize: '0.9rem' }}>Sala gerada: {roomUrl}</p>

      <button className="fc-button primary" style={{ width: 'auto', padding: '0.6rem 1.2rem' }} onClick={() => setEntrou(true)}>
        Entrar na consulta
      </button>

      {entrou && (
        <div style={{ marginTop: '1rem' }}>
          <iframe src={roomUrl} width="100%" height={600} style={{ border: 0, borderRadius: 12 }} allow="camera; microphone; fullscreen" />
        </div>
      )}
    </div>
  );
}
