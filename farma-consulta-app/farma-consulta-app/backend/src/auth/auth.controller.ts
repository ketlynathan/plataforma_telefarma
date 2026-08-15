import { Body, Controller, Post } from '@nestjs/common';
import { AuthService } from './auth.service';
import { PasswordResetService } from './password-reset.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import {
  ForgotPasswordDto,
  VerifyResetDto,
  ConfirmResetDto,
} from './dto/reset.dto';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly passwordReset: PasswordResetService,
  ) {}

  @Post('register')
  register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  @Post('login')
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  /** Passo 1: envia código de recuperação (sempre 200). */
  @Post('forgot-password')
  forgotPassword(@Body() dto: ForgotPasswordDto) {
    return this.passwordReset.requestReset(dto.email);
  }

  /** Passo 2: valida o código e devolve um resetToken de sessão curta. */
  @Post('reset-password/verify')
  verifyReset(@Body() dto: VerifyResetDto) {
    return this.passwordReset.verify(dto.email, dto.codigo);
  }

  /** Passo 3: confirma a nova senha usando o resetToken. */
  @Post('reset-password/confirm')
  confirmReset(@Body() dto: ConfirmResetDto & { resetToken?: string }) {
    if (!dto.resetToken) {
      throw new Error('resetToken obrigatorio');
    }
    return this.passwordReset.confirm(dto.email, dto.codigo, dto.novaSenha, dto.resetToken);
  }
}
