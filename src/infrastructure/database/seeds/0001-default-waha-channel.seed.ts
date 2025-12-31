import 'dotenv/config';
import { DataSource } from 'typeorm';
import dataSource from '../../../data-source';
import { Channel } from '../../../messaging/entities/channel.entity';
import { ChannelRepository } from '../../../messaging/repositories/channel.repository';

const DEFAULT_SESSION = 'default';

async function run() {
  const ds: DataSource = dataSource.isInitialized
    ? dataSource
    : await dataSource.initialize();

  const repo = new ChannelRepository(ds.getRepository(Channel) as any);

  const existing = await repo.findByProviderAndSession(
    'WAHA',
    DEFAULT_SESSION,
  );
  if (existing) {
    await ds.destroy();
    return;
  }

  const created = await repo.create({
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

void run().catch(async (err) => {

  if (!dataSource.isInitialized) {
    try {
      await dataSource.destroy();
    } catch {
    }
  }
  process.exit(1);
});
