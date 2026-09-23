import { Request, Response } from 'express';
import { pool } from '../config/db';

// Obtener catálogo de productos con filtros y búsqueda
export const getProducts = async (req: Request, res: Response) => {
    const { search, categoria_id } = req.query;

    try {
        let query = `
            SELECT p.id, p.nombre, p.descripcion, p.precio, p.imagen_url, p.stock, p.estado,
                   c.id as categoria_id, c.nombre as categoria_nombre
            FROM productos p
            LEFT JOIN categorias c ON p.categoria_id = c.id
            WHERE p.estado = true
        `;
        const params: any[] = [];

        // Filtro por búsqueda de texto (nombre o descripción)
        if (search) {
            params.push(`%${search}%`);
            query += ` AND (p.nombre ILIKE $${params.length} OR p.descripcion ILIKE $${params.length})`;
        }

        // Filtro por categoría
        if (categoria_id) {
            params.push(categoria_id);
            query += ` AND p.categoria_id = $${params.length}`;
        }

        query += ' ORDER BY p.id DESC';

        const result = await pool.query(query, params);
        res.json(result.rows);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error al obtener el catálogo de productos.' });
    }
};

// Obtener detalle de un producto por ID
export const getProductById = async (req: Request, res: Response) => {
    const { id } = req.params;

    try {
        const result = await pool.query(
            `SELECT p.*, c.nombre as categoria_nombre 
             FROM productos p 
             LEFT JOIN categorias c ON p.categoria_id = c.id 
             WHERE p.id = $1`,
            [id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Producto no encontrado.' });
        }

        res.json(result.rows[0]);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error al obtener el detalle del producto.' });
    }
};

// Crear producto (Solo Administrador)
export const createProduct = async (req: Request, res: Response) => {
    const { nombre, descripcion, precio, imagen_url, stock, categoria_id } = req.body;

    if (!nombre || precio === undefined || stock === undefined || !categoria_id) {
        return res.status(400).json({ error: 'Campos obligatorios: nombre, precio, stock y categoria_id.' });
    }

    try {
        const result = await pool.query(
            `INSERT INTO productos (nombre, descripcion, precio, imagen_url, stock, categoria_id)
             VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
            [nombre, descripcion || null, precio, imagen_url || null, stock, categoria_id]
        );

        res.status(201).json({ message: 'Producto creado exitosamente', producto: result.rows[0] });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error al registrar el producto.' });
    }
};

// Actualizar producto (Solo Administrador)
export const updateProduct = async (req: Request, res: Response) => {
    const { id } = req.params;
    const { nombre, descripcion, precio, imagen_url, stock, categoria_id, estado } = req.body;

    try {
        const result = await pool.query(
            `UPDATE productos 
             SET nombre = COALESCE($1, nombre),
                 descripcion = COALESCE($2, descripcion),
                 precio = COALESCE($3, precio),
                 imagen_url = COALESCE($4, imagen_url),
                 stock = COALESCE($5, stock),
                 categoria_id = COALESCE($6, categoria_id),
                 estado = COALESCE($7, estado)
             WHERE id = $8 RETURNING *`,
            [nombre, descripcion, precio, imagen_url, stock, categoria_id, estado, id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Producto no encontrado.' });
        }

        res.json({ message: 'Producto actualizado exitosamente', producto: result.rows[0] });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error al actualizar el producto.' });
    }
};

// Desactivar / Eliminar producto (Solo Administrador)
export const deleteProduct = async (req: Request, res: Response) => {
    const { id } = req.params;

    try {
        const result = await pool.query('UPDATE productos SET estado = false WHERE id = $1 RETURNING *', [id]);

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Producto no encontrado.' });
        }

        res.json({ message: 'Producto desactivado del catálogo.' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error al desactivar el producto.' });
    }
};