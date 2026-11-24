import { validate } from 'class-validator';
import { ResolveSettlementDto } from './resolve-settlement.dto';

describe('ResolveSettlementDto', () => {
  it('accepts a supported outcome with an evidence note', async () => {
    const dto = Object.assign(new ResolveSettlementDto(), {
      outcome: 'PAID',
      note: 'Provider bank statement independently verified',
    });
    expect(await validate(dto)).toHaveLength(0);
  });

  it('rejects unsupported outcomes and short notes', async () => {
    const dto = Object.assign(new ResolveSettlementDto(), {
      outcome: 'PENDING',
      note: 'ok',
    });
    expect((await validate(dto)).map(error => error.property))
      .toEqual(expect.arrayContaining(['outcome', 'note']));
  });
});
