import { PartialType } from '@nestjs/swagger';
import { CreateCoverageProfileDto } from './create-coverage-profile.dto';

export class UpdateCoverageProfileDto extends PartialType(
  CreateCoverageProfileDto,
) {}
