import 'reflect-metadata';
import { StreamableFile } from '@nestjs/common';
import type { Response } from 'express';
import type { AuthenticatedUser } from '../auth/token/jwt-payload.interface';
import { PERMISSIONS_KEY } from '../iam/authorization/require-permissions.decorator';
import { FinanceBillingService } from './billing.service';
import { AdminBillingController, MyBillingController } from './billing.controller';
import { IssueInvoiceDto, UpsertIssuerDto } from './billing.dto';

describe('Finance billing controllers', () => {
  const actor = { id: 'user-1' } as AuthenticatedUser;
  let billing: jest.Mocked<Pick<FinanceBillingService,
    'listMine' | 'proforma' | 'getMine' | 'downloadMine' |
    'issuers' | 'upsertIssuer' | 'listAll' | 'issue'>>;

  beforeEach(() => {
    billing = {
      listMine: jest.fn().mockResolvedValue([]),
      proforma: jest.fn().mockResolvedValue({ id: 'invoice-1' }),
      getMine: jest.fn().mockResolvedValue({ id: 'invoice-1' }),
      downloadMine: jest.fn().mockResolvedValue(Buffer.from('%PDF-1.7')),
      issuers: jest.fn().mockResolvedValue([]),
      upsertIssuer: jest.fn().mockResolvedValue({ id: 'issuer-1' }),
      listAll: jest.fn().mockResolvedValue([]),
      issue: jest.fn().mockResolvedValue({ id: 'invoice-1', status: 'ISSUED' }),
    };
  });

  it('scopes customer billing calls through the signed-in actor', async () => {
    const controller = new MyBillingController(billing as unknown as FinanceBillingService);
    await expect(controller.list(actor)).resolves.toEqual([]);
    await expect(controller.create('booking-1', actor)).resolves.toEqual({ id: 'invoice-1' });
    await expect(controller.get('invoice-1', actor)).resolves.toEqual({ id: 'invoice-1' });
    expect(billing.listMine).toHaveBeenCalledWith('user-1');
    expect(billing.proforma).toHaveBeenCalledWith('user-1', 'booking-1');
    expect(billing.getMine).toHaveBeenCalledWith('user-1', 'invoice-1');
  });

  it('streams private PDF downloads with no-store response headers', async () => {
    const controller = new MyBillingController(billing as unknown as FinanceBillingService);
    const response = { setHeader: jest.fn() } as unknown as Response;
    const result = await controller.download('invoice-1', actor, response);
    expect(result).toBeInstanceOf(StreamableFile);
    expect(billing.downloadMine).toHaveBeenCalledWith('user-1', 'invoice-1');
    expect(response.setHeader).toHaveBeenCalledWith('Content-Type', 'application/pdf');
    expect(response.setHeader).toHaveBeenCalledWith('Content-Disposition', 'attachment; filename="sevamitra-invoice.pdf"');
    expect(response.setHeader).toHaveBeenCalledWith('Cache-Control', 'private, no-store');
  });

  it('routes finance administration actions through the guarded controller', async () => {
    const controller = new AdminBillingController(billing as unknown as FinanceBillingService);
    const issuer = { issuerCode: 'PR01' } as UpsertIssuerDto;
    const issue = { placeOfSupplyStateCode: '29', verificationNote: 'Reviewed' } as IssueInvoiceDto;
    await expect(controller.issuers()).resolves.toEqual([]);
    await expect(controller.issuer(actor, issuer)).resolves.toEqual({ id: 'issuer-1' });
    await expect(controller.invoices()).resolves.toEqual([]);
    await expect(controller.issue('invoice-1', actor, issue)).resolves.toMatchObject({ status: 'ISSUED' });
    expect(billing.upsertIssuer).toHaveBeenCalledWith('user-1', issuer);
    expect(billing.issue).toHaveBeenCalledWith('invoice-1', 'user-1', issue);
    expect(Reflect.getMetadata(PERMISSIONS_KEY, AdminBillingController)).toEqual(['finance.billing.manage']);
  });
});
