export class HttpError extends Error {
  status: number;
  code?: string;
  constructor(status: number, message: string, code?: string) {
    super(message);
    this.status = status;
    this.code = code;
  }
}
export class BadRequestError extends HttpError { constructor(msg='Bad request', code='BAD_REQUEST'){ super(400, msg, code); } }
export class UnauthorizedError extends HttpError { constructor(msg='Unauthorized', code='UNAUTHORIZED'){ super(401, msg, code); } }
export class ForbiddenError extends HttpError { constructor(msg='Forbidden', code='FORBIDDEN'){ super(403, msg, code); } }
export class NotFoundError extends HttpError { constructor(msg='Not found', code='NOT_FOUND'){ super(404, msg, code); } }
export class ConflictError extends HttpError { constructor(msg='Conflict', code='CONFLICT'){ super(409, msg, code); } }
export class InternalServerError extends HttpError { constructor(msg='Internal server error', code='INTERNAL'){ super(500, msg, code); } }

