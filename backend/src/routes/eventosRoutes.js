
const express = require('express');
const router = express.Router();

const eventosController = require('../controllers/eventosController');

const {
    autenticarToken,
    autorizarPerfil
} = require('../middlewares/authMiddleware');

// Todas as rotas exigem autenticação e perfil de tesoureiro
router.use(autenticarToken);
router.use(autorizarPerfil('tesoureiro'));

// Listar eventos
router.get('/', eventosController.listarEventos);

// Consultar evento específico
router.get('/:idevento', eventosController.consultarEvento);

// Cadastrar evento
router.post('/', eventosController.cadastrarEvento);

// Atualizar evento
router.put('/:idevento', eventosController.atualizarEvento);

// Desativar evento
router.delete('/:idevento', eventosController.desativarEvento);

module.exports = router;
