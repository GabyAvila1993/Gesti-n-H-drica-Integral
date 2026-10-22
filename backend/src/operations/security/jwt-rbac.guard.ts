import {
  CanActivate,
  createParamDecorator,
  type ExecutionContext,
  ForbiddenException,
  Injectable,
  SetMetadata,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import type { Request } from 'express';
import type { UserRole } from '../../core/database/entities/user.entity';
import type { AuthTokenPayload } from '../domain/operations.types';

export const ROLES_KEY = 'ghi_roles';
export const Roles = (...roles: UserRole[]) => SetMetadata(ROLES_KEY, roles);

export interface AuthenticatedRequest extends Request {
  user?: AuthTokenPayload;
}

export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): AuthTokenPayload => {
    const request = ctx.switchToHttp().getRequest<AuthenticatedRequest>();
    if (!request.user) {
      throw new UnauthorizedException('Sesión no iniciada o token JWT inválido.');
    }
    return request.user;
  },
);

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly jwtService: JwtService,
    private readonly reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const authHeader = request.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedException('Debés iniciar sesión con tu cuenta municipal (Bearer JWT).');
    }

    const token = authHeader.slice(7).trim();
    if (!token) {
      throw new UnauthorizedException('Token JWT ausente.');
    }

    let payload: AuthTokenPayload;
    try {
      payload = await this.jwtService.verifyAsync<AuthTokenPayload>(token);
      request.user = payload;
    } catch {
      throw new UnauthorizedException('Tu sesión expiró o el token JWT es inválido.');
    }

    const requiredRoles = this.reflector.getAllAndOverride<UserRole[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (requiredRoles && requiredRoles.length > 0 && !requiredRoles.includes(payload.role)) {
      throw new ForbiddenException(
        `Acceso denegado: esta operación requiere rol ${requiredRoles.join(' o ')}.`,
      );
    }

    return true;
  }
}
