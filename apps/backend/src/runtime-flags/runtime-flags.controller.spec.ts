import 'reflect-metadata';
import { PERMISSIONS_KEY } from '../iam/authorization/require-permissions.decorator';
import { RuntimeFlagsController } from './runtime-flags.controller';

describe('RuntimeFlagsController permissions', () => {
  it('allows the dedicated runtime flag viewer to read controls', () => {
    expect(Reflect.getMetadata(PERMISSIONS_KEY, RuntimeFlagsController.prototype.list))
      .toEqual(['runtime-flags.view']);
  });

  it('requires the dedicated runtime flag manager to change controls', () => {
    expect(Reflect.getMetadata(PERMISSIONS_KEY, RuntimeFlagsController.prototype.set))
      .toEqual(['runtime-flags.view', 'runtime-flags.manage']);
  });
});
