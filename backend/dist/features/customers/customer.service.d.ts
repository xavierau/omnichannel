import { CustomerRepository, CustomerQueryOptions, PaginatedResult } from './customer.repository';
import { TagRepository } from '../tags/tag.repository';
import { Customer } from './customer.entity';
import { CreateCustomerDto } from './dto/create-customer.dto';
import { UpdateCustomerDto } from './dto/update-customer.dto';
export declare class CustomerService {
    private customerRepository;
    private tagRepository;
    constructor(customerRepository: CustomerRepository, tagRepository: TagRepository);
    listCustomers(tenantId: string, options: CustomerQueryOptions): Promise<PaginatedResult<Customer>>;
    getCustomer(id: string, tenantId: string): Promise<Customer>;
    createCustomer(dto: CreateCustomerDto, tenantId: string): Promise<Customer>;
    updateCustomer(id: string, dto: UpdateCustomerDto, tenantId: string): Promise<Customer>;
    deleteCustomer(id: string, tenantId: string): Promise<void>;
    bulkDelete(ids: string[], tenantId: string): Promise<number>;
    bulkUpdateTags(customerIds: string[], tagIds: string[], action: 'add' | 'remove' | 'replace', tenantId: string): Promise<number>;
    exportCustomers(tenantId: string, options: CustomerQueryOptions): Promise<string>;
    /**
     * Escape CSV field to prevent CSV injection attacks
     * Prefixes dangerous characters with single quote
     */
    private escapeCsvField;
}
