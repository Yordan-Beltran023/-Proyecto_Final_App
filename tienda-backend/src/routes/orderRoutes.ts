import { Router } from 'express';
import { 
    createOrder, 
    getMyOrders, 
    getAllOrders, 
    getOrderById, 
    updateOrderStatus, 
    cancelOrder 
} from '../controllers/orderController';
import { verifyToken, isAdmin } from '../middlewares/authMiddleware';

const router = Router();

// Rutas de Cliente
router.post('/', verifyToken, createOrder);             // Crear pedido
router.get('/mis-pedidos', verifyToken, getMyOrders);   // Historial propio

// Rutas de Administrador
router.get('/admin/todos', verifyToken, isAdmin, getAllOrders);  // Todos los pedidos
router.put('/admin/:id/estado', verifyToken, isAdmin, updateOrderStatus); // Cambiar estado

// Rutas Compartidas (Cliente/Admin)
router.get('/:id', verifyToken, getOrderById);          // Detalle de un pedido
router.put('/:id/cancelar', verifyToken, cancelOrder);   // Cancelar pedido

export default router;