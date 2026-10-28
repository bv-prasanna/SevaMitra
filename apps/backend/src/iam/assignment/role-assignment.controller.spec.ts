
import { RoleAssignmentController } from './role-assignment.controller';
import type { RoleAssignmentService } from './role-assignment.service';

describe('RoleAssignmentController IAM contracts', () => {
  const iam = { assign: jest.fn(), revoke: jest.fn(), listForUser: jest.fn() };
  const controller = new RoleAssignmentController(iam as unknown as RoleAssignmentService);
  beforeEach(()=>jest.resetAllMocks());
  it('records who assigned a role from the authenticated caller', async () => {
    const dto={userId:'target-1',roleId:'role-1'} as Parameters<RoleAssignmentController['assign']>[0];
    const caller = {id:'admin-1',phoneNumber:null,email:null};
    iam.assign.mockResolvedValue({id:'assignment-1'});
    await expect(controller.assign(dto,caller)).resolves.toEqual({id:'assignment-1'});
    expect(iam.assign).toHaveBeenCalledWith(dto,'admin-1');
  });
  it('passes the exact role assignment identifier to revocation', async () => {
    await controller.revoke('assignment-1');
    expect(iam.revoke).toHaveBeenCalledWith('assignment-1');
  });
  it('lists role grants for requested user under IAM permission contract', async () => {
    await controller.listForUser('target-1');
    expect(iam.listForUser).toHaveBeenCalledWith('target-1');
  });
});
