import 'dotenv/config';
import { DataSource, Raw } from 'typeorm';
import dataSource from '../../../data-source';
import { Channel } from '../../../messaging/entities/channel.entity';

const DEFAULT_SESSION = 'default';

async function run() {
  const ds: DataSource = dataSource.isInitialized
    ? dataSource
    : await dataSource.initialize();

  const repo = ds.getRepository(Channel);

  const existing = await repo.findOne({
    where: {
      provider: 'WAHA',
      config: Raw((alias) => `LOWER(${alias} ->> 'session') = :session`, {
        session: DEFAULT_SESSION,
      }),
    },
  });

  if (existing) {
    await ds.destroy();
    return;
  }

  await repo.save({
    name: 'WAHA Default',
    description: 'Default WAHA session',
    channelType: 'WHATSAPP',
    provider: 'WAHA',
    config: { session: DEFAULT_SESSION },
    isActive: true,
    status: 'UNKNOWN',
  });

  await ds.destroy();
}

void run().catch(async () => {
  if (!dataSource.isInitialized) {
    try {
      await dataSource.destroy();
    } catch {
      // Ignore cleanup errors
    }
  }
  process.exit(1);
});
