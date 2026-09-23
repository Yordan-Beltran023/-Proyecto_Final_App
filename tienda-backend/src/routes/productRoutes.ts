import { Router } from 'express';
import { getProducts, getProductById, createProduct, updateProduct, deleteProduct } from '../controllers/productController';
import { verifyToken, isAdmin } from '../middlewares/authMiddleware';

const router = Router();

// Públicas / Cliente
router.get('/', getProducts);
router.get('/:id', getProductById);

// Privadas (Solo Admin)
router.post('/', verifyToken, isAdmin, createProduct);
router.put('/:id', verifyToken, isAdmin, updateProduct);
router.delete('/:id', verifyToken, isAdmin, deleteProduct);

export default router;