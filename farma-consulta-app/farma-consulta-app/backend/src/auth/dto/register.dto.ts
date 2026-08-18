import { IsEmail, IsIn, IsOptional, IsString, MinLength } from 'class-validator';

export class RegisterDto {
  @IsString()
  @MinLength(2)
  nome: string;

  @IsEmail()
  email: string;

  @IsString()
  @MinLength(6)
  senha: string;

  // Cadastro público restrito a clientes. Farmacêuticos só entram por convite.
  @IsOptional()
  @IsIn(['cliente'])
  tipo?: 'cliente';

  @IsOptional()
  @IsString()
  telefone?: string;

  @IsOptional()
  @IsString()
  timezone?: string;
}
