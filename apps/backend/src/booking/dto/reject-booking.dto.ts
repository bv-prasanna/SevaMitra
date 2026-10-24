import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class RejectBookingDto {
  @ApiProperty({ example: 'Fully booked that day' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  reason: string;
}
