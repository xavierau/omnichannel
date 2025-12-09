"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CustomerController = void 0;
const tsyringe_1 = require("tsyringe");
const customer_service_1 = require("./customer.service");
const async_handler_1 = require("../../middleware/async-handler");
const customer_presenter_1 = require("./customer.presenter");
let CustomerController = class CustomerController {
    customerService;
    constructor(customerService) {
        this.customerService = customerService;
    }
    listCustomers = (0, async_handler_1.asyncHandler)(async (req, res) => {
        // tenantId is guaranteed by requireTenant middleware
        const tenantId = req.tenantId;
        const options = {
            search: req.query.search,
            tagIds: req.query.tagIds
                ? Array.isArray(req.query.tagIds)
                    ? req.query.tagIds
                    : [req.query.tagIds]
                : undefined,
            dateFrom: req.query.dateFrom,
            dateTo: req.query.dateTo,
            page: parseInt(req.query.page) || 1,
            limit: parseInt(req.query.limit) || 20,
            sortBy: req.query.sortBy || 'createdAt',
            sortOrder: req.query.sortOrder || 'desc',
        };
        const result = await this.customerService.listCustomers(tenantId, options);
        res.json((0, customer_presenter_1.toPaginatedCustomerResponse)(result.data, result.total, result.page, result.limit, result.totalPages));
    });
    getCustomer = (0, async_handler_1.asyncHandler)(async (req, res) => {
        const { id } = req.params;
        const tenantId = req.tenantId;
        const customer = await this.customerService.getCustomer(id, tenantId);
        res.json({
            data: (0, customer_presenter_1.toCustomerResponse)(customer),
        });
    });
    createCustomer = (0, async_handler_1.asyncHandler)(async (req, res) => {
        const tenantId = req.tenantId;
        const customer = await this.customerService.createCustomer(req.body, tenantId);
        res.status(201).json({
            data: (0, customer_presenter_1.toCustomerResponse)(customer),
        });
    });
    updateCustomer = (0, async_handler_1.asyncHandler)(async (req, res) => {
        const { id } = req.params;
        const tenantId = req.tenantId;
        const customer = await this.customerService.updateCustomer(id, req.body, tenantId);
        res.json({
            data: (0, customer_presenter_1.toCustomerResponse)(customer),
        });
    });
    deleteCustomer = (0, async_handler_1.asyncHandler)(async (req, res) => {
        const { id } = req.params;
        const tenantId = req.tenantId;
        await this.customerService.deleteCustomer(id, tenantId);
        res.status(204).send();
    });
    bulkDelete = (0, async_handler_1.asyncHandler)(async (req, res) => {
        const tenantId = req.tenantId;
        const { ids } = req.body;
        const affected = await this.customerService.bulkDelete(ids, tenantId);
        res.json({
            data: {
                affected,
            },
        });
    });
    bulkUpdateTags = (0, async_handler_1.asyncHandler)(async (req, res) => {
        const tenantId = req.tenantId;
        const { customerIds, tagIds, action } = req.body;
        const affected = await this.customerService.bulkUpdateTags(customerIds, tagIds, action, tenantId);
        res.json({
            data: {
                affected,
            },
        });
    });
    exportCustomers = (0, async_handler_1.asyncHandler)(async (req, res) => {
        const tenantId = req.tenantId;
        const options = {
            search: req.query.search,
            tagIds: req.query.tagIds
                ? Array.isArray(req.query.tagIds)
                    ? req.query.tagIds
                    : [req.query.tagIds]
                : undefined,
            dateFrom: req.query.dateFrom,
            dateTo: req.query.dateTo,
            sortBy: req.query.sortBy || 'createdAt',
            sortOrder: req.query.sortOrder || 'desc',
        };
        const csv = await this.customerService.exportCustomers(tenantId, options);
        const filename = `customers_export_${new Date().toISOString().split('T')[0]}.csv`;
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        res.send(csv);
    });
};
exports.CustomerController = CustomerController;
exports.CustomerController = CustomerController = __decorate([
    (0, tsyringe_1.singleton)(),
    __param(0, (0, tsyringe_1.inject)(customer_service_1.CustomerService)),
    __metadata("design:paramtypes", [customer_service_1.CustomerService])
], CustomerController);
