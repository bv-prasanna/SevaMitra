import { Module } from '@nestjs/common';
import { IamModule } from '../iam/iam.module';
import { RuntimeFlagsService } from './runtime-flags.service';
import { RuntimeFlagsController } from './runtime-flags.controller';

@Module({
  imports: [IamModule],
  controllers: [RuntimeFlagsController],
  providers: [RuntimeFlagsService],
  exports: [RuntimeFlagsService],
})
export class RuntimeFlagsModule {}
