import { singleton, inject } from 'tsyringe';
import { CustomerRepository, CustomerQueryOptions, PaginatedResult } from './customer.repository';
import { TagRepository } from '../tags/tag.repository';
import { Customer } from './customer.entity';
import { CreateCustomerDto } from './dto/create-customer.dto';
import { UpdateCustomerDto } from './dto/update-customer.dto';
import {
  ConflictException,
  NotFoundException,
  BadRequestException,
} from '../../shared/exceptions/http-exceptions';
import { auditLogger } from '../../config/logger.config';

@singleton()
export class CustomerService {
  constructor(
    @inject(CustomerRepository) private customerRepository: CustomerRepository,
    @inject(TagRepository) private tagRepository: TagRepository
  ) {}

  async listCustomers(
    tenantId: string,
    options: CustomerQueryOptions
  ): Promise<PaginatedResult<Customer>> {
    return this.customerRepository.findAll(tenantId, options);
  }

  async getCustomer(id: string, tenantId: string): Promise<Customer> {
    const customer = await this.customerRepository.findById(id, tenantId);
    if (!customer) {
      throw new NotFoundException('Customer not found');
    }
    return customer;
  }

  async createCustomer(dto: CreateCustomerDto, tenantId: string): Promise<Customer> {
    // Check for duplicate WhatsApp number
    const exists = await this.customerRepository.existsByWhatsApp(
      dto.whatsappNumber,
      tenantId
    );
    if (exists) {
      throw new ConflictException('Customer with this WhatsApp number already exists');
    }

    // Validate and fetch tags
    let tags = undefined;
    if (dto.tagIds && dto.tagIds.length > 0) {
      tags = await this.tagRepository.findByIds(dto.tagIds, tenantId);
      if (tags.length !== dto.tagIds.length) {
        throw new BadRequestException('One or more tags not found');
      }
    }

    const customer = await this.customerRepository.create(
      {
        name: dto.name,
        whatsappNumber: dto.whatsappNumber,
        customFields: dto.customFields || {},
        tenantId,
      },
      tags
    );

    auditLogger.info('Customer created', {
      action: 'customer.create',
      tenantId,
      customerId: customer.id,
      whatsappNumber: customer.whatsappNumber,
    });

    return customer;
  }

  async updateCustomer(
    id: string,
    dto: UpdateCustomerDto,
    tenantId: string
  ): Promise<Customer> {
    const customer = await this.getCustomer(id, tenantId);

    // Check for duplicate WhatsApp if being updated
    if (dto.whatsappNumber && dto.whatsappNumber !== customer.whatsappNumber) {
      const exists = await this.customerRepository.existsByWhatsApp(
        dto.whatsappNumber,
        tenantId,
        id
      );
      if (exists) {
        throw new ConflictException('Customer with this WhatsApp number already exists');
      }
    }

    // Handle tags if provided
    let tags = undefined;
    if (dto.tagIds !== undefined) {
      if (dto.tagIds.length > 0) {
        tags = await this.tagRepository.findByIds(dto.tagIds, tenantId);
        if (tags.length !== dto.tagIds.length) {
          throw new BadRequestException('One or more tags not found');
        }
      } else {
        tags = [];
      }
    }

    const updateData: Partial<Customer> = {};
    if (dto.name !== undefined) updateData.name = dto.name;
    if (dto.whatsappNumber !== undefined) updateData.whatsappNumber = dto.whatsappNumber;
    if (dto.customFields !== undefined) {
      // Merge custom fields instead of replacing
      updateData.customFields = {
        ...customer.customFields,
        ...dto.customFields,
      };
    }

    const updated = await this.customerRepository.update(id, tenantId, updateData, tags);
    if (!updated) {
      throw new NotFoundException('Customer not found');
    }

    auditLogger.info('Customer updated', {
      action: 'customer.update',
      tenantId,
      customerId: id,
      changes: Object.keys(dto),
    });

    return updated;
  }

  async deleteCustomer(id: string, tenantId: string): Promise<void> {
    const customer = await this.getCustomer(id, tenantId);

    const deleted = await this.customerRepository.delete(id, tenantId);
    if (!deleted) {
      throw new NotFoundException('Customer not found');
    }

    auditLogger.info('Customer deleted', {
      action: 'customer.delete',
      tenantId,
      customerId: id,
      whatsappNumber: customer.whatsappNumber,
    });
  }

  async bulkDelete(ids: string[], tenantId: string): Promise<number> {
    const affected = await this.customerRepository.bulkDelete(ids, tenantId);

    auditLogger.info('Customers bulk deleted', {
      action: 'customer.bulk_delete',
      tenantId,
      requestedCount: ids.length,
      deletedCount: affected,
    });

    return affected;
  }

  async bulkUpdateTags(
    customerIds: string[],
    tagIds: string[],
    action: 'add' | 'remove' | 'replace',
    tenantId: string
  ): Promise<number> {
    // Validate tags exist
    const tags = tagIds.length > 0
      ? await this.tagRepository.findByIds(tagIds, tenantId)
      : [];

    if (tagIds.length > 0 && tags.length !== tagIds.length) {
      throw new BadRequestException('One or more tags not found');
    }

    const affected = await this.customerRepository.bulkUpdateTags(
      customerIds,
      tags,
      action,
      tenantId
    );

    auditLogger.info('Customers bulk tags updated', {
      action: 'customer.bulk_tags',
      tenantId,
      operation: action,
      requestedCount: customerIds.length,
      affectedCount: affected,
      tagCount: tagIds.length,
    });

    return affected;
  }

  async exportCustomers(
    tenantId: string,
    options: CustomerQueryOptions
  ): Promise<string> {
    const customers = await this.customerRepository.findAllForExport(tenantId, options);

    // Generate CSV
    const headers = ['ID', 'Name', 'WhatsApp Number', 'Tags', 'Created At', 'Updated At'];
    const rows = customers.map((c) => [
      this.escapeCsvField(c.id),
      this.escapeCsvField(c.name),
      this.escapeCsvField(c.whatsappNumber),
      this.escapeCsvField(c.tags.map((t) => t.name).join(', ')),
      this.escapeCsvField(c.createdAt.toISOString()),
      this.escapeCsvField(c.updatedAt.toISOString()),
    ]);

    const csv = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');

    auditLogger.info('Customers exported', {
      action: 'customer.export',
      tenantId,
      count: customers.length,
    });

    return csv;
  }

  /**
   * Escape CSV field to prevent CSV injection attacks
   * Prefixes dangerous characters with single quote
   */
  private escapeCsvField(value: string): string {
    if (value === null || value === undefined) return '';

    const stringValue = String(value);

    // Check for formula injection characters
    const dangerousChars = ['=', '+', '-', '@', '\t', '\r', '\n'];
    const needsQuoting =
      dangerousChars.some((char) => stringValue.startsWith(char)) ||
      stringValue.includes(',') ||
      stringValue.includes('"') ||
      stringValue.includes('\n');

    if (needsQuoting) {
      // Escape double quotes and wrap in quotes
      const escaped = stringValue.replace(/"/g, '""');
      // Prefix with single quote if starts with dangerous char (to prevent formula execution)
      const prefix = dangerousChars.some((char) => stringValue.startsWith(char))
        ? "'"
        : '';
      return `"${prefix}${escaped}"`;
    }

    return stringValue;
  }
}
