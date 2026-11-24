import { validate } from 'class-validator';
import { IssueInvoiceDto, UpsertIssuerDto } from './billing.dto';

describe('Finance billing DTO validation', () => {
  it('accepts a complete issuer record with valid GST identifiers', async () => {
    const dto = Object.assign(new UpsertIssuerDto(), {
      issuerCode: 'PR01',
      legalName: 'Verified Provider',
      address: 'Bengaluru, Karnataka',
      stateCode: '29',
      gstin: '29ABCDE1234F1Z5',
      sacCode: '9987',
      authorizedSignatory: 'Authorized Person',
      verified: true,
    });
    expect(await validate(dto)).toHaveLength(0);
  });

  it('rejects invalid issuer codes, state codes and malformed GSTIN', async () => {
    const dto = Object.assign(new UpsertIssuerDto(), {
      issuerCode: 'provider-123',
      legalName: 'Provider',
      address: 'Bengaluru',
      stateCode: 'KAR',
      gstin: 'invalid',
      verified: 'yes',
    });
    const errors = await validate(dto);
    expect(errors.map(error => error.property)).toEqual(expect.arrayContaining([
      'issuerCode', 'stateCode', 'gstin', 'verified',
    ]));
  });

  it('requires a valid place-of-supply state and finance verification note', async () => {
    const invalid = Object.assign(new IssueInvoiceDto(), {
      placeOfSupplyStateCode: 'Karnataka',
      verificationNote: '',
    });
    expect((await validate(invalid)).map(error => error.property))
      .toEqual(expect.arrayContaining(['placeOfSupplyStateCode', 'verificationNote']));

    const valid = Object.assign(new IssueInvoiceDto(), {
      placeOfSupplyStateCode: '29',
      verificationNote: 'GST classification reviewed',
    });
    expect(await validate(valid)).toHaveLength(0);
  });
});
