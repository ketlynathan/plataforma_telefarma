import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';

export type VideoRoomSession = {
  provider: 'jaas' | 'meet-jitsi';
  domain: string;
  roomName: string;
  roomUrl: string;
  scriptUrl?: string;
  jwt?: string;
  expiresAt?: string;
};

type RoomUser = {
  id: string;
  nome?: string;
  email?: string;
};

function base64Url(value: string | Buffer): string {
  return Buffer.from(value).toString('base64url');
}

function normalizePrivateKey(value: string): string {
  return value.replace(/\\n/g, '\n').trim();
}

@Injectable()
export class JaasService {
  private readonly logger = new Logger(JaasService.name);

  constructor(private readonly config: ConfigService) {}

  createSession(roomSlug: string, user: RoomUser, moderator: boolean): VideoRoomSession {
    const appId = this.config.get<string>('JAAS_APP_ID')?.trim();
    const keyId = this.config.get<string>('JAAS_API_KEY_ID')?.trim();
    const privateKeyRaw = this.config.get<string>('JAAS_PRIVATE_KEY')?.trim();

    // Keep the current public Jitsi flow working during the staged rollout.
    // As soon as all three JaaS variables exist, sessions switch to signed JaaS JWTs.
    if (!appId && !keyId && !privateKeyRaw) {
      const roomUrl = `https://meet.jit.si/${roomSlug}`;
      return {
        provider: 'meet-jitsi',
        domain: 'meet.jit.si',
        roomName: roomSlug,
        roomUrl,
      };
    }

    if (!appId || !keyId || !privateKeyRaw) {
      this.logger.warn('JaaS parcialmente configurado; mantendo o provedor de transição até completar as três variáveis.');
      const roomUrl = `https://meet.jit.si/${roomSlug}`;
      return {
        provider: 'meet-jitsi',
        domain: 'meet.jit.si',
        roomName: roomSlug,
        roomUrl,
      };
    }

    const privateKey = normalizePrivateKey(privateKeyRaw);
    const now = Math.floor(Date.now() / 1000);
    const expiresAt = now + 60 * 60;
    const header = {
      alg: 'RS256',
      kid: keyId,
      typ: 'JWT',
    };
    const payload = {
      aud: 'jitsi',
      exp: expiresAt,
      nbf: now - 10,
      iss: 'chat',
      room: '*',
      sub: appId,
      context: {
        user: {
          id: user.id,
          name: user.nome ?? 'Usuário Farma Consulta',
          email: user.email ?? '',
          moderator,
        },
        features: {
          livestreaming: false,
          recording: false,
          transcription: false,
        },
      },
    };

    const encodedHeader = base64Url(JSON.stringify(header));
    const encodedPayload = base64Url(JSON.stringify(payload));
    const unsignedToken = `${encodedHeader}.${encodedPayload}`;

    let signature: string;
    try {
      signature = crypto
        .createSign('RSA-SHA256')
        .update(unsignedToken)
        .end()
        .sign(privateKey, 'base64url');
    } catch (error) {
      this.logger.error('JAAS_PRIVATE_KEY inválida ou incompatível com a API key cadastrada.', error instanceof Error ? error.stack : undefined);
      throw new ServiceUnavailableException('A configuração de vídeo está temporariamente indisponível.');
    }

    const jwt = `${unsignedToken}.${signature}`;
    const roomName = `${appId}/${roomSlug}`;
    const roomUrl = `https://8x8.vc/${roomName}`;

    return {
      provider: 'jaas',
      domain: '8x8.vc',
      roomName,
      roomUrl,
      scriptUrl: `https://8x8.vc/${appId}/external_api.js`,
      jwt,
      expiresAt: new Date(expiresAt * 1000).toISOString(),
    };
  }
}
