import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { LOGO_SMALL } from '../config';

interface TopNavProps {
  options: { label: string; path: string }[];
  activePath: string;
}

export function TopNav({ options, activePath }: TopNavProps) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  if (!user) return null;

  return (
    <div>
      <div className="fc-topbar">
        <img src={LOGO_SMALL} width={56} height={56} alt="Farma Consulta" />
        <div className="fc-user-info" style={{ flex: 1 }}>
          <h3>{user.nome}</h3>
          <span>{user.tipo.replace('_', ' ')}</span>
        </div>
        <button
          className="fc-button secondary"
          style={{ width: 'auto', padding: '0.6rem 1.2rem' }}
          onClick={() => {
            logout();
            navigate('/');
          }}
        >
          Sair
        </button>
      </div>

      <div className="fc-nav">
        {options.map((opt) => (
          <button
            key={opt.path}
            className={activePath === opt.path ? 'active' : ''}
            onClick={() => navigate(opt.path)}
          >
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  );
}
