import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

export interface AuthRequest extends Request {
    user?: {
        id: number;
        rol_id: number;
    };
}

export const verifyToken = (req: AuthRequest, res: Response, next: NextFunction) => {
    const authHeader = req.header('Authorization');
    const token = authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : null;

    if (!token) {
        return res.status(401).json({ error: 'Acceso denegado. No se proporcionó un token.' });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET as string);
        req.user = decoded as { id: number; rol_id: number };
        next();
    } catch (error) {
        res.status(401).json({ error: 'Token inválido o expirado.' });
    }
};

export const isAdmin = (req: AuthRequest, res: Response, next: NextFunction) => {
    // En nuestro script SQL: 1 es Cliente, 2 es Administrador
    if (req.user && req.user.rol_id === 2) {
        next();
    } else {
        return res.status(403).json({ error: 'Acceso denegado. Se requiere rol de Administrador.' });
    }
};
