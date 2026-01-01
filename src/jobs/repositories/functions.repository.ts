import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserFunction } from '../entities/function.entity';

@Injectable()
export class FunctionsRepository {
  constructor(
    @InjectRepository(UserFunction)
    private readonly repo: Repository<UserFunction>,
  ) {}

  createFunction(data: Partial<UserFunction>): Promise<UserFunction> {
    return this.repo.save(data);
  }

  findById(id: string): Promise<UserFunction | null> {
    return this.repo.findOne({ where: { id } });
  }

  save(entity: UserFunction): Promise<UserFunction> {
    return this.repo.save(entity);
  }
}
