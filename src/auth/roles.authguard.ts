// guards/admin.guard.ts
import {
  CanActivate,
  ExecutionContext,
  Injectable,
  ForbiddenException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Roles, RolesDocument } from 'src/roles/schema/roles.schema';

@Injectable()
export class AdminGuard implements CanActivate {
  constructor(
    @InjectModel(Roles.name)
    private readonly rolesModel: Model<RolesDocument>,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user?.role) {
      throw new ForbiddenException('No role found in token.');
    }

    // Fetch the role document from the database
    const role = await this.rolesModel.findById(user.role);
    if (!role) {
      throw new ForbiddenException('Invalid role.');
    }

    // Check if role has admin privileges
    if (!role.isAdmin) {
      throw new ForbiddenException('Access denied. Admins only.');
    }

    return true;
  }
}
