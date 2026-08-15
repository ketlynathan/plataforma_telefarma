import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { MessagesService } from './messages.service';
import { CreateMessageDto } from './dto/message.dto';

@Controller('messages')
@UseGuards(JwtAuthGuard, RolesGuard)
export class MessagesController {
  constructor(private readonly messagesService: MessagesService) {}

  @Post(':consultaId')
  @Roles('cliente', 'farmaceutico')
  send(
    @Param('consultaId') consultaId: string,
    @CurrentUser() user: any,
    @Body() dto: CreateMessageDto,
  ) {
    return this.messagesService.send(consultaId, user, dto.texto);
  }

  @Get(':consultaId')
  @Roles('cliente', 'farmaceutico')
  list(
    @Param('consultaId') consultaId: string,
    @CurrentUser() user: any,
    @Query('take') take?: number,
    @Query('before') before?: string,
  ) {
    return this.messagesService.list(consultaId, user, take ?? 50, before);
  }

  /** Polling leve: status da consulta + não lidas + última mensagem (item 21). */
  @Get(':consultaId/status')
  @Roles('cliente', 'farmaceutico')
  status(@Param('consultaId') consultaId: string, @CurrentUser() user: any) {
    return this.messagesService.status(consultaId, user);
  }

  @Get('unread/count')
  @Roles('cliente', 'farmaceutico')
  unreadCount(@CurrentUser() user: any) {
    return this.messagesService.unreadCount(user);
  }
}
