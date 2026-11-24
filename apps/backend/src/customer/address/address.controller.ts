import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiNoContentResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../../auth/token/jwt-payload.interface';
import { AddressService } from './address.service';
import { CreateAddressDto } from '../dto/create-address.dto';
import { UpdateAddressDto } from '../dto/update-address.dto';
import { AddressDto } from '../dto/responses/address.dto';
import { ErrorResponseDto } from '../../common/dto/error-response.dto';

@ApiTags('Customer')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller({ path: 'customers/me/addresses', version: '1' })
export class AddressController {
  constructor(private readonly addressService: AddressService) {}

  @Post()
  @ApiOperation({
    summary:
      "Add an address — the customer's first address always becomes default",
  })
  @ApiOkResponse({ type: AddressDto })
  @ApiNotFoundResponse({
    description: 'No customer profile yet',
    type: ErrorResponseDto,
  })
  create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateAddressDto,
  ) {
    return this.addressService.create(user.id, dto);
  }

  @Get()
  @ApiOperation({
    summary: 'List addresses (default first, then oldest first)',
  })
  @ApiOkResponse({ type: AddressDto, isArray: true })
  list(@CurrentUser() user: AuthenticatedUser) {
    return this.addressService.list(user.id);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get one address' })
  @ApiOkResponse({ type: AddressDto })
  @ApiNotFoundResponse({ type: ErrorResponseDto })
  findOne(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.addressService.findOne(user.id, id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update an address' })
  @ApiOkResponse({ type: AddressDto })
  @ApiNotFoundResponse({ type: ErrorResponseDto })
  update(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: UpdateAddressDto,
  ) {
    return this.addressService.update(user.id, id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete an address' })
  @ApiNoContentResponse()
  @ApiNotFoundResponse({ type: ErrorResponseDto })
  async remove(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ) {
    await this.addressService.remove(user.id, id);
  }
}
