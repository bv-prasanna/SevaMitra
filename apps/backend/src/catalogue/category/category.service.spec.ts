import { ConflictException, NotFoundException } from '@nestjs/common';
import { CategoryService } from './category.service';
import type { PrismaService } from '../../prisma/prisma.service';

describe('CategoryService', () => {
  let prisma: {
    serviceCategory: {
      findUnique: jest.Mock;
      create: jest.Mock;
      findMany: jest.Mock;
      update: jest.Mock;
    };
  };
  let service: CategoryService;

  beforeEach(() => {
    prisma = {
      serviceCategory: {
        findUnique: jest.fn(),
        create: jest.fn(),
        findMany: jest.fn(),
        update: jest.fn(),
      },
    };
    service = new CategoryService(prisma as unknown as PrismaService);
  });

  describe('create', () => {
    it('rejects a duplicate name', async () => {
      prisma.serviceCategory.findUnique.mockResolvedValue({ id: 'cat-1' });

      await expect(
        service.create({ name: 'Home Repair & Maintenance' }),
      ).rejects.toThrow(ConflictException);
      expect(prisma.serviceCategory.create).not.toHaveBeenCalled();
    });

    it('creates a category when the name is free', async () => {
      prisma.serviceCategory.findUnique.mockResolvedValue(null);
      prisma.serviceCategory.create.mockResolvedValue({ id: 'cat-1' });

      await service.create({ name: 'Home Repair & Maintenance' });

      expect(prisma.serviceCategory.create).toHaveBeenCalledWith({
        data: { name: 'Home Repair & Maintenance', description: undefined },
      });
    });
  });

  describe('findOne', () => {
    it('throws NotFound for a missing category', async () => {
      prisma.serviceCategory.findUnique.mockResolvedValue(null);

      await expect(service.findOne('missing')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('update', () => {
    it('throws NotFound when the category does not exist', async () => {
      prisma.serviceCategory.findUnique.mockResolvedValue(null);

      await expect(service.update('missing', { name: 'New' })).rejects.toThrow(
        NotFoundException,
      );
    });

    it('allows renaming to the same name (no self-conflict)', async () => {
      prisma.serviceCategory.findUnique
        .mockResolvedValueOnce({ id: 'cat-1', name: 'Old Name' }) // findOne existence check
        .mockResolvedValueOnce({ id: 'cat-1', name: 'Old Name' }); // duplicate-name check
      prisma.serviceCategory.update.mockResolvedValue({});

      await expect(
        service.update('cat-1', { name: 'Old Name' }),
      ).resolves.toBeDefined();
    });

    it('rejects renaming to a name already used by a different category', async () => {
      prisma.serviceCategory.findUnique
        .mockResolvedValueOnce({ id: 'cat-1' }) // findOne
        .mockResolvedValueOnce({ id: 'cat-2' }); // duplicate-name check, different id

      await expect(
        service.update('cat-1', { name: 'Taken Name' }),
      ).rejects.toThrow(ConflictException);
      expect(prisma.serviceCategory.update).not.toHaveBeenCalled();
    });
  });

  describe('assertExistsOrThrow', () => {
    it('throws NotFound for a missing category', async () => {
      prisma.serviceCategory.findUnique.mockResolvedValue(null);

      await expect(service.assertExistsOrThrow('missing')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('resolves for an existing category', async () => {
      prisma.serviceCategory.findUnique.mockResolvedValue({ id: 'cat-1' });

      await expect(
        service.assertExistsOrThrow('cat-1'),
      ).resolves.toBeUndefined();
    });
  });
});
