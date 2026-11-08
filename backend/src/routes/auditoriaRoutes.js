
const express = require('express');
const router = express.Router();

const auditoriaController = require('../controllers/auditoriaController');

const {
    autenticarToken,
    autorizarPerfil
} = require('../middlewares/authMiddleware');

// Todas as rotas exigem autenticação e perfil de pastor
router.use(autenticarToken);
router.use(autorizarPerfil('pastor'));

// Consulta do histórico de auditoria
router.get('/', auditoriaController.listarAuditoria);

module.exports = router;
