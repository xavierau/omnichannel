import { Repository } from 'typeorm';
import { singleton } from 'tsyringe';
import { AppDataSource } from '@config/database.config';
import { Media, MediaType } from './media.entity';

/**
 * Data required to create a new media record
 */
export interface CreateMediaData {
  tenantId: string;
  type: MediaType;
  originalName: string;
  mimeType: string;
  fileSize: number;
  s3Key: string;
  s3Bucket: string;
  uploadedBy: string;
}

/**
 * Repository for Media entity operations
 *
 * Handles all database operations for media records.
 * All operations are tenant-scoped for multi-tenancy security.
 */
@singleton()
export class MediaRepository {
  private _repository: Repository<Media> | null = null;

  /**
   * Lazy initialization of the repository to ensure AppDataSource is initialized.
   */
  private get repository(): Repository<Media> {
    if (!this._repository) {
      this._repository = AppDataSource.getRepository(Media);
    }
    return this._repository;
  }

  /**
   * Creates a new media record
   *
   * @param data - Media creation data
   * @returns Created media record
   */
  async create(data: CreateMediaData): Promise<Media> {
    const media = this.repository.create(data);
    return this.repository.save(media);
  }

  /**
   * Finds a media record by ID within a tenant
   *
   * @param id - Media UUID
   * @param tenantId - Tenant UUID for scoping
   * @returns Media record or null if not found
   */
  async findById(id: string, tenantId: string): Promise<Media | null> {
    return this.repository.findOne({
      where: { id, tenantId },
    });
  }

  /**
   * Deletes a media record by ID within a tenant
   *
   * @param id - Media UUID
   * @param tenantId - Tenant UUID for scoping
   * @returns True if record was deleted, false if not found
   */
  async delete(id: string, tenantId: string): Promise<boolean> {
    const result = await this.repository.delete({ id, tenantId });
    return (result.affected ?? 0) > 0;
  }

  /**
   * Finds all media records for a tenant
   *
   * @param tenantId - Tenant UUID for scoping
   * @param limit - Maximum number of records to return
   * @param offset - Number of records to skip
   * @returns Array of media records
   */
  async findByTenant(
    tenantId: string,
    limit: number = 50,
    offset: number = 0
  ): Promise<Media[]> {
    return this.repository.find({
      where: { tenantId },
      order: { createdAt: 'DESC' },
      take: limit,
      skip: offset,
    });
  }

  /**
   * Counts total media records for a tenant
   *
   * @param tenantId - Tenant UUID for scoping
   * @returns Count of media records
   */
  async countByTenant(tenantId: string): Promise<number> {
    return this.repository.count({
      where: { tenantId },
    });
  }

  /**
   * Finds media records by type for a tenant
   *
   * @param tenantId - Tenant UUID for scoping
   * @param type - Media type filter
   * @returns Array of media records
   */
  async findByType(tenantId: string, type: MediaType): Promise<Media[]> {
    return this.repository.find({
      where: { tenantId, type },
      order: { createdAt: 'DESC' },
    });
  }
}
