import { Body, Controller, Get, Param, Patch, Post, Query, Res, UploadedFile, UseGuards, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import {
  CreateConsentimentoDto,
  CreateEntryDto,
  CreatePrescriptionDto,
  CreateProtocolDto,
  GrantAccessDto,
  UpdateEntryDto,
  UpdatePrescriptionDto,
  UpdateProtocolDto,
} from './dto/prontuario.dto';
import { ProntuarioService } from './prontuario.service';

@Controller('prontuario')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ProntuarioController {
  constructor(private readonly prontuario: ProntuarioService) {}

  @Get('me')
  @Roles('cliente')
  meuProntuario(@CurrentUser() user: any) {
    return this.prontuario.meuProntuario(user);
  }

  @Get('consentimentos')
  @Roles('cliente')
  meusConsentimentos(@CurrentUser() user: any) {
    return this.prontuario.meusConsentimentos(user);
  }

  @Get('protocolos')
  @Roles('farmaceutico')
  meusProtocolos(@CurrentUser() user: any) {
    return this.prontuario.meusProtocolos(user);
  }

  @Get('pacientes')
  @Roles('farmaceutico')
  pacientesDoFarmaceutico(@CurrentUser() user: any) {
    return this.prontuario.pacientesDoFarmaceutico(user);
  }

  @Get('anexos')
  @Roles('cliente', 'farmaceutico')
  listarAnexos(@CurrentUser() user: any, @Query('consultaId') consultaId?: string) {
    return this.prontuario.listarAnexos(user, consultaId);
  }

  @Get('anexos/:id/download')
  @Roles('cliente', 'farmaceutico')
  async baixarAnexo(@Param('id') id: string, @CurrentUser() user: any, @Res() res: any) {
    const arquivo = await this.prontuario.baixarAnexo(user, id);
    res.setHeader('Content-Type', arquivo.contentType);
    res.setHeader('Content-Disposition', `attachment; filename="${arquivo.nomeOriginal.replace(/"/g, '')}"`);
    if (arquivo.contentLength) res.setHeader('Content-Length', String(arquivo.contentLength));
    return res.send(arquivo.body);
  }

  @Get('prescricoes')
  @Roles('cliente', 'farmaceutico')
  listarPrescricoes(@CurrentUser() user: any, @Query('consultaId') consultaId: string) {
    return this.prontuario.listarPrescricoes(user, consultaId);
  }

  @Get('prescricoes/:id/download')
  @Roles('cliente', 'farmaceutico')
  async baixarPrescricao(@Param('id') id: string, @CurrentUser() user: any, @Res() res: any) {
    const arquivo = await this.prontuario.baixarPrescricao(user, id);
    res.setHeader('Content-Type', arquivo.contentType);
    res.setHeader('Content-Disposition', `attachment; filename="${arquivo.nomeOriginal}"`);
    if (arquivo.contentLength) res.setHeader('Content-Length', String(arquivo.contentLength));
    return res.send(arquivo.body);
  }

  @Get(':id')
  getDetalhes(@Param('id') id: string, @CurrentUser() user: any) {
    return this.prontuario.getDetalhes(id, user);
  }

  @Post('entradas')
  @Roles('farmaceutico')
  criarEntrada(@CurrentUser() user: any, @Body() dto: CreateEntryDto) {
    return this.prontuario.createEntry(user, dto);
  }

  @Patch('entradas/:id')
  @Roles('farmaceutico')
  atualizarEntrada(@Param('id') id: string, @CurrentUser() user: any, @Body() dto: UpdateEntryDto) {
    return this.prontuario.updateEntry(user, id, dto);
  }

  @Post('entradas/:id/finalizar')
  @Roles('farmaceutico')
  finalizarEntrada(@Param('id') id: string, @CurrentUser() user: any) {
    return this.prontuario.finalizarEntry(user, id);
  }

  @Post('consentimentos')
  @Roles('cliente')
  criarConsentimento(@CurrentUser() user: any, @Body() dto: CreateConsentimentoDto) {
    return this.prontuario.criarConsentimento(user, dto);
  }

  @Post('consentimentos/:id/revogar')
  @Roles('cliente')
  revogarConsentimento(@Param('id') id: string, @CurrentUser() user: any) {
    return this.prontuario.revogarConsentimento(user, id);
  }

  @Post('acessos')
  @Roles('cliente')
  concederAcesso(@CurrentUser() user: any, @Body() dto: GrantAccessDto) {
    return this.prontuario.concederAcesso(user, dto);
  }

  @Post('acessos/:farmaceuticoId/revogar')
  @Roles('cliente')
  revogarAcesso(@Param('farmaceuticoId') farmaceuticoId: string, @CurrentUser() user: any) {
    return this.prontuario.revogarAcesso(user, farmaceuticoId);
  }

  @Post('anexos')
  @Roles('cliente', 'farmaceutico')
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 10 * 1024 * 1024 } }))
  uploadAnexo(
    @CurrentUser() user: any,
    @UploadedFile() file: { originalname: string; mimetype: string; size: number; buffer: Buffer },
    @Query('consultaId') consultaId?: string,
    @Query('entradaId') entradaId?: string,
  ) {
    return this.prontuario.uploadAnexo(user, file, consultaId, entradaId);
  }

  @Post('prescricoes')
  @Roles('farmaceutico')
  criarPrescricao(@CurrentUser() user: any, @Body() dto: CreatePrescriptionDto) {
    return this.prontuario.criarPrescricao(user, dto);
  }

  @Patch('prescricoes/:id')
  @Roles('farmaceutico')
  atualizarPrescricao(@Param('id') id: string, @CurrentUser() user: any, @Body() dto: UpdatePrescriptionDto) {
    return this.prontuario.atualizarPrescricao(user, id, dto);
  }

  @Post('prescricoes/:id/finalizar')
  @Roles('farmaceutico')
  finalizarPrescricao(@Param('id') id: string, @CurrentUser() user: any) {
    return this.prontuario.finalizarPrescricao(user, id);
  }

  @Post('protocolos')
  @Roles('farmaceutico')
  criarProtocolo(@CurrentUser() user: any, @Body() dto: CreateProtocolDto) {
    return this.prontuario.criarProtocolo(user, dto);
  }

  @Patch('protocolos/:id')
  @Roles('farmaceutico')
  atualizarProtocolo(@Param('id') id: string, @CurrentUser() user: any, @Body() dto: UpdateProtocolDto) {
    return this.prontuario.atualizarProtocolo(user, id, dto);
  }
}
