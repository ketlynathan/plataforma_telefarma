import { Body, Controller, Get, Headers, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { CreateCheckoutDto, CreateProductPriceDto, MercadoPagoWebhookDto, UpdateProductPriceDto } from './dto/payment.dto';
import { PaymentsService } from './payments.service';

@Controller('payments')
export class PaymentsController {
  constructor(private readonly payments: PaymentsService) {}

  @Get('prices')
  listPublicPrices() {
    return this.payments.listPublicPrices();
  }

  @Get('mercado-pago/webhook')
  webhookGet(@Query() query: Record<string, any>) {
    return { received: true, method: 'GET', query: { type: query.type || null } };
  }

  @Post('mercado-pago/webhook')
  handleWebhook(
    @Body() body: MercadoPagoWebhookDto,
    @Headers() headers: Record<string, string | string[] | undefined>,
    @Query() query: Record<string, any>,
  ) {
    return this.payments.handleWebhook(body, headers, query);
  }

  @Get('admin/prices')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  listAdminPrices(@CurrentUser() user: any) {
    return this.payments.listAdminPrices(user);
  }

  @Post('admin/prices')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  createPrice(@CurrentUser() user: any, @Body() dto: CreateProductPriceDto) {
    return this.payments.createPrice(user, dto);
  }

  @Patch('admin/prices/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  updatePrice(@Param('id') id: string, @CurrentUser() user: any, @Body() dto: UpdateProductPriceDto) {
    return this.payments.updatePrice(user, id, dto);
  }

  @Get('admin/payments')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  listAdminPayments(@CurrentUser() user: any) {
    return this.payments.listAdminPayments(user);
  }

  @Post('checkout')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('cliente')
  createCheckout(@CurrentUser() user: any, @Body() dto: CreateCheckoutDto) {
    return this.payments.createCheckout(user, dto);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('cliente', 'admin')
  getPayment(@Param('id') id: string, @CurrentUser() user: any) {
    return this.payments.getPayment(user, id);
  }
}
