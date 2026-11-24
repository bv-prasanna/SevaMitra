import { validate } from 'class-validator';
import { ResolveRefundDto } from './resolve-refund.dto';

describe('ResolveRefundDto', () => {
  it('accepts a supported outcome with an evidence note', async () => {
    const dto = Object.assign(new ResolveRefundDto(), {
      outcome: 'REFUNDED',
      note: 'Gateway and bank statement both confirm refund',
    });
    expect(await validate(dto)).toHaveLength(0);
  });

  it('rejects unsupported outcomes and short notes', async () => {
    const dto = Object.assign(new ResolveRefundDto(), {
      outcome: 'PENDING',
      note: 'ok',
    });
    expect((await validate(dto)).map(error => error.property))
      .toEqual(expect.arrayContaining(['outcome', 'note']));
  });
});
