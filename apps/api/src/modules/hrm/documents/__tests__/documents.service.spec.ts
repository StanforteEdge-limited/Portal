import { BadRequestException, NotFoundException } from '@nestjs/common';
import { DocumentsService } from '$modules/hrm/documents/documents.service';

function buildClient() {
  let idx = 0;
  const queue: any[] = [];
  const chain: any = {};
  const METHODS = [
    'select', 'from', 'where', 'limit', 'offset', 'orderBy', 'leftJoin',
    'insert', 'update', 'delete', 'set', 'values', 'returning',
    '$dynamic', 'groupBy', 'having', 'onConflictDoUpdate', 'onConflictDoNothing',
  ];
  for (const m of METHODS) chain[m] = jest.fn(() => chain);
  chain.then = (onFulfilled: (value: any) => any) => {
    if (idx >= queue.length) throw new Error(`No mock result for query #${idx + 1}`);
    return Promise.resolve(onFulfilled(queue[idx++]));
  };
  chain.setResults = (...results: any[]) => {
    queue.length = 0;
    queue.push(...results);
    idx = 0;
  };
  return chain;
}

describe('DocumentsService', () => {
  const db: any = { client: buildClient() };
  const tenantContext: any = { currentTenantId: jest.fn().mockReturnValue(1n) };

  const service = new DocumentsService(db, tenantContext);

  const rowWithDetails = (id: string) => ({
    row: { id, title: 'My Document', slug: 'my-document' },
    file: null,
    organization: null,
  });

  beforeEach(() => jest.clearAllMocks());

  describe('create', () => {
    it('throws BadRequestException when no content, file, or link provided', async () => {
      await expect(
        service.create({ title: 'Test', content_html: '', file_id: null, link_url: null } as any, '1')
      ).rejects.toThrow('Either content_html, file_id, or link_url is required');
      expect(db.client.insert).not.toHaveBeenCalled();
    });

    it('throws BadRequestException when slug already exists', async () => {
      db.client.setResults([[{ id: 'existing', slug: 'test-doc' }]]);

      await expect(
        service.create({ title: 'Test', content_html: '<p>Hi</p>' } as any, '1')
      ).rejects.toThrow('Slug already exists');
    });

    it('throws NotFoundException when referenced file not found', async () => {
      db.client.setResults([[], null]);

      await expect(
        service.create({ title: 'Test', file_id: 'file-1' } as any, '1')
      ).rejects.toThrow(NotFoundException);
    });

    it('creates document with auto-generated slug', async () => {
      db.client.setResults([[], [{ id: 'doc-1', slug: 'my-document' }], rowWithDetails('doc-1')]);

      const result = await service.create({ title: 'My Document', content_html: '<p>Hello</p>' } as any, '1');

      expect(result.id).toBe('doc-1');
      expect(db.client.insert).toHaveBeenCalled();
    });
  });

  describe('get', () => {
    it('throws NotFoundException when document not found', async () => {
      db.client.setResults([null]);

      await expect(service.get('1', 'bad-id')).rejects.toThrow(NotFoundException);
    });

    it('returns serialized document when found', async () => {
      db.client.setResults([rowWithDetails('doc-1'), []]);

      const result = await service.get('1', 'doc-1');

      expect(result.id).toBe('doc-1');
    });
  });

  describe('update', () => {
    it('throws NotFoundException when document not found', async () => {
      db.client.setResults([[]]);

      await expect(service.update('bad-id', { title: 'Updated' } as any, '1')).rejects.toThrow(NotFoundException);
    });

    it('throws BadRequestException when new slug conflicts with another document', async () => {
      db.client.setResults([[{ id: 'doc-1', slug: 'old-slug' }], [{ id: 'doc-2', slug: 'new-slug' }]]);

      await expect(
        service.update('doc-1', { slug: 'new-slug' } as any, '1')
      ).rejects.toThrow('Slug already exists');
    });

    it('updates document successfully', async () => {
      db.client.setResults([[{ id: 'doc-1', slug: 'test' }], [], rowWithDetails('doc-1')]);

      const result = await service.update('doc-1', { title: 'Updated' } as any, '1');

      expect(result.id).toBe('doc-1');
      expect(db.client.update).toHaveBeenCalled();
    });
  });

  describe('acknowledge', () => {
    it('throws NotFoundException when document not found', async () => {
      db.client.setResults([[]]);

      await expect(service.acknowledge('bad-id', '1', {}, {} as any)).rejects.toThrow(NotFoundException);
    });

    it('creates (and upserts) an acknowledgement record', async () => {
      db.client.setResults([
        [{ id: 'doc-1' }],
        [{
          id: 'ack-1',
          documentId: 'doc-1',
          userId: 1n,
          version: '1.0',
          acknowledgedAt: new Date(),
          ipAddress: '127.0.0.1',
          userAgent: 'jest',
        }],
      ]);

      const result = await service.acknowledge('doc-1', '1', { headers: {}, ip: '127.0.0.1' }, { version: '1.0' } as any);

      expect(result.document_id).toBe('doc-1');
      expect(result.version).toBe('1.0');
      expect(result.ip_address).toBe('127.0.0.1');
      expect(db.client.insert).toHaveBeenCalled();
    });
  });

  describe('listAcknowledgements', () => {
    it('throws NotFoundException when document not found', async () => {
      db.client.setResults([[]]);

      await expect(service.listAcknowledgements('bad-id', {})).rejects.toThrow(NotFoundException);
    });

    it('returns paginated acknowledgements', async () => {
      db.client.setResults([[{ id: 'doc-1' }], [], [{ value: 0 }]]);

      const result = await service.listAcknowledgements('doc-1', {});

      expect(result.data).toHaveLength(0);
      expect(result.meta.total).toBe(0);
    });
  });

  describe('list', () => {
    it('returns paginated documents', async () => {
      db.client.setResults([[], [{ value: 0 }]]);

      const result = await service.list('1', {});

      expect(result.data).toHaveLength(0);
      expect(result.meta.total).toBe(0);
    });
  });
});