import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import { createHash, randomUUID } from 'node:crypto';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { StorageService } from '../storage/storage.service';
import {
  CreateConsentimentoDto,
  CreateEntryDto,
  CreateProtocolDto,
  GrantAccessDto,
  CreatePrescriptionDto,
  UpdatePrescriptionDto,
  UpdateEntryDto,
  UpdateProtocolDto,
} from './dto/prontuario.dto';

const FARMACEUTICO = 'farmaceutico';
const CLIENTE = 'cliente';
const ADMIN = 'admin';
const FINALIZADO = 'FINALIZADO';
const MAX_ATTACHMENT_BYTES = 10 * 1024 * 1024;
const ALLOWED_ATTACHMENT_TYPES = new Set(['application/pdf', 'image/jpeg', 'image/png']);

@Injectable()
export class ProntuarioService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
  ) {}

  private async audit(
    atorId: string | undefined,
    alvoTipo: string,
    alvoId: string | undefined,
    acao: string,
    resultado = 'SUCESSO',
    metadadosJson?: Record<string, unknown>,
  ) {
    await this.prisma.auditEvent.create({
      data: {
        atorId,
        alvoTipo,
        alvoId,
        acao,
        resultado,
        ...(metadadosJson ? { metadadosJson: metadadosJson as Prisma.InputJsonValue } : {}),
      },
    });
  }

  private async getProntuarioOrThrow(id: string) {
    const prontuario = await this.prisma.prontuario.findUnique({
      where: { id },
      include: { paciente: { select: { id: true, nome: true, email: true } } },
    });
    if (!prontuario) throw new NotFoundException('Prontuário não encontrado.');
    return prontuario;
  }

  private async getOrCreatePatientProntuario(userId: string) {
    const paciente = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, nome: true, email: true, tipo: true },
    });
    if (!paciente || paciente.tipo !== CLIENTE) {
      throw new ForbiddenException('Somente pacientes possuem prontuário próprio.');
    }

    return this.prisma.prontuario.upsert({
      where: { pacienteId: userId },
      create: { pacienteId: userId },
      update: {},
      include: { paciente: { select: { id: true, nome: true, email: true } } },
    });
  }

  private async hasAcceptedHealthDataConsent(pacienteId: string) {
    return this.prisma.consentimento.findFirst({
      where: {
        pacienteId,
        tipo: 'TRATAMENTO_DADOS_SAUDE',
        aceito: true,
        revogadoEm: null,
      },
      select: { id: true },
    });
  }

  private async hasActiveGrant(pacienteId: string, farmaceuticoId: string) {
    const now = new Date();
    return this.prisma.accessGrant.findFirst({
      where: {
        pacienteId,
        farmaceuticoId,
        revogadoEm: null,
        OR: [{ expiraEm: null }, { expiraEm: { gt: now } }],
      },
    });
  }

  private async assertReadable(prontuarioId: string, user: { id: string; tipo: string }) {
    const prontuario = await this.getProntuarioOrThrow(prontuarioId);
    if (user.tipo === CLIENTE && user.id === prontuario.pacienteId) return prontuario;
    if (user.tipo === ADMIN) {
      throw new ForbiddenException('Administradores não acessam o conteúdo clínico por padrão.');
    }
    if (user.tipo !== FARMACEUTICO) {
      throw new ForbiddenException('Você não tem acesso a este prontuário.');
    }
    const consentimento = await this.hasAcceptedHealthDataConsent(prontuario.pacienteId);
    if (!consentimento) {
      throw new ForbiddenException('O paciente ainda não registrou ciência para o tratamento dos dados de saúde.');
    }

    const grant = await this.hasActiveGrant(prontuario.pacienteId, user.id);
    const consultation = await this.prisma.consulta.findFirst({
      where: {
        farmaceuticoId: user.id,
        pacienteEmail: prontuario.paciente.email,
        status: { not: 'CANCELADA' },
      },
      select: { id: true },
    });
    if (!grant && !consultation) {
      throw new ForbiddenException('Acesso ao prontuário não autorizado para este farmacêutico.');
    }
    return prontuario;
  }

  private async assertPharmacist(user: { id: string; tipo: string }) {
    if (user.tipo !== FARMACEUTICO) {
      throw new ForbiddenException('Apenas o farmacêutico pode registrar o atendimento.');
    }
  }

  async meuProntuario(user: { id: string; tipo: string }) {
    const prontuario = await this.getOrCreatePatientProntuario(user.id);
    await this.audit(user.id, 'PRONTUARIO', prontuario.id, 'VISUALIZAR');
    return this.getDetalhes(prontuario.id, user);
  }

  async getDetalhes(id: string, user: { id: string; tipo: string }) {
    const prontuario = await this.assertReadable(id, user);
    const resultado = await this.prisma.prontuario.findUnique({
      where: { id },
      include: {
        paciente: { select: { id: true, nome: true, email: true } },
        entradas: {
          orderBy: { criadoEm: 'desc' },
          include: {
            farmaceutico: { select: { id: true, nome: true, tratamento: true, crf: true } },
            consulta: { select: { id: true, data: true, hora: true, status: true } },
          },
        },
      },
    });
    if (!resultado) throw new NotFoundException('Prontuário não encontrado.');
    await this.audit(user.id, 'PRONTUARIO', prontuario.id, 'VISUALIZAR_ENTRADAS');
    if (user.tipo === CLIENTE) {
      return { ...resultado, entradas: resultado.entradas.filter((entrada) => entrada.status === FINALIZADO) };
    }
    return resultado;
  }

  async pacientesDoFarmaceutico(user: { id: string; tipo: string }) {
    await this.assertPharmacist(user);
    const consultas = await this.prisma.consulta.findMany({
      where: { farmaceuticoId: user.id, status: { not: 'CANCELADA' } },
      select: { pacienteNome: true, pacienteEmail: true },
      distinct: ['pacienteEmail'],
      orderBy: { pacienteNome: 'asc' },
    });

    const pacientes = await Promise.all(consultas.map(async (consulta) => {
      const paciente = await this.prisma.user.findUnique({
        where: { email: consulta.pacienteEmail },
        select: { id: true, nome: true, email: true, tipo: true },
      });
      if (!paciente || paciente.tipo !== CLIENTE) return null;
      const prontuario = await this.prisma.prontuario.upsert({
        where: { pacienteId: paciente.id },
        create: { pacienteId: paciente.id },
        update: {},
        select: { id: true, status: true, atualizadoEm: true, ultimoAtendimentoEm: true },
      });
      return {
        pacienteId: paciente.id,
        prontuarioId: prontuario.id,
        pacienteNome: paciente.nome,
        pacienteEmail: paciente.email,
        status: prontuario.status,
        atualizadoEm: prontuario.atualizadoEm,
        ultimoAtendimentoEm: prontuario.ultimoAtendimentoEm,
      };
    }));

    await this.audit(user.id, 'PRONTUARIO', undefined, 'LISTAR_PACIENTES');
    return pacientes.filter(Boolean);
  }

  async createEntry(user: { id: string; tipo: string }, dto: CreateEntryDto) {
    await this.assertPharmacist(user);
    const prontuario = await this.getProntuarioOrThrow(dto.prontuarioId);

    if (dto.consultaId) {
      const consulta = await this.prisma.consulta.findUnique({
        where: { id: dto.consultaId },
        select: { id: true, farmaceuticoId: true, pacienteEmail: true, status: true },
      });
      if (!consulta || consulta.farmaceuticoId !== user.id || consulta.pacienteEmail !== prontuario.paciente.email) {
        throw new ForbiddenException('A consulta não pertence ao farmacêutico ou ao paciente informado.');
      }
      if (consulta.status === 'CANCELADA') {
        throw new BadRequestException('Não é possível registrar evolução em consulta cancelada.');
      }
    }

    const consentimento = await this.hasAcceptedHealthDataConsent(prontuario.pacienteId);
    if (!consentimento) {
      throw new ForbiddenException('O paciente precisa registrar ciência antes do atendimento ser documentado.');
    }
    const grant = await this.hasActiveGrant(prontuario.pacienteId, user.id);
    const hasConsultation = await this.prisma.consulta.findFirst({
      where: {
        id: dto.consultaId,
        farmaceuticoId: user.id,
        pacienteEmail: prontuario.paciente.email,
        status: { not: 'CANCELADA' },
      },
      select: { id: true },
    });
    if (!grant && !hasConsultation) {
      throw new ForbiddenException('Crie o registro a partir de uma consulta sua ou obtenha autorização do paciente.');
    }

    const entry = await this.prisma.$transaction(async (tx) => {
      if (!grant && hasConsultation) {
        await tx.accessGrant.create({
          data: {
            pacienteId: prontuario.pacienteId,
            farmaceuticoId: user.id,
            origem: 'CONSULTA',
            consultaId: hasConsultation.id,
          },
        });
      }

      const created = await tx.prontuarioEntrada.create({
        data: {
          prontuarioId: dto.prontuarioId,
          consultaId: dto.consultaId,
          farmaceuticoId: user.id,
          assunto: dto.assunto.trim(),
          tipo: dto.tipo?.trim() || 'EVOLUCAO',
          conteudo: dto.conteudo.trim(),
          conduta: dto.conduta?.trim() || null,
          orientacoes: dto.orientacoes?.trim() || null,
          encaminhamento: dto.encaminhamento?.trim() || null,
        },
      });

      await tx.prontuario.update({
        where: { id: dto.prontuarioId },
        data: { ultimoAtendimentoEm: new Date() },
      });
      return created;
    });

    await this.audit(user.id, 'PRONTUARIO_ENTRADA', entry.id, 'CRIAR', 'SUCESSO', {
      prontuarioId: dto.prontuarioId,
      consultaId: dto.consultaId,
    });
    return entry;
  }

  async updateEntry(user: { id: string; tipo: string }, id: string, dto: UpdateEntryDto) {
    await this.assertPharmacist(user);
    const entry = await this.prisma.prontuarioEntrada.findUnique({
      where: { id },
      include: { prontuario: { include: { paciente: { select: { email: true } } } } },
    });
    if (!entry) throw new NotFoundException('Registro de atendimento não encontrado.');
    if (entry.farmaceuticoId !== user.id) throw new ForbiddenException('Somente o autor pode editar este registro.');
    if (entry.status === FINALIZADO) {
      throw new ConflictException('Registro finalizado não pode ser editado; crie um adendo.');
    }

    const updated = await this.prisma.prontuarioEntrada.update({
      where: { id },
      data: {
        assunto: dto.assunto?.trim(),
        tipo: dto.tipo?.trim(),
        conteudo: dto.conteudo?.trim(),
        conduta: dto.conduta?.trim(),
        orientacoes: dto.orientacoes?.trim(),
        encaminhamento: dto.encaminhamento?.trim(),
        versao: { increment: 1 },
      },
    });
    await this.audit(user.id, 'PRONTUARIO_ENTRADA', id, 'EDITAR', 'SUCESSO', { versao: updated.versao });
    return updated;
  }

  async finalizarEntry(user: { id: string; tipo: string }, id: string) {
    await this.assertPharmacist(user);
    const entry = await this.prisma.prontuarioEntrada.findUnique({ where: { id } });
    if (!entry) throw new NotFoundException('Registro de atendimento não encontrado.');
    if (entry.farmaceuticoId !== user.id) throw new ForbiddenException('Somente o autor pode finalizar este registro.');
    if (entry.status === FINALIZADO) return entry;

    const finalized = await this.prisma.prontuarioEntrada.update({
      where: { id },
      data: { status: FINALIZADO, finalizadoEm: new Date() },
    });
    await this.audit(user.id, 'PRONTUARIO_ENTRADA', id, 'FINALIZAR');
    return finalized;
  }

  private async resolvePatientForConsultation(user: { id: string; tipo: string }, consultaId: string) {
    const consulta = await this.prisma.consulta.findUnique({
      where: { id: consultaId },
      select: { id: true, pacienteEmail: true, pacienteNome: true, farmaceuticoId: true, status: true },
    });
    if (!consulta) throw new NotFoundException('Consulta não encontrada.');
    const actor = await this.prisma.user.findUnique({ where: { id: user.id }, select: { id: true, email: true, tipo: true } });
    if (!actor) throw new ForbiddenException('Usuário não encontrado.');
    if (user.tipo === CLIENTE && (consulta.pacienteEmail !== actor.email)) {
      throw new ForbiddenException('Esta consulta não pertence ao paciente autenticado.');
    }
    if (user.tipo === FARMACEUTICO && consulta.farmaceuticoId !== user.id) {
      throw new ForbiddenException('Esta consulta não pertence ao farmacêutico autenticado.');
    }
    const paciente = await this.prisma.user.findUnique({
      where: { email: consulta.pacienteEmail },
      select: { id: true, nome: true, email: true, tipo: true },
    });
    if (!paciente || paciente.tipo !== CLIENTE) throw new NotFoundException('Paciente da consulta não encontrado.');
    return { consulta, paciente };
  }

  async uploadAnexo(
    user: { id: string; tipo: string },
    file: { originalname: string; mimetype: string; size: number; buffer: Buffer },
    consultaId?: string,
    entradaId?: string,
  ) {
    if (![CLIENTE, FARMACEUTICO].includes(user.tipo)) throw new ForbiddenException('Perfil sem permissão para anexos clínicos.');
    if (!file?.buffer || !file.originalname) throw new BadRequestException('Arquivo não informado.');
    if (file.size > MAX_ATTACHMENT_BYTES) throw new BadRequestException('O arquivo excede o limite de 10 MB.');
    if (!ALLOWED_ATTACHMENT_TYPES.has(file.mimetype)) throw new BadRequestException('Tipo de arquivo não permitido. Use PDF, JPG ou PNG.');
    if (!consultaId && user.tipo === FARMACEUTICO) throw new BadRequestException('O farmacêutico deve vincular o arquivo a uma consulta.');

    let pacienteId = user.id;
    if (consultaId) {
      const resolved = await this.resolvePatientForConsultation(user, consultaId);
      pacienteId = resolved.paciente.id;
      if (resolved.consulta.status === 'CANCELADA') throw new BadRequestException('Não é possível anexar arquivo a uma consulta cancelada.');
    }
    if (entradaId) {
      const entrada = await this.prisma.prontuarioEntrada.findUnique({
        where: { id: entradaId },
        select: { id: true, prontuario: { select: { pacienteId: true } } },
      });
      if (!entrada || entrada.prontuario.pacienteId !== pacienteId) throw new ForbiddenException('Entrada de prontuário inválida.');
    }

    const checksum = createHash('sha256').update(file.buffer).digest('hex');
    const storageKey = `clinical/${pacienteId}/attachments/${randomUUID()}`;
    await this.storage.put(storageKey, file.buffer, file.mimetype);
    const anexo = await this.prisma.anexoClinico.create({
      data: {
        pacienteId,
        consultaId: consultaId || null,
        entradaId: entradaId || null,
        nomeOriginal: file.originalname.slice(0, 240),
        mimeType: file.mimetype,
        tamanhoBytes: file.size,
        storageKey,
        checksum,
        criadoPor: user.id,
      },
    });
    await this.audit(user.id, 'ANEXO_CLINICO', anexo.id, 'UPLOAD', 'SUCESSO', { consultaId, entradaId, mimeType: file.mimetype, tamanhoBytes: file.size });
    return { id: anexo.id, nomeOriginal: anexo.nomeOriginal, mimeType: anexo.mimeType, tamanhoBytes: anexo.tamanhoBytes, criadoEm: anexo.criadoEm };
  }

  private async assertAttachmentAccess(user: { id: string; tipo: string }, anexo: { pacienteId: string; consultaId: string | null }) {
    if (user.tipo === CLIENTE && user.id === anexo.pacienteId) return;
    if (user.tipo === FARMACEUTICO && anexo.consultaId) {
      const consulta = await this.prisma.consulta.findUnique({ where: { id: anexo.consultaId }, select: { farmaceuticoId: true } });
      if (consulta?.farmaceuticoId === user.id) return;
    }
    throw new ForbiddenException('Você não tem acesso a este arquivo.');
  }

  async listarAnexos(user: { id: string; tipo: string }, consultaId?: string) {
    if (![CLIENTE, FARMACEUTICO].includes(user.tipo)) throw new ForbiddenException('Perfil sem permissão para anexos clínicos.');
    let pacienteId: string | undefined;
    if (consultaId) pacienteId = (await this.resolvePatientForConsultation(user, consultaId)).paciente.id;
    else if (user.tipo === CLIENTE) pacienteId = user.id;
    else throw new BadRequestException('Informe a consulta para listar anexos do farmacêutico.');

    const anexos = await this.prisma.anexoClinico.findMany({
      where: { pacienteId, ...(consultaId ? { consultaId } : {}) },
      select: { id: true, consultaId: true, entradaId: true, nomeOriginal: true, mimeType: true, tamanhoBytes: true, criadoPor: true, criadoEm: true },
      orderBy: { criadoEm: 'desc' },
    });
    await this.audit(user.id, 'ANEXO_CLINICO', consultaId, 'LISTAR');
    return anexos;
  }

  async baixarAnexo(user: { id: string; tipo: string }, id: string) {
    const anexo = await this.prisma.anexoClinico.findUnique({ where: { id } });
    if (!anexo) throw new NotFoundException('Anexo não encontrado.');
    await this.assertAttachmentAccess(user, anexo);
    const arquivo = await this.storage.get(anexo.storageKey);
    await this.audit(user.id, 'ANEXO_CLINICO', id, 'DOWNLOAD');
    return { ...arquivo, nomeOriginal: anexo.nomeOriginal, contentType: anexo.mimeType };
  }

  private async assertPrescriptionConsultation(user: { id: string; tipo: string }, consultaId: string) {
    await this.assertPharmacist(user);
    const resolved = await this.resolvePatientForConsultation(user, consultaId);
    if (resolved.consulta.status === 'CANCELADA') throw new BadRequestException('Não é possível prescrever em consulta cancelada.');
    const pharmacist = await this.prisma.user.findUnique({ where: { id: user.id }, select: { nome: true, crf: true } });
    if (!pharmacist?.crf?.trim()) throw new BadRequestException('Cadastre o CRF do farmacêutico antes de emitir a prescrição.');
    return { ...resolved, pharmacist };
  }

  async criarPrescricao(user: { id: string; tipo: string }, dto: CreatePrescriptionDto) {
    const { consulta, paciente, pharmacist } = await this.assertPrescriptionConsultation(user, dto.consultaId);
    const ultima = await this.prisma.prescricaoFarmaceutica.findFirst({ where: { consultaId: consulta.id }, orderBy: { versao: 'desc' }, select: { versao: true } });
    const prescricao = await this.prisma.prescricaoFarmaceutica.create({
      data: {
        consultaId: consulta.id,
        farmaceuticoId: user.id,
        conteudo: dto.conteudo.trim(),
        carimboNome: pharmacist.nome,
        carimboCrf: pharmacist.crf!.trim(),
        carimboDataHora: new Date(),
        versao: (ultima?.versao ?? 0) + 1,
        status: 'RASCUNHO',
      },
    });
    await this.audit(user.id, 'PRESCRICAO_FARMACEUTICA', prescricao.id, 'CRIAR', 'SUCESSO', { consultaId: consulta.id, pacienteId: paciente.id });
    return prescricao;
  }

  async atualizarPrescricao(user: { id: string; tipo: string }, id: string, dto: UpdatePrescriptionDto) {
    await this.assertPharmacist(user);
    const prescricao = await this.prisma.prescricaoFarmaceutica.findUnique({ where: { id } });
    if (!prescricao) throw new NotFoundException('Prescrição não encontrada.');
    if (prescricao.farmaceuticoId !== user.id) throw new ForbiddenException('Somente o autor pode editar a prescrição.');
    if (prescricao.status === FINALIZADO) throw new ConflictException('Prescrição finalizada não pode ser editada; crie uma nova versão.');
    const atualizada = await this.prisma.prescricaoFarmaceutica.update({ where: { id }, data: { conteudo: dto.conteudo.trim(), versao: { increment: 1 } } });
    await this.audit(user.id, 'PRESCRICAO_FARMACEUTICA', id, 'EDITAR', 'SUCESSO', { versao: atualizada.versao });
    return atualizada;
  }

  private async gerarPdfPrescricao(prescricao: { id: string; conteudo: string; carimboNome: string; carimboCrf: string; carimboDataHora: Date; versao: number }, paciente: { nome: string; email: string }) {
    const pdf = await PDFDocument.create();
    let page = pdf.addPage([595, 842]);
    const font = await pdf.embedFont(StandardFonts.Helvetica);
    const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
    let y = 790;
    const draw = (text: string, size = 11, isBold = false) => {
      page.drawText(text, { x: 48, y, size, font: isBold ? bold : font, color: rgb(0.12, 0.16, 0.22), maxWidth: 495 });
      y -= size + 9;
    };
    draw('PRESCRIÇÃO FARMACÊUTICA', 18, true);
    y -= 8;
    draw(`Paciente: ${paciente.nome}`);
    draw(`E-mail: ${paciente.email}`);
    draw(`Versão: ${prescricao.versao}`);
    y -= 14;
    draw('Orientação / prescrição:', 12, true);
    const linhas = prescricao.conteudo.split(/\r?\n/).flatMap((line) => {
      const words = line.split(' ');
      const result: string[] = [];
      let current = '';
      for (const word of words) {
        const next = current ? `${current} ${word}` : word;
        if (next.length > 82) { result.push(current); current = word; } else current = next;
      }
      if (current) result.push(current);
      return result.length ? result : [''];
    });
    for (const linha of linhas) {
      if (y < 120) { page.drawText('Continua na próxima página.', { x: 48, y: 80, size: 10, font }); y = 790; page = pdf.addPage([595, 842]); }
      draw(linha || ' ', 11);
    }
    y = Math.max(y - 20, 120);
    page.drawLine({ start: { x: 48, y }, end: { x: 300, y }, thickness: 1, color: rgb(0.3, 0.3, 0.3) });
    y -= 18;
    draw(`Carimbo: ${prescricao.carimboNome} — CRF ${prescricao.carimboCrf}`, 10, true);
    draw(`Data e hora: ${prescricao.carimboDataHora.toLocaleString('pt-BR', { timeZone: process.env.APP_TIMEZONE || 'America/Sao_Paulo' })}`, 10);
    draw('Documento emitido pela Farma Consulta. O carimbo acima é uma identificação profissional visual.', 8);
    return Buffer.from(await pdf.save());
  }

  async finalizarPrescricao(user: { id: string; tipo: string }, id: string) {
    await this.assertPharmacist(user);
    const prescricao = await this.prisma.prescricaoFarmaceutica.findUnique({ where: { id }, include: { consulta: { select: { pacienteEmail: true } } } });
    if (!prescricao) throw new NotFoundException('Prescrição não encontrada.');
    if (prescricao.farmaceuticoId !== user.id) throw new ForbiddenException('Somente o autor pode finalizar a prescrição.');
    if (prescricao.status === FINALIZADO && prescricao.pdfKey) return prescricao;
    const paciente = await this.prisma.user.findUnique({ where: { email: prescricao.consulta.pacienteEmail }, select: { id: true, nome: true, email: true } });
    if (!paciente) throw new NotFoundException('Paciente não encontrado.');
    const pdf = await this.gerarPdfPrescricao(prescricao, paciente);
    const pdfKey = `clinical/${paciente.id}/prescriptions/${prescricao.id}-v${prescricao.versao}.pdf`;
    await this.storage.put(pdfKey, pdf, 'application/pdf');
    const finalizada = await this.prisma.prescricaoFarmaceutica.update({ where: { id }, data: { status: FINALIZADO, pdfKey } });
    await this.audit(user.id, 'PRESCRICAO_FARMACEUTICA', id, 'FINALIZAR', 'SUCESSO', { versao: finalizada.versao });
    return finalizada;
  }

  async listarPrescricoes(user: { id: string; tipo: string }, consultaId: string) {
    const { consulta } = await this.resolvePatientForConsultation(user, consultaId);
    const where = user.tipo === CLIENTE ? { consultaId, status: FINALIZADO } : { consultaId };
    const prescricoes = await this.prisma.prescricaoFarmaceutica.findMany({ where, orderBy: { versao: 'desc' }, select: { id: true, consultaId: true, farmaceuticoId: true, conteudo: true, carimboNome: true, carimboCrf: true, carimboDataHora: true, versao: true, status: true, criadoEm: true, atualizadoEm: true } });
    await this.audit(user.id, 'PRESCRICAO_FARMACEUTICA', consulta.id, 'LISTAR');
    return prescricoes;
  }

  async baixarPrescricao(user: { id: string; tipo: string }, id: string) {
    const prescricao = await this.prisma.prescricaoFarmaceutica.findUnique({ where: { id }, include: { consulta: { select: { pacienteEmail: true } } } });
    if (!prescricao) throw new NotFoundException('Prescrição não encontrada.');
    if (prescricao.status !== FINALIZADO || !prescricao.pdfKey) throw new ConflictException('A prescrição ainda não foi finalizada.');
    const paciente = await this.prisma.user.findUnique({ where: { email: prescricao.consulta.pacienteEmail }, select: { id: true } });
    if (!paciente) throw new NotFoundException('Paciente não encontrado.');
    if (user.tipo === CLIENTE && user.id !== paciente.id) throw new ForbiddenException('Você não tem acesso a esta prescrição.');
    if (user.tipo === FARMACEUTICO && prescricao.farmaceuticoId !== user.id) throw new ForbiddenException('Você não tem acesso a esta prescrição.');
    const arquivo = await this.storage.get(prescricao.pdfKey);
    await this.audit(user.id, 'PRESCRICAO_FARMACEUTICA', id, 'DOWNLOAD');
    return { ...arquivo, nomeOriginal: `prescricao-farmaceutica-v${prescricao.versao}.pdf`, contentType: 'application/pdf' };
  }

  async criarConsentimento(user: { id: string; tipo: string }, dto: CreateConsentimentoDto) {
    if (user.tipo !== CLIENTE) throw new ForbiddenException('Somente o paciente pode registrar seu consentimento.');
    const consentimento = await this.prisma.consentimento.create({
      data: {
        pacienteId: user.id,
        tipo: dto.tipo.trim(),
        versaoDocumento: dto.versaoDocumento.trim(),
        finalidade: dto.finalidade.trim(),
        aceito: dto.aceito,
        aceitoEm: dto.aceito ? new Date() : null,
        evidenciaJson: { origem: 'PLATAFORMA', metodo: 'CHECKBOX_AUTENTICADO' },
      },
    });
    await this.audit(user.id, 'CONSENTIMENTO', consentimento.id, dto.aceito ? 'ACEITAR' : 'RECUSAR', 'SUCESSO', {
      tipo: dto.tipo.trim(),
      versaoDocumento: dto.versaoDocumento.trim(),
    });
    return consentimento;
  }

  async revogarConsentimento(user: { id: string; tipo: string }, id: string) {
    if (user.tipo !== CLIENTE) throw new ForbiddenException('Somente o paciente pode revogar seu consentimento.');
    const consentimento = await this.prisma.consentimento.findUnique({ where: { id } });
    if (!consentimento || consentimento.pacienteId !== user.id) {
      throw new ForbiddenException('Este consentimento não pertence a você.');
    }
    if (consentimento.revogadoEm) return consentimento;
    const atualizado = await this.prisma.consentimento.update({
      where: { id },
      data: { revogadoEm: new Date() },
    });
    await this.audit(user.id, 'CONSENTIMENTO', id, 'REVOGAR');
    return atualizado;
  }

  async meusConsentimentos(user: { id: string; tipo: string }) {
    if (user.tipo !== CLIENTE) throw new ForbiddenException('Somente o paciente pode consultar seus consentimentos.');
    const consentimentos = await this.prisma.consentimento.findMany({
      where: { pacienteId: user.id },
      orderBy: { criadoEm: 'desc' },
    });
    await this.audit(user.id, 'CONSENTIMENTO', user.id, 'VISUALIZAR');
    return consentimentos;
  }

  async revogarAcesso(user: { id: string; tipo: string }, farmaceuticoId: string) {
    if (user.tipo !== CLIENTE) throw new ForbiddenException('Somente o paciente pode revogar acesso.');
    const grant = await this.prisma.accessGrant.findUnique({
      where: { pacienteId_farmaceuticoId: { pacienteId: user.id, farmaceuticoId } },
    });
    if (!grant) throw new NotFoundException('Autorização não encontrada.');
    const atualizado = await this.prisma.accessGrant.update({
      where: { id: grant.id },
      data: { revogadoEm: new Date() },
    });
    await this.audit(user.id, 'ACCESS_GRANT', grant.id, 'REVOGAR');
    return atualizado;
  }

  async concederAcesso(user: { id: string; tipo: string }, dto: GrantAccessDto) {
    if (user.tipo !== CLIENTE) throw new ForbiddenException('Somente o paciente pode autorizar acesso.');
    const farmaceutico = await this.prisma.user.findUnique({
      where: { id: dto.farmaceuticoId },
      select: { id: true, tipo: true, ativo: true },
    });
    if (!farmaceutico || farmaceutico.tipo !== FARMACEUTICO || !farmaceutico.ativo) {
      throw new BadRequestException('Farmacêutico inválido ou inativo.');
    }
    const prontuario = await this.getOrCreatePatientProntuario(user.id);
    const grant = await this.prisma.accessGrant.upsert({
      where: {
        pacienteId_farmaceuticoId: { pacienteId: user.id, farmaceuticoId: dto.farmaceuticoId },
      },
      create: {
        pacienteId: user.id,
        farmaceuticoId: dto.farmaceuticoId,
        origem: 'PACIENTE',
        consultaId: dto.consultaId,
        expiraEm: dto.expiraEm ? new Date(dto.expiraEm) : null,
      },
      update: {
        origem: 'PACIENTE',
        consultaId: dto.consultaId,
        expiraEm: dto.expiraEm ? new Date(dto.expiraEm) : null,
        revogadoEm: null,
      },
    });
    await this.audit(user.id, 'ACCESS_GRANT', grant.id, 'CONCEDER', 'SUCESSO', {
      prontuarioId: prontuario.id,
      farmaceuticoId: dto.farmaceuticoId,
    });
    return grant;
  }

  async criarProtocolo(user: { id: string; tipo: string }, dto: CreateProtocolDto) {
    await this.assertPharmacist(user);
    const protocolo = await this.prisma.protocoloAtendimento.create({
      data: {
        nome: dto.nome.trim(),
        descricao: dto.descricao?.trim() || null,
        criadoPor: user.id,
        versoes: { create: { versao: 1, camposJson: dto.camposJson as Prisma.InputJsonValue, publicadoEm: new Date(), publicadoPor: user.id } },
      },
      include: { versoes: true },
    });
    await this.audit(user.id, 'PROTOCOLO', protocolo.id, 'CRIAR');
    return protocolo;
  }

  async meusProtocolos(user: { id: string; tipo: string }) {
    await this.assertPharmacist(user);
    return this.prisma.protocoloAtendimento.findMany({
      where: { criadoPor: user.id },
      include: { versoes: { orderBy: { versao: 'desc' }, take: 1 } },
      orderBy: { atualizadoEm: 'desc' },
    });
  }

  async atualizarProtocolo(user: { id: string; tipo: string }, id: string, dto: UpdateProtocolDto) {
    await this.assertPharmacist(user);
    const protocolo = await this.prisma.protocoloAtendimento.findUnique({
      where: { id },
      include: { versoes: { orderBy: { versao: 'desc' }, take: 1 } },
    });
    if (!protocolo) throw new NotFoundException('Protocolo não encontrado.');
    if (protocolo.criadoPor !== user.id) throw new ForbiddenException('Somente o criador pode alterar este protocolo.');

    const nextVersion = (protocolo.versoes[0]?.versao ?? 0) + 1;
    const updated = await this.prisma.$transaction(async (tx) => {
      const result = await tx.protocoloAtendimento.update({
        where: { id },
        data: {
          nome: dto.nome?.trim(),
          descricao: dto.descricao?.trim(),
          ativo: dto.ativo,
        },
      });
      if (dto.camposJson) {
        await tx.protocoloVersao.create({
          data: { protocoloId: id, versao: nextVersion, camposJson: dto.camposJson as Prisma.InputJsonValue, publicadoEm: new Date(), publicadoPor: user.id },
        });
      }
      return result;
    });
    await this.audit(user.id, 'PROTOCOLO', id, 'EDITAR', 'SUCESSO', { criouVersao: Boolean(dto.camposJson), versao: nextVersion });
    return updated;
  }
}
