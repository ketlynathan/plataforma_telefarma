import { IsBoolean, IsDateString, IsIn, IsInt, IsNotEmpty, IsObject, IsOptional, IsString, MaxLength, Min, MinLength } from 'class-validator';

export class CreateEntryDto {
  @IsString()
  @IsNotEmpty()
  prontuarioId: string;

  @IsOptional()
  @IsString()
  consultaId?: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(160)
  assunto: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  tipo?: string;

  @IsString()
  @MinLength(3)
  conteudo: string;

  @IsOptional()
  @IsString()
  conduta?: string;

  @IsOptional()
  @IsString()
  orientacoes?: string;

  @IsOptional()
  @IsString()
  encaminhamento?: string;
}

export class UpdateEntryDto {
  @IsOptional()
  @IsString()
  @MaxLength(160)
  assunto?: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  tipo?: string;

  @IsOptional()
  @IsString()
  @MinLength(3)
  conteudo?: string;

  @IsOptional()
  @IsString()
  conduta?: string;

  @IsOptional()
  @IsString()
  orientacoes?: string;

  @IsOptional()
  @IsString()
  encaminhamento?: string;
}

export class CreateConsentimentoDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(80)
  tipo: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(40)
  versaoDocumento: string;

  @IsString()
  @IsNotEmpty()
  finalidade: string;

  @IsBoolean()
  aceito: boolean;
}

export class CreateProtocolDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(160)
  nome: string;

  @IsOptional()
  @IsString()
  descricao?: string;

  @IsObject()
  camposJson: Record<string, unknown>;
}

export class UpdateProtocolDto {
  @IsOptional()
  @IsString()
  @MaxLength(160)
  nome?: string;

  @IsOptional()
  @IsString()
  descricao?: string;

  @IsOptional()
  @IsBoolean()
  ativo?: boolean;

  @IsOptional()
  @IsObject()
  camposJson?: Record<string, unknown>;
}

export class ListEntriesQueryDto {
  @IsOptional()
  @IsString()
  assunto?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  limite?: number;
}

export class CreatePrescriptionDto {
  @IsString()
  @IsNotEmpty()
  consultaId: string;

  @IsString()
  @MinLength(3)
  conteudo: string;
}

export class UpdatePrescriptionDto {
  @IsString()
  @MinLength(3)
  conteudo: string;
}

export class GrantAccessDto {
  @IsString()
  @IsNotEmpty()
  farmaceuticoId: string;

  @IsOptional()
  @IsString()
  consultaId?: string;

  @IsOptional()
  @IsDateString()
  expiraEm?: string;
}
