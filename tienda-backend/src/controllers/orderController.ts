import { Request, Response } from 'express';
import { pool } from '../config/db';
import { AuthRequest } from '../middlewares/authMiddleware';

// 1. Crear un nuevo pedido (Cliente)
export const createOrder = async (req: AuthRequest, res: Response) => {
    const usuario_id = req.user?.id;
    const { productos } = req.body; // Array de objetos: [{ producto_id: 1, cantidad: 2 }]

    if (!productos || !Array.isArray(productos) || productos.length === 0) {
        return res.status(400).json({ error: 'El pedido debe contener al menos un producto.' });
    }

    const client = await pool.connect();

    try {
        await client.query('BEGIN'); // Inicio de Transacción SQL

        let totalCalculado = 0;
        const detallesAInsertar = [];

        // Validar stock y calcular precios actuales
        for (const item of productos) {
            const prodResult = await client.query(
                'SELECT id, nombre, precio, stock, estado FROM productos WHERE id = $1 FOR UPDATE',
                [item.producto_id]
            );

            if (prodResult.rows.length === 0) {
                await client.query('ROLLBACK');
                return res.status(404).json({ error: `El producto con ID ${item.producto_id} no existe.` });
            }

            const producto = prodResult.rows[0];

            if (!producto.estado) {
                await client.query('ROLLBACK');
                return res.status(400).json({ error: `El producto "${producto.nombre}" no está disponible.` });
            }

            if (producto.stock < item.cantidad) {
                await client.query('ROLLBACK');
                return res.status(400).json({ 
                    error: `Stock insuficiente para "${producto.nombre}". Disponible: ${producto.stock}, solicitado: ${item.cantidad}.` 
                });
            }

            const subtotal = Number(producto.precio) * item.cantidad;
            totalCalculado += subtotal;

            detallesAInsertar.push({
                producto_id: producto.id,
                cantidad: item.cantidad,
                precio_unitario: producto.precio
            });
        }

        // Crear la cabecera del Pedido
        const orderResult = await client.query(
            `INSERT INTO pedidos (usuario_id, total, estado) 
             VALUES ($1, $2, 'Pendiente') RETURNING *`,
            [usuario_id, totalCalculado]
        );

        const pedidoId = orderResult.rows[0].id;

        // Insertar los detalles del pedido y descontar stock
        for (const detalle of detallesAInsertar) {
            await client.query(
                `INSERT INTO detalle_pedido (pedido_id, producto_id, cantidad, precio_unitario)
                 VALUES ($1, $2, $3, $4)`,
                [pedidoId, detalle.producto_id, detalle.cantidad, detalle.precio_unitario]
            );

            await client.query(
                'UPDATE productos SET stock = stock - $1 WHERE id = $2',
                [detalle.cantidad, detalle.producto_id]
            );
        }

        await client.query('COMMIT'); // Confirmar Transacción
        res.status(201).json({ message: 'Pedido creado exitosamente', pedido: orderResult.rows[0] });

    } catch (error) {
        await client.query('ROLLBACK');
        console.error(error);
        res.status(500).json({ error: 'Error interno al procesar el pedido.' });
    } finally {
        client.release();
    }
};

// 2. Historial de pedidos del cliente (Cliente)
export const getMyOrders = async (req: AuthRequest, res: Response) => {
    const usuario_id = req.user?.id;

    try {
        const result = await pool.query(
            `SELECT p.id, p.fecha, p.total, p.estado,
                    COUNT(dp.id) as total_items
             FROM pedidos p
             LEFT JOIN detalle_pedido dp ON p.id = dp.pedido_id
             WHERE p.usuario_id = $1
             GROUP BY p.id
             ORDER BY p.fecha DESC`,
            [usuario_id]
        );

        res.json(result.rows);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error al obtener los pedidos.' });
    }
};

// 3. Ver todos los pedidos de la tienda (Administrador)
export const getAllOrders = async (req: Request, res: Response) => {
    try {
        const result = await pool.query(
            `SELECT p.id, p.fecha, p.total, p.estado,
                    u.nombre as cliente_nombre, u.apellido as cliente_apellido, u.email as cliente_email
             FROM pedidos p
             INNER JOIN usuarios u ON p.usuario_id = u.id
             ORDER BY p.fecha DESC`
        );

        res.json(result.rows);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error al consultar todos los pedidos.' });
    }
};

// 4. Detalle de un pedido específico (Cliente propio o Administrador)
export const getOrderById = async (req: AuthRequest, res: Response) => {
    const { id } = req.params;
    const usuario_id = req.user?.id;
    const esAdmin = req.user?.rol_id === 2;

    try {
        const orderResult = await pool.query(
            `SELECT p.*, u.nombre as cliente_nombre, u.apellido as cliente_apellido, u.email as cliente_email, u.telefono
             FROM pedidos p
             INNER JOIN usuarios u ON p.usuario_id = u.id
             WHERE p.id = $1`,
            [id]
        );

        if (orderResult.rows.length === 0) {
            return res.status(404).json({ error: 'Pedido no encontrado.' });
        }

        const pedido = orderResult.rows[0];

        // Validar propiedad si es un Cliente
        if (!esAdmin && pedido.usuario_id !== usuario_id) {
            return res.status(403).json({ error: 'No tienes autorización para ver este pedido.' });
        }

        const itemsResult = await pool.query(
            `SELECT dp.id, dp.cantidad, dp.precio_unitario,
                    prod.id as producto_id, prod.nombre, prod.imagen_url
             FROM detalle_pedido dp
             INNER JOIN productos prod ON dp.producto_id = prod.id
             WHERE dp.pedido_id = $1`,
            [id]
        );

        res.json({
            pedido,
            detalles: itemsResult.rows
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error al obtener el detalle del pedido.' });
    }
};

// 5. Cambiar el estado de un pedido (Administrador)
export const updateOrderStatus = async (req: Request, res: Response) => {
    const { id } = req.params;
    const { estado } = req.body;

    const estadosValidos = ['Pendiente', 'Confirmado', 'En preparación', 'Enviado', 'Entregado', 'Cancelado'];

    if (!estado || !estadosValidos.includes(estado)) {
        return res.status(400).json({ error: `Estado no válido. Opciones: ${estadosValidos.join(', ')}` });
    }

    try {
        const result = await pool.query(
            'UPDATE pedidos SET estado = $1 WHERE id = $2 RETURNING *',
            [estado, id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Pedido no encontrado.' });
        }

        res.json({ message: 'Estado del pedido actualizado correctamente', pedido: result.rows[0] });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error al cambiar el estado del pedido.' });
    }
};

// 6. Cancelar pedido (Cliente si está 'Pendiente' o Administrador)
export const cancelOrder = async (req: AuthRequest, res: Response) => {
    const { id } = req.params;
    const usuario_id = req.user?.id;
    const esAdmin = req.user?.rol_id === 2;

    const client = await pool.connect();

    try {
        await client.query('BEGIN');

        const orderResult = await client.query('SELECT * FROM pedidos WHERE id = $1 FOR UPDATE', [id]);

        if (orderResult.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({ error: 'Pedido no encontrado.' });
        }

        const pedido = orderResult.rows[0];

        if (!esAdmin && pedido.usuario_id !== usuario_id) {
            await client.query('ROLLBACK');
            return res.status(403).json({ error: 'Acceso denegado.' });
        }

        // Si es cliente, solo puede cancelar si el estado es 'Pendiente'
        if (!esAdmin && pedido.estado !== 'Pendiente') {
            await client.query('ROLLBACK');
            return res.status(400).json({ error: 'Solo se pueden cancelar pedidos en estado "Pendiente".' });
        }

        if (pedido.estado === 'Cancelado') {
            await client.query('ROLLBACK');
            return res.status(400).json({ error: 'El pedido ya se encuentra cancelado.' });
        }

        // Devolver el stock a los productos
        const itemsResult = await client.query(
            'SELECT producto_id, cantidad FROM detalle_pedido WHERE pedido_id = $1',
            [id]
        );

        for (const item of itemsResult.rows) {
            await client.query(
                'UPDATE productos SET stock = stock + $1 WHERE id = $2',
                [item.cantidad, item.producto_id]
            );
        }

        // Marcar estado como Cancelado
        const updatedOrder = await client.query(
            "UPDATE pedidos SET estado = 'Cancelado' WHERE id = $1 RETURNING *",
            [id]
        );

        await client.query('COMMIT');
        res.json({ message: 'Pedido cancelado y stock restablecido exitosamente.', pedido: updatedOrder.rows[0] });

    } catch (error) {
        await client.query('ROLLBACK');
        console.error(error);
        res.status(500).json({ error: 'Error interno al cancelar el pedido.' });
    } finally {
        client.release();
    }
};