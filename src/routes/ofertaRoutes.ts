import { Router } from 'express';
import * as ofertaController from '../controllers/ofertaController.js';

const router = Router();

router.get('/', ofertaController.getOfertas);
router.get('/:id', ofertaController.getOferta);
router.post('/', ofertaController.createOferta);
router.put('/:id', ofertaController.updateOferta);
router.delete('/:id', ofertaController.deleteOferta);

export default router;
