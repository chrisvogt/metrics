import type { Request, Response, NextFunction } from 'express';
declare const rateLimiter: (windowMs?: number, maxRequests?: number) => (req: Request, res: Response, next: NextFunction) => void;
export default rateLimiter;
//# sourceMappingURL=rate-limiter.d.ts.map