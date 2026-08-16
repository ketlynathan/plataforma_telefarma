import { Body, Controller, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { EmergencyService } from './emergency.service';
import { EncerrarEmergenciaDto } from './dto/emergency.dto';

@Controller('emergency')
@UseGuards(JwtAuthGuard, RolesGuard)
export class EmergencyController {
  constructor(private readonly emergencyService: EmergencyService) {}

  /** Cliente: solicita emergência. */
  @Post()
  @Roles('cliente')
  solicitar(@CurrentUser() user: any) {
    return this.emergencyService.solicitar(user.id);
  }

  /** Cliente: acompanha a própria emergência. */
  @Get('mine')
  @Roles('cliente')
  minha(@CurrentUser() user: any) {
    return this.emergencyService.minha(user.id);
  }

  /** Farmacêutico: lista solicitações em aberto. */
  @Get('open')
  @Roles('farmaceutico')
  listarAbertas() {
    return this.emergencyService.listarAbertas();
  }

  /** Farmacêutico: aceita uma solicitação (sala Jitsi gerada). */
  @Post(':id/accept')
  @Roles('farmaceutico')
  aceitar(@Param('id') id: string, @CurrentUser() user: any) {
    return this.emergencyService.aceitar(id, user.id);
  }

  /** Farmacêutico: abre/reabre a sala e sinaliza ao paciente que pode entrar. */
  @Post(':id/open-room')
  @Roles('farmaceutico')
  abrirSala(@Param('id') id: string, @CurrentUser() user: any) {
    return this.emergencyService.abrirSala(id, user.id);
  }

  /** Farmacêutico: inicia o atendimento. */
  @Post(':id/start')
  @Roles('farmaceutico')
  iniciar(@Param('id') id: string, @CurrentUser() user: any) {
    return this.emergencyService.iniciar(id, user.id);
  }

  /** Encerra/cancela/expira a solicitação. */
  @Patch(':id/close')
  @Roles('farmaceutico')
  encerrar(
    @Param('id') id: string,
    @CurrentUser() user: any,
    @Body() dto: EncerrarEmergenciaDto,
  ) {
    return this.emergencyService.encerrar(id, user.id, dto);
  }
}
