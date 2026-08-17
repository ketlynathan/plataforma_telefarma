import { useEffect, useRef, useState } from 'react';
import type { VideoRoomSession } from '../types';

type JitsiApi = {
  addListener: (event: string, handler: () => void) => void;
  dispose: () => void;
};

type JitsiApiConstructor = new (domain: string, options: Record<string, unknown>) => JitsiApi;

declare global {
  interface Window {
    JitsiMeetExternalAPI?: JitsiApiConstructor;
  }
}

interface SalaVideoProps {
  session: VideoRoomSession;
  onJoined?: () => void;
  onClosed?: () => void;
}

function carregarScript(src: string): Promise<void> {
  const existente = document.querySelector<HTMLScriptElement>(`script[src="${src}"]`);
  if (existente) {
    if (window.JitsiMeetExternalAPI) return Promise.resolve();
    return new Promise((resolve, reject) => {
      existente.addEventListener('load', () => resolve(), { once: true });
      existente.addEventListener('error', () => reject(new Error('Não foi possível carregar o JaaS.')), { once: true });
    });
  }

  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = src;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Não foi possível carregar o JaaS.'));
    document.body.appendChild(script);
  });
}

export function SalaVideo({ session, onJoined, onClosed }: SalaVideoProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const apiRef = useRef<JitsiApi | null>(null);
  const onJoinedRef = useRef(onJoined);
  const onClosedRef = useRef(onClosed);
  const [erro, setErro] = useState('');

  useEffect(() => {
    onJoinedRef.current = onJoined;
    onClosedRef.current = onClosed;
  }, [onJoined, onClosed]);

  useEffect(() => {
    if (session.provider !== 'jaas' || !session.scriptUrl || !session.jwt || !containerRef.current) {
      return undefined;
    }

    let ativo = true;
    const container = containerRef.current;
    setErro('');

    carregarScript(session.scriptUrl)
      .then(() => {
        if (!ativo || !container || !window.JitsiMeetExternalAPI) return;
        const api = new window.JitsiMeetExternalAPI(session.domain, {
          roomName: session.roomName,
          jwt: session.jwt,
          parentNode: container,
          width: '100%',
          height: 420,
          userInfo: { displayName: 'Farma Consulta' },
          configOverwrite: {
            prejoinPageEnabled: false,
            disableDeepLinking: true,
          },
        });
        apiRef.current = api;
        api.addListener('videoConferenceJoined', () => onJoinedRef.current?.());
        api.addListener('readyToClose', () => onClosedRef.current?.());
      })
      .catch((error: unknown) => {
        if (ativo) setErro(error instanceof Error ? error.message : 'Não foi possível abrir a sala.');
      });

    return () => {
      ativo = false;
      apiRef.current?.dispose();
      apiRef.current = null;
    };
  }, [session.domain, session.jwt, session.provider, session.roomName, session.scriptUrl]);

  if (session.provider === 'meet-jitsi') {
    return (
      <iframe
        src={session.roomUrl}
        allow="camera; microphone; fullscreen; display-capture; autoplay"
        style={{ width: '100%', height: 420, border: 'none', borderRadius: 8 }}
        title="Sala de consulta"
      />
    );
  }

  return (
    <div>
      {erro && <div className="fc-alert error">{erro}</div>}
      <div ref={containerRef} style={{ width: '100%', minHeight: 420 }} />
    </div>
  );
}
