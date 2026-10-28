import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiConflictResponse,
  ApiNoContentResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../auth/token/jwt-payload.interface';
import { CustomerService } from './customer.service';
import { CreateCustomerProfileDto } from './dto/create-customer-profile.dto';
import { UpdateCustomerProfileDto } from './dto/update-customer-profile.dto';
import { CustomerProfileDto } from './dto/responses/customer-profile.dto';
import { ErrorResponseDto } from '../common/dto/error-response.dto';

@ApiTags('Customer')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller({ path: 'customers/me', version: '1' })
export class CustomerController {
  constructor(private readonly customerService: CustomerService) {}

  @Post()
  @ApiOperation({
    summary: 'Create the customer profile for the current account',
  })
  @ApiOkResponse({ type: CustomerProfileDto })
  @ApiConflictResponse({ type: ErrorResponseDto })
  create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateCustomerProfileDto,
  ) {
    return this.customerService.create(user.id, dto);
  }

  @Get()
  @ApiOperation({ summary: "Get the current account's customer profile" })
  @ApiOkResponse({ type: CustomerProfileDto })
  @ApiNotFoundResponse({ type: ErrorResponseDto })
  get(@CurrentUser() user: AuthenticatedUser) {
    return this.customerService.findByUserId(user.id);
  }

  @Patch()
  @ApiOperation({ summary: "Update the current account's customer profile" })
  @ApiOkResponse({ type: CustomerProfileDto })
  @ApiNotFoundResponse({ type: ErrorResponseDto })
  update(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: UpdateCustomerProfileDto,
  ) {
    return this.customerService.update(user.id, dto);
  }

  @Delete()
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary:
      'Delete the customer profile — anonymizes PII, does not remove the row (BRD §14.4)',
  })
  @ApiNoContentResponse()
  @ApiNotFoundResponse({ type: ErrorResponseDto })
  async remove(@CurrentUser() user: AuthenticatedUser) {
    await this.customerService.softDelete(user.id);
  }
}
