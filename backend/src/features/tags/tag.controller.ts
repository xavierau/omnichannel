import { Request, Response } from 'express';
import { inject, singleton } from 'tsyringe';
import { TagService } from './tag.service';
import { asyncHandler } from '@middleware/async-handler';

/**
 * Response structure for a tag.
 */
interface TagResponse {
  id: string;
  name: string;
  color: string;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Transforms a Tag entity to its API response format.
 */
function toTagResponse(tag: {
  id: string;
  name: string;
  color: string;
  createdAt: Date;
  updatedAt: Date;
}): TagResponse {
  return {
    id: tag.id,
    name: tag.name,
    color: tag.color,
    createdAt: tag.createdAt,
    updatedAt: tag.updatedAt,
  };
}

@singleton()
export class TagController {
  constructor(@inject(TagService) private tagService: TagService) {}

  listTags = asyncHandler(async (req: Request, res: Response) => {
    // tenantId is guaranteed by requireTenant middleware
    const tenantId = req.tenantId!;

    const tags = await this.tagService.findAll(tenantId);

    res.json({
      data: tags.map(toTagResponse),
    });
  });

  getTag = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const tenantId = req.tenantId!;

    const tag = await this.tagService.findById(id, tenantId);

    res.json({
      data: toTagResponse(tag),
    });
  });

  createTag = asyncHandler(async (req: Request, res: Response) => {
    const tenantId = req.tenantId!;

    const tag = await this.tagService.create(req.body, tenantId);

    res.status(201).json({
      data: toTagResponse(tag),
    });
  });

  updateTag = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const tenantId = req.tenantId!;

    const tag = await this.tagService.update(id, req.body, tenantId);

    res.json({
      data: toTagResponse(tag),
    });
  });

  deleteTag = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const tenantId = req.tenantId!;

    await this.tagService.delete(id, tenantId);

    res.status(204).send();
  });
}
