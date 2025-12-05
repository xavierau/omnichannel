import { Request, Response } from 'express';
import { inject, singleton } from 'tsyringe';
import { CustomerService } from './customer.service';
import { asyncHandler } from '@middleware/async-handler';
import { CustomerQueryOptions } from './customer.repository';
import { toCustomerResponse, toPaginatedCustomerResponse } from './customer.presenter';

@singleton()
export class CustomerController {
  constructor(@inject(CustomerService) private customerService: CustomerService) {}

  listCustomers = asyncHandler(async (req: Request, res: Response) => {
    // tenantId is guaranteed by requireTenant middleware
    const tenantId = req.tenantId!;

    const options: CustomerQueryOptions = {
      search: req.query.search as string,
      tagIds: req.query.tagIds
        ? Array.isArray(req.query.tagIds)
          ? (req.query.tagIds as string[])
          : [req.query.tagIds as string]
        : undefined,
      dateFrom: req.query.dateFrom as string,
      dateTo: req.query.dateTo as string,
      page: parseInt(req.query.page as string) || 1,
      limit: parseInt(req.query.limit as string) || 20,
      sortBy: (req.query.sortBy as string) || 'createdAt',
      sortOrder: (req.query.sortOrder as 'asc' | 'desc') || 'desc',
    };

    const result = await this.customerService.listCustomers(tenantId, options);

    res.json(
      toPaginatedCustomerResponse(
        result.data,
        result.total,
        result.page,
        result.limit,
        result.totalPages
      )
    );
  });

  getCustomer = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const tenantId = req.tenantId!;

    const customer = await this.customerService.getCustomer(id, tenantId);

    res.json({
      data: toCustomerResponse(customer),
    });
  });

  createCustomer = asyncHandler(async (req: Request, res: Response) => {
    const tenantId = req.tenantId!;

    const customer = await this.customerService.createCustomer(req.body, tenantId);

    res.status(201).json({
      data: toCustomerResponse(customer),
    });
  });

  updateCustomer = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const tenantId = req.tenantId!;

    const customer = await this.customerService.updateCustomer(id, req.body, tenantId);

    res.json({
      data: toCustomerResponse(customer),
    });
  });

  deleteCustomer = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const tenantId = req.tenantId!;

    await this.customerService.deleteCustomer(id, tenantId);

    res.status(204).send();
  });

  bulkDelete = asyncHandler(async (req: Request, res: Response) => {
    const tenantId = req.tenantId!;

    const { ids } = req.body;
    const affected = await this.customerService.bulkDelete(ids, tenantId);

    res.json({
      data: {
        affected,
      },
    });
  });

  bulkUpdateTags = asyncHandler(async (req: Request, res: Response) => {
    const tenantId = req.tenantId!;

    const { customerIds, tagIds, action } = req.body;
    const affected = await this.customerService.bulkUpdateTags(
      customerIds,
      tagIds,
      action,
      tenantId
    );

    res.json({
      data: {
        affected,
      },
    });
  });

  exportCustomers = asyncHandler(async (req: Request, res: Response) => {
    const tenantId = req.tenantId!;

    const options: CustomerQueryOptions = {
      search: req.query.search as string,
      tagIds: req.query.tagIds
        ? Array.isArray(req.query.tagIds)
          ? (req.query.tagIds as string[])
          : [req.query.tagIds as string]
        : undefined,
      dateFrom: req.query.dateFrom as string,
      dateTo: req.query.dateTo as string,
      sortBy: (req.query.sortBy as string) || 'createdAt',
      sortOrder: (req.query.sortOrder as 'asc' | 'desc') || 'desc',
    };

    const csv = await this.customerService.exportCustomers(tenantId, options);

    const filename = `customers_export_${new Date().toISOString().split('T')[0]}.csv`;

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(csv);
  });
}
