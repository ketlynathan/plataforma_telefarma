import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { ConsultasService } from './consultas.service';
import { CreateConsultaDto } from './dto/create-consulta.dto';

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
  findAll() {
    return this.consultasService.findAll();
  }

  @Get('pacientes')
  @Roles('farmaceutico')
  listPatients() {
    return this.consultasService.listUniquePatients();
  }
}
