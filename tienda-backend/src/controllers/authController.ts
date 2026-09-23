import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { pool } from '../config/db';
import { AuthRequest } from '../middlewares/authMiddleware';

// Módulo 2: Registro de nuevos usuarios
export const register = async (req: Request, res: Response) => {
    const { nombre, apellido, email, telefono, password, confirmPassword } = req.body;

    // 1. Validaciones básicas de campos obligatorios
    if (!nombre || !apellido || !email || !password || !confirmPassword) {
        return res.status(400).json({ error: 'Todos los campos obligatorios deben ser completados.' });
    }

    if (password !== confirmPassword) {
        return res.status(400).json({ error: 'Las contraseñas no coinciden.' });
    }

    try {
        // 2. Verificar que el correo no esté registrado
        const userCheck = await pool.query('SELECT id FROM usuarios WHERE email = $1', [email]);
        if (userCheck.rows.length > 0) {
            return res.status(400).json({ error: 'El correo electrónico ya se encuentra registrado.' });
        }

        // 3. Encriptar la contraseña (seguridad)
        const salt = await bcrypt.genSalt(10);
        const passwordHash = await bcrypt.hash(password, salt);

        // 4. Asignar rol por defecto (Rol 1 = Cliente)
        const rolClienteId = 1;

        // 5. Guardar en PostgreSQL
        const newUser = await pool.query(
            `INSERT INTO usuarios (nombre, apellido, email, telefono, password_hash, rol_id) 
             VALUES ($1, $2, $3, $4, $5, $6) 
             RETURNING id, nombre, apellido, email, telefono, rol_id`,
            [nombre, apellido, email, telefono || null, passwordHash, rolClienteId]
        );

        res.status(201).json({
            message: 'Usuario registrado exitosamente',
            user: newUser.rows[0]
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error interno del servidor al registrar el usuario.' });
    }
};

// Módulo 1: Login de usuarios
export const login = async (req: Request, res: Response) => {
    console.log("LOGIN RECIBIDO:", req.body);
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({ error: 'Por favor, ingrese correo y contraseña.' });
    }

    try {
        // 1. Buscar usuario por email e incluir el rol
        const result = await pool.query(
            `SELECT u.id, u.nombre, u.apellido, u.email, u.password_hash, u.rol_id, r.nombre as rol_nombre 
             FROM usuarios u 
             INNER JOIN roles r ON u.rol_id = r.id 
             WHERE u.email = $1`,
            [email]
        );

        if (result.rows.length === 0) {
            return res.status(401).json({ error: 'Credenciales incorrectas (usuario no encontrado).' });
        }

        const user = result.rows[0];

        // 2. Comparar contraseña encriptada
        const isMatch = await bcrypt.compare(password, user.password_hash);
        if (!isMatch) {
            return res.status(401).json({ error: 'Credenciales incorrectas (contraseña inválida).' });
        }

        // 3. Generar token JWT con la información de sesión
        const tokenPayload = {
            id: user.id,
            rol_id: user.rol_id,
            rol_nombre: user.rol_nombre
        };

        const token = jwt.sign(
            tokenPayload, 
            process.env.JWT_SECRET || 'secret_key', 
            { expiresIn: '24h' }
        );

        // 4. Responder con los datos de sesión (excluyendo la clave)
        res.json({
            message: 'Inicio de sesión exitoso',
            token,
            user: {
                id: user.id,
                nombre: user.nombre,
                apellido: user.apellido,
                email: user.email,
                rol: user.rol_nombre
            }
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error interno del servidor al iniciar sesión.' });
    }
};

export const updateProfile = async (req: AuthRequest, res: Response) => {
    const currentUser = req.user;
    const { nombre, apellido, email, telefono } = req.body;

    if (!currentUser?.id) {
        return res.status(401).json({ error: 'No autorizado.' });
    }

    if (!nombre || !apellido || !email) {
        return res.status(400).json({ error: 'Nombre, apellido y correo son obligatorios.' });
    }

    try {
        const normalizedEmail = String(email).trim().toLowerCase();

        const emailCheck = await pool.query(
            'SELECT id FROM usuarios WHERE email = $1 AND id <> $2',
            [normalizedEmail, currentUser.id]
        );

        if (emailCheck.rows.length > 0) {
            return res.status(400).json({ error: 'Este correo ya está registrado por otro usuario.' });
        }

        const updatedUser = await pool.query(
            `UPDATE usuarios
             SET nombre = $1,
                 apellido = $2,
                 email = $3,
                 telefono = $4
             WHERE id = $5
             RETURNING id, nombre, apellido, email, telefono, rol_id`,
            [
                String(nombre).trim(),
                String(apellido).trim(),
                normalizedEmail,
                telefono ? String(telefono).trim() : null,
                currentUser.id
            ]
        );

        const userData = updatedUser.rows[0];
        const roleResult = await pool.query('SELECT nombre FROM roles WHERE id = $1', [userData.rol_id]);

        return res.json({
            message: 'Perfil actualizado correctamente.',
            user: {
                id: userData.id,
                nombre: userData.nombre,
                apellido: userData.apellido,
                email: userData.email,
                telefono: userData.telefono,
                rol: roleResult.rows[0]?.nombre || 'Cliente'
            }
        });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ error: 'Error interno del servidor al actualizar el perfil.' });
    }
};