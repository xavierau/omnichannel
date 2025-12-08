import { Provider } from './provider.entity';
export declare class ProviderRepository {
    private _repository;
    /**
     * Lazy initialization of the repository to ensure AppDataSource is initialized.
     */
    private get repository();
    findAll(): Promise<Provider[]>;
    findActive(): Promise<Provider[]>;
    findById(id: string): Promise<Provider | null>;
    findByCode(code: string): Promise<Provider | null>;
    findByCodeOrFail(code: string): Promise<Provider>;
    findByChannelId(channelId: string): Promise<Provider[]>;
    findByChannel(channelId: string, options?: {
        isActive?: boolean;
    }): Promise<Provider[]>;
    findByChannelCode(channelCode: string): Promise<Provider[]>;
}
