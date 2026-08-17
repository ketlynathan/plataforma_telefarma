import { Body, Controller, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { ConsultasService } from './consultas.service';
import { CreateConsultaDto } from './dto/create-consulta.dto';
import { ConsultaStatus } from '@prisma/client';

@Controller('consultas')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ConsultasController {
  constructor(private readonly consultasService: ConsultasService) {}

  @Post()
  @Roles('cliente')
  create(@CurrentUser() user: any, @Body() dto: CreateConsultaDto) {
    return this.consultasService.create({ nome: user.nome, email: user.email }, dto);
  }

  @Get('me')
  @Roles('cliente')
  findMine(@CurrentUser() user: any) {
    return this.consultasService.findByEmail(user.email);
  }

  @Get()
  @Roles('farmaceutico')
  findAll(@CurrentUser() user: any) {
    // Item 14: farmacêutico vê somente as próprias consultas.
    return this.consultasService.findByFarmaceutico(user.id);
  }

  @Get('pacientes')
  @Roles('farmaceutico')
  listPatients() {
    return this.consultasService.listUniquePatients();
  }

  /** Item 4: cliente entra na consulta pela plataforma (sala persistida). */
  @Get(':id/room')
  @Roles('cliente', 'farmaceutico')
  getRoom(@Param('id') id: string, @CurrentUser() user: any) {
    return this.consultasService.getRoom(id, user);
  }

  /** Item 12: farmacêutico abre uma nova sala mantendo a consulta. */
  @Post(':id/new-room')
  @Roles('farmaceutico')
  newRoom(@Param('id') id: string, @CurrentUser() user: any) {
    return this.consultasService.newRoom(id, user);
  }

  @Post(':id/enter-room')
  @Roles('cliente', 'farmaceutico')
  enterRoom(@Param('id') id: string, @CurrentUser() user: any) {
    return this.consultasService.enterRoom(id, user);
  }

  @Post(':id/close-room')
  @Roles('farmaceutico')
  fecharSala(@Param('id') id: string, @CurrentUser() user: any) {
    return this.consultasService.fecharSala(id, user);
  }

  @Post(':id/admit-late')
  @Roles('farmaceutico')
  admitirAtrasado(@Param('id') id: string, @CurrentUser() user: any) {
    return this.consultasService.admitirAtrasado(id, user);
  }

  /** Item 13: transições de status controladas. */
  @Patch(':id/status')
  @Roles('cliente', 'farmaceutico')
  updateStatus(
    @Param('id') id: string,
    @CurrentUser() user: any,
    @Body('status') status: ConsultaStatus,
  ) {
    return this.consultasService.updateStatus(id, user, status);
  }
}
