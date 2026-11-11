import { ApiProperty } from '@nestjs/swagger';

/** Matches the envelope produced by HttpExceptionFilter (docs/ARCHITECTURE.md §8). */
class ErrorDetailDto {
  @ApiProperty({ example: 'BAD_REQUEST' })
  code: string;

  @ApiProperty({ example: 'Incorrect OTP' })
  message: string;

  @ApiProperty({ required: false })
  details?: Record<string, unknown>;
}

export class ErrorResponseDto {
  @ApiProperty({ type: ErrorDetailDto })
  error: ErrorDetailDto;
}
