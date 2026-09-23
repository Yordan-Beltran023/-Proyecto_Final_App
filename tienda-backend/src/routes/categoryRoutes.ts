import { Router } from 'express';
import { getCategories, createCategory, updateCategory, deleteCategory } from '../controllers/categoryController';
import { verifyToken, isAdmin } from '../middlewares/authMiddleware';

const router = Router();

// Pública / Cliente
router.get('/', getCategories);

// Privadas (Solo Admin)
router.post('/', verifyToken, isAdmin, createCategory);
router.put('/:id', verifyToken, isAdmin, updateCategory);
router.delete('/:id', verifyToken, isAdmin, deleteCategory);

export default router;