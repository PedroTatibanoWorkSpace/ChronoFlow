import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { LessThanOrEqual, Repository } from 'typeorm';
import { Chrono } from '../entities/job.entity';
import { ChronoRun } from '../entities/chrono-run.entity';

@Injectable()
export class JobRepository {
  constructor(
    @InjectRepository(Chrono)
    private readonly repo: Repository<Chrono>,
    @InjectRepository(ChronoRun)
    private readonly runsRepo: Repository<ChronoRun>,
  ) {}

  async create(job: Partial<Chrono>): Promise<Chrono> {
    return this.repo.save(job);
  }

  async findAll(): Promise<Chrono[]> {
    return this.repo.find({ order: { createdAt: 'DESC' } });
  }

  async findById(id: string): Promise<Chrono | null> {
    return this.repo.findOne({ where: { id } });
  }

  async findDue(now: Date): Promise<Chrono[]> {
    return this.repo.find({
      where: { isActive: true, nextRunAt: LessThanOrEqual(now) },
    });
  }

  async update(id: string, data: Partial<Chrono>): Promise<Chrono | null> {
    const entity = await this.repo.preload({ id, ...data });
    if (!entity) {
      return null;
    }
    return this.repo.save(entity);
  }

  async remove(id: string): Promise<void> {
    await this.repo.delete(id);
  }

  async createRun(run: Partial<ChronoRun>): Promise<ChronoRun> {
    return this.runsRepo.save(run);
  }

  async updateRun(
    id: string,
    data: Partial<ChronoRun>,
  ): Promise<ChronoRun | null> {
    const entity = await this.runsRepo.preload({ id, ...data });
    if (!entity) {
      return null;
    }
    return this.runsRepo.save(entity);
  }

  async listRuns(chronoId: string, skip = 0, take = 20): Promise<ChronoRun[]> {
    return this.runsRepo.find({
      where: { chronoId },
      order: { createdAt: 'DESC' },
      skip,
      take,
    });
  }
}
