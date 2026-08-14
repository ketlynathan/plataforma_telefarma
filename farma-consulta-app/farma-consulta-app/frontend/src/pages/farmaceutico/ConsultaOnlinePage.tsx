import { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { gerarSala, gerarTokenSala } from '../../utils/salaVideo';

export function ConsultaOnlinePage() {
  const { user } = useAuth();
  const [token] = useState(gerarTokenSala);
  const [roomName, setRoomName] = useState(
    user ? `${user.nome}-${token}` : `consulta-${token}`
  );

  const roomUrl = gerarSala(roomName);

  const handleEntrar = () => {
    window.open(roomUrl, '_blank', 'noopener,noreferrer');
  };

  return (
    <div>
      <h1>Consulta online</h1>
      <p>Abra a sala de video para conduzir um atendimento remoto com conforto.</p>

      <div className="fc-field" style={{ maxWidth: 420 }}>
        <label>Nome da sala</label>
        <input className="fc-input" value={roomName} onChange={(e) => setRoomName(e.target.value)} />
      </div>

      <p style={{ color: 'var(--primary-color)', fontSize: '0.9rem' }}>Sala gerada: {roomUrl}</p>

      <button className="fc-button primary" style={{ width: 'auto', padding: '0.6rem 1.2rem' }} onClick={handleEntrar}>
        Entrar na consulta (abre em nova aba)
      </button>
    </div>
  );
}