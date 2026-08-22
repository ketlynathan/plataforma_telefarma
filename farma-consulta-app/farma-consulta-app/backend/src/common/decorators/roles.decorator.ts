import { SetMetadata } from '@nestjs/common';

export const ROLES_KEY = 'roles';
export const Roles = (...roles: ('cliente' | 'farmaceutico' | 'admin')[]) => SetMetadata(ROLES_KEY, roles);
