import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PermissionsGuard } from './permissions.guard';
import { AuthenticatedUser } from '../interfaces/authenticated-user.interface';

describe('PermissionsGuard', () => {
  let guard: PermissionsGuard;
  let reflector: { getAllAndOverride: jest.Mock };
  let context: ExecutionContext;
  let user: AuthenticatedUser;

  beforeEach(() => {
    reflector = { getAllAndOverride: jest.fn() };
    guard = new PermissionsGuard(reflector as unknown as Reflector);
    user = {
      sub: 'user-1',
      permissions: ['product:read', 'sale:read'],
      isPlatformAdmin: false,
    };
    context = {
      getHandler: jest.fn(),
      getClass: jest.fn(),
      switchToHttp: () => ({
        getRequest: () => ({ user }),
      }),
    } as unknown as ExecutionContext;
  });

  it('allows access when every required permission is present', () => {
    reflector.getAllAndOverride.mockReturnValue([
      'product:read',
      'sale:read',
    ]);

    expect(guard.canActivate(context)).toBe(true);
    expect(reflector.getAllAndOverride).toHaveBeenCalledWith(
      'permissions',
      [context.getHandler(), context.getClass()],
    );
  });

  it('rejects access when any required permission is missing', () => {
    reflector.getAllAndOverride.mockReturnValue([
      'product:read',
      'inventory:restock',
    ]);

    expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
  });

  it('allows platform administrators to pass permission checks', () => {
    user.isPlatformAdmin = true;
    reflector.getAllAndOverride.mockReturnValue(['merchant:create']);

    expect(guard.canActivate(context)).toBe(true);
  });

  it('allows authenticated users on routes with no permission metadata', () => {
    reflector.getAllAndOverride.mockReturnValue(undefined);

    expect(guard.canActivate(context)).toBe(true);
  });
});
