import { ApiProperty } from '@nestjs/swagger';
import { IsIn, IsString, MaxLength, MinLength } from 'class-validator';

export class ResolveSettlementDto {
  @ApiProperty({ enum: ['PAID', 'FAILED'] })
  @IsIn(['PAID', 'FAILED'])
  outcome: 'PAID' | 'FAILED';

  @ApiProperty({ minLength: 12, maxLength: 500 })
  @IsString()
  @MinLength(12)
  @MaxLength(500)
  note: string;
}
