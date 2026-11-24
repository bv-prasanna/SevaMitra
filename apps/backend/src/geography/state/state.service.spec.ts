import { ConflictException, NotFoundException } from '@nestjs/common';
import { StateService } from './state.service';
import type { PrismaService } from '../../prisma/prisma.service';

describe('StateService', () => {
  let prisma: {
    state: {
      findUnique: jest.Mock;
      create: jest.Mock;
      findMany: jest.Mock;
      update: jest.Mock;
    };
  };
  let service: StateService;

  beforeEach(() => {
    prisma = {
      state: {
        findUnique: jest.fn(),
        create: jest.fn(),
        findMany: jest.fn(),
        update: jest.fn(),
      },
    };
    service = new StateService(prisma as unknown as PrismaService);
  });

  describe('create', () => {
    it('rejects a duplicate name', async () => {
      prisma.state.findUnique.mockResolvedValue({ id: 'state-1' });

      await expect(service.create({ name: 'Karnataka' })).rejects.toThrow(
        ConflictException,
      );
      expect(prisma.state.create).not.toHaveBeenCalled();
    });

    it('creates a state when the name is free', async () => {
      prisma.state.findUnique.mockResolvedValue(null);
      prisma.state.create.mockResolvedValue({ id: 'state-1' });

      await service.create({ name: 'Karnataka', code: 'KA' });

      expect(prisma.state.create).toHaveBeenCalledWith({
        data: { name: 'Karnataka', code: 'KA' },
      });
    });
  });

  describe('update', () => {
    it('throws NotFound when the state does not exist', async () => {
      prisma.state.findUnique.mockResolvedValue(null);

      await expect(service.update('missing', { name: 'X' })).rejects.toThrow(
        NotFoundException,
      );
    });

    it('rejects renaming to a name used by a different state', async () => {
      prisma.state.findUnique
        .mockResolvedValueOnce({ id: 'state-1' })
        .mockResolvedValueOnce({ id: 'state-2' });

      await expect(
        service.update('state-1', { name: 'Taken' }),
      ).rejects.toThrow(ConflictException);
      expect(prisma.state.update).not.toHaveBeenCalled();
    });
  });

  describe('assertExistsOrThrow', () => {
    it('throws NotFound for a missing state', async () => {
      prisma.state.findUnique.mockResolvedValue(null);

      await expect(service.assertExistsOrThrow('missing')).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
