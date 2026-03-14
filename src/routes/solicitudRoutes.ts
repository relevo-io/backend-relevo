import { Router } from 'express';
import * as solicitudController from '../controllers/solicitudController.js';

const router = Router();

router.get('/', solicitudController.getSolicitudes);
router.get('/:id', solicitudController.getSolicitud);
router.post('/', solicitudController.createSolicitud);
router.put('/:id', solicitudController.updateSolicitud);
router.delete('/:id', solicitudController.deleteSolicitud);
router.patch('/:id/status', solicitudController.patchEstadoSolicitud);

export default router;
