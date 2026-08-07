import { Test } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { AdminGuard } from './roles.authguard';
import { Roles } from '../roles/schema/roles.schema';

describe('AdminGuard', () => {
  it('should be defined with the roles model dependency', async () => {
    const moduleRef = await Test.createTestingModule({
      providers: [
        AdminGuard,
        {
          provide: getModelToken(Roles.name),
          useValue: {
            findById: jest.fn(),
          },
        },
      ],
    }).compile();

    const guard = moduleRef.get(AdminGuard);
    expect(guard).toBeDefined();
  });
});
