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

  @IsIn(['cliente', 'farmaceutico'])
  tipo: 'cliente' | 'farmaceutico';

  @IsOptional()
  @IsString()
  telefone?: string;
}
