import { ApiProperty } from '@nestjs/swagger';
import { NotificationChannel, NotificationStatus } from '@prisma/client';

export class NotificationDto {
  @ApiProperty({ example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890' })
  id: string;

  @ApiProperty({ example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890' })
  userId: string;

  @ApiProperty({
    enum: NotificationChannel,
    example: NotificationChannel.IN_APP,
  })
  channel: NotificationChannel;

  @ApiProperty({ example: 'Booking confirmed' })
  title: string;

  @ApiProperty({
    example: 'Your booking for Oct 20, 9:00 AM has been accepted.',
  })
  body: string;

  @ApiProperty({ enum: NotificationStatus, example: NotificationStatus.SENT })
  status: NotificationStatus;

  @ApiProperty({ required: false, nullable: true })
  failureReason: string | null;

  @ApiProperty({ required: false, nullable: true })
  readAt: Date | null;

  @ApiProperty()
  createdAt: Date;
}
