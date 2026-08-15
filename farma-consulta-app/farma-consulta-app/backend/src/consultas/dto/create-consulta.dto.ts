import { IsDateString, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateConsultaDto {
  @IsNotEmpty()
  @IsString()
  farmaceuticoId: string;

  @IsDateString()
  data: string;

  @IsString()
  hora: string;

  @IsOptional()
  @IsString()
  observacoes?: string;
}
