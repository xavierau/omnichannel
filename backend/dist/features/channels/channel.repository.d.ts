import { Channel } from './channel.entity';
export declare class ChannelRepository {
    private _repository;
    /**
     * Lazy initialization of the repository to ensure AppDataSource is initialized.
     */
    private get repository();
    findAll(): Promise<Channel[]>;
    findActive(): Promise<Channel[]>;
    findById(id: string): Promise<Channel | null>;
    findByCode(code: string): Promise<Channel | null>;
    findByCodeOrFail(code: string): Promise<Channel>;
}
