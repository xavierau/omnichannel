import { singleton, inject } from 'tsyringe';
import { TagRepository } from './tag.repository';
import { Tag } from './tag.entity';
import { CreateTagDto } from './dto/create-tag.dto';
import { UpdateTagDto } from './dto/update-tag.dto';
import { ConflictException, NotFoundException } from '../../shared/exceptions/http-exceptions';
import { auditLogger } from '../../config/logger.config';

@singleton()
export class TagService {
  constructor(@inject(TagRepository) private tagRepository: TagRepository) {}

  async findAll(tenantId: string): Promise<Tag[]> {
    return this.tagRepository.findByTenantId(tenantId);
  }

  async findById(id: string, tenantId: string): Promise<Tag> {
    const tag = await this.tagRepository.findById(id, tenantId);
    if (!tag) {
      throw new NotFoundException('Tag not found');
    }
    return tag;
  }

  async findByIds(ids: string[], tenantId: string): Promise<Tag[]> {
    return this.tagRepository.findByIds(ids, tenantId);
  }

  async create(dto: CreateTagDto, tenantId: string): Promise<Tag> {
    // Check for duplicate name within tenant
    const exists = await this.tagRepository.existsByName(dto.name, tenantId);
    if (exists) {
      throw new ConflictException('Tag with this name already exists');
    }

    const tag = await this.tagRepository.create({
      ...dto,
      tenantId,
    });

    auditLogger.info('Tag created', {
      action: 'tag.create',
      tenantId,
      tagId: tag.id,
      tagName: tag.name,
    });

    return tag;
  }

  async update(id: string, dto: UpdateTagDto, tenantId: string): Promise<Tag> {
    const tag = await this.findById(id, tenantId);

    // Check for duplicate name if being updated
    if (dto.name && dto.name !== tag.name) {
      const exists = await this.tagRepository.existsByName(dto.name, tenantId, id);
      if (exists) {
        throw new ConflictException('Tag with this name already exists');
      }
    }

    const updated = await this.tagRepository.update(id, tenantId, dto);
    if (!updated) {
      throw new NotFoundException('Tag not found');
    }

    auditLogger.info('Tag updated', {
      action: 'tag.update',
      tenantId,
      tagId: id,
      changes: dto,
    });

    return updated;
  }

  async delete(id: string, tenantId: string): Promise<void> {
    const tag = await this.findById(id, tenantId);

    const deleted = await this.tagRepository.delete(id, tenantId);
    if (!deleted) {
      throw new NotFoundException('Tag not found');
    }

    auditLogger.info('Tag deleted', {
      action: 'tag.delete',
      tenantId,
      tagId: id,
      tagName: tag.name,
    });
  }
}
