import { Request, Response } from 'express';
import { TagService } from './tag.service';
export declare class TagController {
    private tagService;
    constructor(tagService: TagService);
    listTags: (req: Request, res: Response, next: import("express").NextFunction) => void;
    getTag: (req: Request, res: Response, next: import("express").NextFunction) => void;
    createTag: (req: Request, res: Response, next: import("express").NextFunction) => void;
    updateTag: (req: Request, res: Response, next: import("express").NextFunction) => void;
    deleteTag: (req: Request, res: Response, next: import("express").NextFunction) => void;
}
