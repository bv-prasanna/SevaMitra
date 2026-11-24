import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

/** Apply with @UseGuards(JwtAuthGuard) on any endpoint requiring a logged-in user. */
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {}
