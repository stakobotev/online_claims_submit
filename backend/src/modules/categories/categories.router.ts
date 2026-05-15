import { Router } from 'express';
import { listCategories } from './categories.service.js';

const router = Router();

router.get('/categories', async (_req, res, next) => {
  try {
    const categories = await listCategories();
    res.json(categories);
  } catch (err) {
    next(err);
  }
});

export { router as categoriesRouter };
