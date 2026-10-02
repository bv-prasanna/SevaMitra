import { ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';

export class SocialLoginDto {
  @ApiProperty({
    description: 'ID token issued by the provider SDK on the client',
    example:
      'eyJhbGciOiJSUzI1NiIsImtpZCI6IjEyMzQ1In0.eyJpc3MiOiJhY2NvdW50cy5nb29nbGUuY29tIn0.dGVzdC1zaWduYXR1cmUtZXhhbXBsZQ',
  })
  @IsString()
  idToken: string;
}
