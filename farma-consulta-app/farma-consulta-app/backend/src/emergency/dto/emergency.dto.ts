import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class EncerrarEmergenciaDto {
  @IsNotEmpty()
  @IsString()
  status: 'ENCERRADA' | 'CANCELADA' | 'EXPIRADA';

  @IsOptional()
  @IsString()
  motivoEncerramento?: string;
}
