import { TagRepository } from './tag.repository';
import { Tag } from './tag.entity';
import { CreateTagDto } from './dto/create-tag.dto';
import { UpdateTagDto } from './dto/update-tag.dto';
export declare class TagService {
    private tagRepository;
    constructor(tagRepository: TagRepository);
    findAll(tenantId: string): Promise<Tag[]>;
    findById(id: string, tenantId: string): Promise<Tag>;
    findByIds(ids: string[], tenantId: string): Promise<Tag[]>;
    create(dto: CreateTagDto, tenantId: string): Promise<Tag>;
    update(id: string, dto: UpdateTagDto, tenantId: string): Promise<Tag>;
    delete(id: string, tenantId: string): Promise<void>;
}
