import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { UsersSchema } from './schema/users.schema';
import { RolesModule } from '../roles/roles.module';
import { MenuSchema } from 'src/menu/schema/menu.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      {
        name: 'Users',
        schema: UsersSchema,
      },
      {
        name: 'Menu',
        schema: MenuSchema,
      },
    ]),
    // Use forwardRef to resolve the circular dependency
    RolesModule,
  ],
  controllers: [UsersController],
  providers: [UsersService],
  exports: [UsersService, MongooseModule],
})
export class UsersModule {}
