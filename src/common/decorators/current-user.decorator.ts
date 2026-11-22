
import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { AuthenticatedUser } from '../../common/interfaces/authenticated-user.interface';

export const CurrentUser = createParamDecorator(
    (
        data: unknown,
        context: ExecutionContext,
    ) => {
        const request = context.switchToHttp().getRequest();
        const user = request.user as AuthenticatedUser;

        return user;
    },
);
