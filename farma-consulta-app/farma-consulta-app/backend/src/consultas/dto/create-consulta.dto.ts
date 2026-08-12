import { IsDateString, IsOptional, IsString } from 'class-validator';

export class CreateConsultaDto {
  @IsDateString()
  data: string;

  @IsString()
  hora: string;

  @IsOptional()
  @IsString()
  observacoes?: string;
}
