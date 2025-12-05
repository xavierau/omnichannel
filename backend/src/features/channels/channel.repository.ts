import { singleton } from 'tsyringe';
import { Repository } from 'typeorm';
import { AppDataSource } from '../../config/database.config';
import { Channel } from './channel.entity';

@singleton()
export class ChannelRepository {
  private repository: Repository<Channel>;

  constructor() {
    this.repository = AppDataSource.getRepository(Channel);
  }

  async findAll(): Promise<Channel[]> {
    return this.repository.find({
      order: { name: 'ASC' },
    });
  }

  async findActive(): Promise<Channel[]> {
    return this.repository.find({
      where: { isActive: true },
      order: { name: 'ASC' },
    });
  }

  async findById(id: string): Promise<Channel | null> {
    return this.repository.findOne({ where: { id } });
  }

  async findByCode(code: string): Promise<Channel | null> {
    return this.repository.findOne({ where: { code } });
  }

  async findByCodeOrFail(code: string): Promise<Channel> {
    const channel = await this.findByCode(code);
    if (!channel) {
      throw new Error(`Channel with code '${code}' not found`);
    }
    return channel;
  }
}
