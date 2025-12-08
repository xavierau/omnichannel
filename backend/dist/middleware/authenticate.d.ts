import { Request, Response, NextFunction } from 'express';
export declare const authenticate: any;
export declare const handleAuthError: (err: Error & {
    name?: string;
}, req: Request, res: Response, next: NextFunction) => Response<any, Record<string, any>> | undefined;
