import { ConfigService } from '@nestjs/config';
import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { AuthService } from './auth.service';
import { ServiceAuthGuard, ServiceRequest } from './auth.guard';

describe('ServiceAuthGuard', () => {
  let guard: ServiceAuthGuard;

  beforeEach(() => {
    const configService = {
      getOrThrow: jest.fn().mockReturnValue([
        { project: 'project-a', token: 'secret-a' },
        { project: 'project-b', token: 'secret-b' },
      ]),
    } as unknown as ConfigService;

    guard = new ServiceAuthGuard(new AuthService(configService));
  });

  it('rejects a request without an Authorization header', () => {
    const request: ServiceRequest = { headers: {} };

    expect(() => guard.canActivate(contextFor(request))).toThrow(UnauthorizedException);
  });

  it('rejects an invalid service token', () => {
    const request: ServiceRequest = {
      headers: { authorization: 'Bearer invalid-token' },
    };

    expect(() => guard.canActivate(contextFor(request))).toThrow(UnauthorizedException);
  });

  it('rejects a malformed Authorization header', () => {
    const request: ServiceRequest = {
      headers: { authorization: 'Basic secret-a' },
    };

    expect(() => guard.canActivate(contextFor(request))).toThrow(UnauthorizedException);
  });

  it('allows a valid service token to proceed', () => {
    const request: ServiceRequest = {
      headers: { authorization: 'Bearer secret-a' },
    };

    expect(guard.canActivate(contextFor(request))).toBe(true);
  });

  it('resolves project-a from its service token', () => {
    const request: ServiceRequest = {
      headers: { authorization: 'Bearer secret-a' },
    };

    guard.canActivate(contextFor(request));

    expect(request.service).toEqual({ project: 'project-a' });
  });

  it('resolves project-b from its service token', () => {
    const request: ServiceRequest = {
      headers: { authorization: 'Bearer secret-b' },
    };

    guard.canActivate(contextFor(request));

    expect(request.service).toEqual({ project: 'project-b' });
  });

  it('does not allow a request body to override the authenticated project', () => {
    const request: ServiceRequest = {
      headers: { authorization: 'Bearer secret-a' },
      body: { project: 'project-b' },
    };

    guard.canActivate(contextFor(request));

    expect(request.service).toEqual({ project: 'project-a' });
    expect(request.body).toEqual({ project: 'project-b' });
  });
});

function contextFor(request: ServiceRequest): ExecutionContext {
  return {
    switchToHttp: () => ({
      getRequest: () => request,
    }),
  } as ExecutionContext;
}