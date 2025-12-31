import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Raw, Repository } from 'typeorm';
import { Channel } from '../entities/channel.entity';

@Injectable()
export class ChannelRepository {
  constructor(
    @InjectRepository(Channel)
    private readonly repo: Repository<Channel>,
  ) {}

  findById(id: string): Promise<Channel | null> {
    return this.repo.findOne({ where: { id } });
  }

  findByProviderAndSession(
    provider: string,
    session: string,
  ): Promise<Channel | null> {
    const normalized = session.trim().toLowerCase();
    return this.repo.findOne({
      where: {
        provider,
        config: Raw(
          (alias) => `LOWER(${alias} ->> 'session') = :session`,
          { session: normalized },
        ),
      },
    });
  }

  async updateStatus(id: string, status: string): Promise<Channel | null> {
    const entity = await this.repo.preload({ id, status });
    if (!entity) {
      return null;
    }
    return this.repo.save(entity);
  }

  async create(data: Partial<Channel>): Promise<Channel> {
    return this.repo.save(data);
  }
}
