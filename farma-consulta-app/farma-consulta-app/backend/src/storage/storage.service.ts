import { GetObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { Injectable, ServiceUnavailableException } from '@nestjs/common';

@Injectable()
export class StorageService {
  private readonly bucket = process.env.S3_BUCKET?.trim();
  private readonly client = new S3Client({
    region: process.env.S3_REGION?.trim() || 'auto',
    endpoint: process.env.S3_ENDPOINT?.trim() || undefined,
    forcePathStyle: process.env.S3_FORCE_PATH_STYLE === 'true',
    credentials: process.env.S3_ACCESS_KEY_ID && process.env.S3_SECRET_ACCESS_KEY
      ? {
          accessKeyId: process.env.S3_ACCESS_KEY_ID,
          secretAccessKey: process.env.S3_SECRET_ACCESS_KEY,
        }
      : undefined,
  });

  isConfigured() {
    return Boolean(this.bucket && process.env.S3_ACCESS_KEY_ID && process.env.S3_SECRET_ACCESS_KEY);
  }

  private ensureConfigured() {
    if (!this.isConfigured()) {
      throw new ServiceUnavailableException('O armazenamento seguro de documentos ainda não foi configurado.');
    }
    return this.bucket as string;
  }

  async put(key: string, body: Buffer, contentType: string) {
    const bucket = this.ensureConfigured();
    await this.client.send(new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: body,
      ContentType: contentType,
      ServerSideEncryption: (process.env.S3_SERVER_SIDE_ENCRYPTION?.trim() as any) || undefined,
    }));
    return { key };
  }

  async get(key: string) {
    const bucket = this.ensureConfigured();
    const response = await this.client.send(new GetObjectCommand({ Bucket: bucket, Key: key }));
    if (!response.Body) throw new Error('Arquivo não encontrado no armazenamento.');
    const bytes = await (response.Body as any).transformToByteArray();
    return {
      body: Buffer.from(bytes),
      contentType: response.ContentType || 'application/octet-stream',
      contentLength: response.ContentLength,
    };
  }
}
