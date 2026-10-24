import { PartialType } from '@nestjs/swagger';
import { CreateProviderProfileDto } from './create-provider-profile.dto';

/** status/verificationStatus are deliberately not here — self-service update never touches them (see PROVIDER_IMPLEMENTATION.md §8). */
export class UpdateProviderProfileDto extends PartialType(
  CreateProviderProfileDto,
) {}
