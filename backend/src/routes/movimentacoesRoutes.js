
const express = require('express');
const router = express.Router();

const movimentacoesController = require('../controllers/movimentacoesController');
const upload = require('../config/upload');

const {
    autenticarToken,
    autorizarPerfil
} = require('../middlewares/authMiddleware');

// Todas as rotas exigem autenticação e perfil de tesoureiro
router.use(autenticarToken);
router.use(autorizarPerfil('tesoureiro'));

// Listagem e opções para cadastro
router.get('/', movimentacoesController.listarMovimentacoes);
router.get('/opcoes', movimentacoesController.listarOpcoesCadastro);

// Cadastro de entradas e saídas com comprovante opcional
router.post(
    '/entradas',
    upload.single('comprovante'),
    movimentacoesController.cadastrarEntrada
);

router.post(
    '/saidas',
    upload.single('comprovante'),
    movimentacoesController.cadastrarSaida
);

// Visualização e download de comprovantes
router.get(
    '/:id/comprovante',
    movimentacoesController.acessarComprovante
);

// Edição e exclusão de movimentações
router.put('/:id', movimentacoesController.atualizarMovimentacao);
router.delete('/:id', movimentacoesController.excluirMovimentacao);

module.exports = router;
