import { ApiProperty } from '@nestjs/swagger';

export class WindowDto {
  @ApiProperty({ example: '09:00' })
  start: string;

  @ApiProperty({ example: '13:00' })
  end: string;
}
