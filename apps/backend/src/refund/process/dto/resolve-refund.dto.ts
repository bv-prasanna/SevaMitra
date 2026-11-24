import { ApiProperty } from '@nestjs/swagger';
import { IsIn, IsString, MaxLength, MinLength } from 'class-validator';

export class ResolveRefundDto {
  @ApiProperty({ enum: ['REFUNDED', 'FAILED'] })
  @IsIn(['REFUNDED', 'FAILED'])
  outcome: 'REFUNDED' | 'FAILED';

  @ApiProperty({ minLength: 12, maxLength: 500 })
  @IsString()
  @MinLength(12)
  @MaxLength(500)
  note: string;
}
