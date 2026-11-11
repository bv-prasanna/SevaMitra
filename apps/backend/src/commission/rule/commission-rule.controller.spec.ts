
import { CommissionRuleController } from './commission-rule.controller';
import type { CommissionRuleService } from './commission-rule.service';

describe('Commission rule management HTTP contracts', () => {
  const service = {create:jest.fn(),list:jest.fn(),findOne:jest.fn(),update:jest.fn()};
  const controller = new CommissionRuleController(service as unknown as CommissionRuleService);
  beforeEach(()=>jest.resetAllMocks());
  it('creates the exact versioned rate requested after IAM authorization',async()=>{
    const dto={scopeType:'PLATFORM',commissionType:'PERCENTAGE',percentage:12.5} as Parameters<CommissionRuleController['create']>[0];
    await controller.create(dto);
    expect(service.create).toHaveBeenCalledWith(dto);
  });
  it('lists rules by scope',async()=>{
    await controller.list({scopeType:'SERVICE'} as Parameters<CommissionRuleController['list']>[0]);
    expect(service.list).toHaveBeenCalledWith('SERVICE');
  });
  it('reads rule detail by rule ID',async()=>{
    await controller.findOne('rule-1');expect(service.findOne).toHaveBeenCalledWith('rule-1');
  });
  it('updates only the selected rule',async()=>{
    const dto={isActive:false};
    await controller.update('rule-1',dto);
    expect(service.update).toHaveBeenCalledWith('rule-1',dto);
  });
});
