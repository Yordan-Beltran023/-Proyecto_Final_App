import { Request, Response } from 'express';
import { pool } from '../config/db';

// Listar todas las categorías (Clientes ven solo activas, Admin ve todas)
export const getCategories = async (req: Request, res: Response) => {
    try {
        const result = await pool.query('SELECT * FROM categorias WHERE estado = true ORDER BY nombre ASC');
        res.json(result.rows);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error al obtener las categorías.' });
    }
};

// Crear una nueva categoría (Solo Administrador)
export const createCategory = async (req: Request, res: Response) => {
    const { nombre } = req.body;

    if (!nombre) {
        return res.status(400).json({ error: 'El nombre de la categoría es obligatorio.' });
    }

    try {
        const result = await pool.query(
            'INSERT INTO categorias (nombre) VALUES ($1) RETURNING *',
            [nombre]
        );
        res.status(201).json({ message: 'Categoría creada exitosamente', categoria: result.rows[0] });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error al crear la categoría.' });
    }
};

// Actualizar categoría (Solo Administrador)
export const updateCategory = async (req: Request, res: Response) => {
    const { id } = req.params;
    const { nombre, estado } = req.body;

    try {
        const result = await pool.query(
            'UPDATE categorias SET nombre = COALESCE($1, nombre), estado = COALESCE($2, estado) WHERE id = $3 RETURNING *',
            [nombre, estado, id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Categoría no encontrada.' });
        }

        res.json({ message: 'Categoría actualizada correctamente', categoria: result.rows[0] });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error al actualizar la categoría.' });
    }
};

// Desactivar categoría / Eliminado lógico (Solo Administrador)
export const deleteCategory = async (req: Request, res: Response) => {
    const { id } = req.params;

    try {
        const result = await pool.query(
            'UPDATE categorias SET estado = false WHERE id = $1 RETURNING *',
            [id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Categoría no encontrada.' });
        }

        res.json({ message: 'Categoría desactivada exitosamente.' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error al desactivar la categoría.' });
    }
};