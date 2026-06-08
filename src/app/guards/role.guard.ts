import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';
import type { UserRole } from '../models/user';

export const roleGuard: CanActivateFn = (route) => {
    const auth = inject(AuthService);
    const router = inject(Router);

    const allowedRoles = route.data?.['roles'] as UserRole[] | undefined;

    if (!allowedRoles || allowedRoles.length === 0) {
        return true;
    }

    if (auth.hasRole(...allowedRoles)) {
        return true;
    }

    return router.createUrlTree(['/dashboard']);
};
