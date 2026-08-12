import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateConsultaDto } from './dto/create-consulta.dto';

@Injectable()
export class ConsultasService {
  constructor(private readonly prisma: PrismaService) {}

  // Equivalente a create_consulta() em database/db.py
  create(paciente: { nome: string; email: string }, dto: CreateConsultaDto) {
    return this.prisma.consulta.create({
      data: {
        pacienteNome: paciente.nome,
        pacienteEmail: paciente.email,
        data: new Date(dto.data),
        hora: dto.hora,
        status: 'Agendada',
        observacoes: dto.observacoes?.trim() ?? '',
      },
    });
  }

  // Equivalente a get_consultas_by_email()
  findByEmail(email: string) {
    return this.prisma.consulta.findMany({
      where: { pacienteEmail: email },
      orderBy: [{ data: 'asc' }, { hora: 'asc' }],
    });
  }

  // Equivalente a get_upcoming_consultas()
  findAll() {
    return this.prisma.consulta.findMany({
      orderBy: [{ data: 'asc' }, { hora: 'asc' }],
    });
  }

  // Equivalente a list_unique_patients()
  async listUniquePatients() {
    const consultas = await this.prisma.consulta.findMany({
      select: { pacienteNome: true, pacienteEmail: true },
      distinct: ['pacienteEmail'],
      orderBy: { pacienteNome: 'asc' },
    });
    return consultas;
  }
}
