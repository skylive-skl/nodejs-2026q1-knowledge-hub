import { PrismaService } from './prisma.service';

describe('PrismaService lifecycle', () => {
  it('calls $connect in onModuleInit', async () => {
    const service = new PrismaService();
    const connectSpy = vi
      .spyOn(service, '$connect')
      .mockResolvedValue(undefined as never);

    await service.onModuleInit();

    expect(connectSpy).toHaveBeenCalledTimes(1);
  });

  it('calls $disconnect in onModuleDestroy', async () => {
    const service = new PrismaService();
    const disconnectSpy = vi
      .spyOn(service, '$disconnect')
      .mockResolvedValue(undefined as never);

    await service.onModuleDestroy();

    expect(disconnectSpy).toHaveBeenCalledTimes(1);
  });
});
