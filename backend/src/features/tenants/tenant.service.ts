import { singleton, inject } from 'tsyringe';
import { TenantRepository } from './tenant.repository';
import { Tenant } from './tenant.entity';
import { ConflictException, NotFoundException } from '../../shared/exceptions/http-exceptions';
import { auditLogger } from '../../config/logger.config';

interface CreateTenantDto {
  name: string;
  slug: string;
}

interface UpdateTenantDto {
  name?: string;
  slug?: string;
  isActive?: boolean;
}

@singleton()
export class TenantService {
  constructor(
    @inject(TenantRepository) private tenantRepository: TenantRepository
  ) {}

  async findAll(): Promise<Tenant[]> {
    return this.tenantRepository.findAll();
  }

  async findById(id: string): Promise<Tenant> {
    const tenant = await this.tenantRepository.findById(id);
    if (!tenant) {
      throw new NotFoundException('Tenant not found');
    }
    return tenant;
  }

  async findBySlug(slug: string): Promise<Tenant> {
    const tenant = await this.tenantRepository.findBySlug(slug);
    if (!tenant) {
      throw new NotFoundException('Tenant not found');
    }
    return tenant;
  }

  async create(dto: CreateTenantDto): Promise<Tenant> {
    // Check for duplicate slug
    const exists = await this.tenantRepository.existsBySlug(dto.slug);
    if (exists) {
      throw new ConflictException('Tenant with this slug already exists');
    }

    const tenant = await this.tenantRepository.create(dto);

    auditLogger.info('Tenant created', {
      action: 'tenant.create',
      tenantId: tenant.id,
      slug: tenant.slug,
    });

    return tenant;
  }

  async update(id: string, dto: UpdateTenantDto): Promise<Tenant> {
    const tenant = await this.findById(id);

    // Check for duplicate slug if being updated
    if (dto.slug && dto.slug !== tenant.slug) {
      const exists = await this.tenantRepository.existsBySlug(dto.slug, id);
      if (exists) {
        throw new ConflictException('Tenant with this slug already exists');
      }
    }

    const updated = await this.tenantRepository.update(id, dto);
    if (!updated) {
      throw new NotFoundException('Tenant not found');
    }

    auditLogger.info('Tenant updated', {
      action: 'tenant.update',
      tenantId: id,
      changes: dto,
    });

    return updated;
  }

  async delete(id: string): Promise<void> {
    const tenant = await this.findById(id);

    const deleted = await this.tenantRepository.delete(id);
    if (!deleted) {
      throw new NotFoundException('Tenant not found');
    }

    auditLogger.info('Tenant deleted', {
      action: 'tenant.delete',
      tenantId: id,
      slug: tenant.slug,
    });
  }
}
