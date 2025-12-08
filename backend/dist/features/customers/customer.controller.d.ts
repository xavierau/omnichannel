import { Request, Response } from 'express';
import { CustomerService } from './customer.service';
export declare class CustomerController {
    private customerService;
    constructor(customerService: CustomerService);
    listCustomers: (req: Request, res: Response, next: import("express").NextFunction) => void;
    getCustomer: (req: Request, res: Response, next: import("express").NextFunction) => void;
    createCustomer: (req: Request, res: Response, next: import("express").NextFunction) => void;
    updateCustomer: (req: Request, res: Response, next: import("express").NextFunction) => void;
    deleteCustomer: (req: Request, res: Response, next: import("express").NextFunction) => void;
    bulkDelete: (req: Request, res: Response, next: import("express").NextFunction) => void;
    bulkUpdateTags: (req: Request, res: Response, next: import("express").NextFunction) => void;
    exportCustomers: (req: Request, res: Response, next: import("express").NextFunction) => void;
}
