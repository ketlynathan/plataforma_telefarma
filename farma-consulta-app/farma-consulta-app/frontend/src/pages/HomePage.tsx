import { useNavigate } from 'react-router-dom';
import { LOGO_FULL } from '../config';

const BENEFICIOS = [
  ['Conveniencia', 'Consulte de qualquer lugar, sem necessidade de deslocamento'],
  ['Acompanhamento de Doencas Cronicas', 'Monitoramento frequente e ajustado as suas necessidades'],
  ['Orientacao Especializada', 'Esclarecimento de duvidas sobre medicamentos e prescricoes'],
  ['Privacidade Garantida', 'Dados protegidos conforme a Lei Geral de Protecao de Dados'],
  ['Acesso Ampliado', 'Cuidados farmaceuticos em areas rurais e comunidades carentes'],
  ['Reducao de Custos', 'Elimina custos de deslocamento e oferece precos acessiveis'],
];

export function HomePage() {
  const navigate = useNavigate();

  return (
    <div className="fc-shell">
      <div className="fc-card" style={{ textAlign: 'center', marginBottom: '2rem' }}>
        <img src={LOGO_FULL} alt="Farma Consulta" style={{ maxWidth: 320, width: '100%' }} />
        <h1>Teleconsulta Farmaceutica ao Seu Alcance</h1>
        <p>
          Conecte-se com farmaceuticos qualificados para orientacoes personalizadas sobre
          medicamentos e saude, de forma segura e conveniente.
        </p>
        <div className="fc-grid-2" style={{ maxWidth: 420, margin: '1rem auto 0' }}>
          <button className="fc-button primary" onClick={() => navigate('/login')}>
            Agendar Teleconsulta
          </button>
          <button className="fc-button secondary" onClick={() => navigate('/login')}>
            Entrar
          </button>
        </div>
      </div>

      <h2>Beneficios da Teleconsulta Farmaceutica</h2>
      <div className="fc-grid-3">
        {BENEFICIOS.map(([titulo, texto]) => (
          <div className="fc-panel" key={titulo}>
            <h4>{titulo}</h4>
            <p>{texto}</p>
          </div>
        ))}
      </div>

      <footer style={{ marginTop: '2rem', paddingTop: '1rem', borderTop: '1px solid rgba(0,0,0,0.08)' }}>
        <p>© 2026 Farma Consulta. Conforme Resolucao CFF no 727/2022 e LGPD.</p>
      </footer>
    </div>
  );
}
