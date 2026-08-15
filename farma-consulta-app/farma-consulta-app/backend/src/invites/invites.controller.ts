import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { InvitesService } from './invites.service';
import { CreateInviteDto, CompleteInviteDto } from './dto/create-invite.dto';

@Controller('invites')
export class InvitesController {
  constructor(private readonly invitesService: InvitesService) {}

  /** Farmacêutico convida outro farmacêutico por e-mail. */
  @Post()
  @Roles('farmaceutico')
  create(@Body() dto: CreateInviteDto, @CurrentUser() user: any) {
    return this.invitesService.create(dto.email, user.id, user.nome);
  }

  /** Valida o token do convite (público para o fluxo de aceite). */
  @Get(':token')
  getInvite(@Param('token') token: string) {
    return this.invitesService.getInvite(token);
  }

  /** Completa o cadastro do farmacêutico convidado. */
  @Post(':token/complete')
  complete(@Param('token') token: string, @Body() dto: CompleteInviteDto) {
    return this.invitesService.complete(token, dto);
  }
}
