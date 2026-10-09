import { Module } from '@nestjs/common';
import { RuntimeFlagsService } from './runtime-flags.service';
import { RuntimeFlagsController } from './runtime-flags.controller';

@Module({
  controllers: [RuntimeFlagsController],
  providers: [RuntimeFlagsService],
  exports: [RuntimeFlagsService],
})
export class RuntimeFlagsModule {}
