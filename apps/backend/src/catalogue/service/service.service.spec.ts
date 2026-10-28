import { NotFoundException } from '@nestjs/common';
import { ServiceService } from './service.service';
import type { PrismaService } from '../../prisma/prisma.service';
import type { CategoryService } from '../category/category.service';

describe('ServiceService', () => {
  let prisma: {
    service: {
      create: jest.Mock;
      findMany: jest.Mock;
      findUnique: jest.Mock;
      update: jest.Mock;
    };
  };
  let categoryService: { assertExistsOrThrow: jest.Mock };
  let service: ServiceService;

  beforeEach(() => {
    prisma = {
      service: {
        create: jest.fn(),
        findMany: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
      },
    };
    categoryService = {
      assertExistsOrThrow: jest.fn().mockResolvedValue(undefined),
    };
    service = new ServiceService(
      prisma as unknown as PrismaService,
      categoryService as unknown as CategoryService,
    );
  });

  describe('create', () => {
    it('validates categoryId before creating', async () => {
      prisma.service.create.mockResolvedValue({ id: 'svc-1' });

      await service.create({
        categoryId: 'cat-1',
        name: 'Ceiling Fan Installation',
      });

      expect(categoryService.assertExistsOrThrow).toHaveBeenCalledWith('cat-1');
      expect(prisma.service.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ categoryId: 'cat-1', tags: [] }),
      });
    });

    it('defaults tags to an empty array when omitted', async () => {
      prisma.service.create.mockResolvedValue({ id: 'svc-1' });

      await service.create({
        categoryId: 'cat-1',
        name: 'Ceiling Fan Installation',
      });

      const createCall = prisma.service.create.mock.calls[0][0];
      expect(createCall.data.tags).toEqual([]);
    });
  });

  describe('findOne', () => {
    it('throws NotFound for a missing service', async () => {
      prisma.service.findUnique.mockResolvedValue(null);

      await expect(service.findOne('missing')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('includes variants', async () => {
      const withVariants = { id: 'svc-1', variants: [{ id: 'var-1' }] };
      prisma.service.findUnique.mockResolvedValue(withVariants);

      const result = await service.findOne('svc-1');

      expect(prisma.service.findUnique).toHaveBeenCalledWith({
        where: { id: 'svc-1' },
        include: { variants: true },
      });
      expect(result).toBe(withVariants);
    });
  });

  describe('update', () => {
    it('throws NotFound when the service does not exist', async () => {
      prisma.service.findUnique.mockResolvedValue(null);

      await expect(service.update('missing', {})).rejects.toThrow(
        NotFoundException,
      );
    });

    it('validates a new categoryId when re-categorizing', async () => {
      prisma.service.findUnique.mockResolvedValue({ id: 'svc-1' });
      prisma.service.update.mockResolvedValue({});

      await service.update('svc-1', { categoryId: 'cat-2' });

      expect(categoryService.assertExistsOrThrow).toHaveBeenCalledWith('cat-2');
    });

    it('skips category validation when categoryId is not being changed', async () => {
      prisma.service.findUnique.mockResolvedValue({ id: 'svc-1' });
      prisma.service.update.mockResolvedValue({});

      await service.update('svc-1', { name: 'New name' });

      expect(categoryService.assertExistsOrThrow).not.toHaveBeenCalled();
    });
  });
});
