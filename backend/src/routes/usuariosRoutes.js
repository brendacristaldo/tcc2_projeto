
const express = require('express');
const router = express.Router();

const usuariosController = require('../controllers/usuariosController');

const {
    autenticarToken,
    autorizarPerfil
} = require('../middlewares/authMiddleware');

// Todas as rotas exigem autenticação de pastor
router.use(autenticarToken);
router.use(autorizarPerfil('pastor'));

// Lista os tesoureiros
router.get(
    '/tesoureiros',
    usuariosController.listarTesoureiros
);

// Cadastra um tesoureiro
router.post(
    '/tesoureiros',
    usuariosController.cadastrarTesoureiro
);

// Consulta os dados de um tesoureiro
router.get(
    '/tesoureiros/:idusuario',
    usuariosController.buscarTesoureiro
);

// Edita nome e e-mail de um tesoureiro
router.put(
    '/tesoureiros/:idusuario',
    usuariosController.atualizarTesoureiro
);

// Altera a senha de um tesoureiro
router.patch(
    '/tesoureiros/:idusuario/senha',
    usuariosController.atualizarSenhaTesoureiro
);

// Ativa ou desativa um tesoureiro
router.patch(
    '/tesoureiros/:idusuario/status',
    usuariosController.alterarStatusTesoureiro
);

// Consulta os grupos de um tesoureiro
router.get(
    '/:idusuario/grupos',
    usuariosController.listarGruposDoTesoureiro
);

// Atribui um tesoureiro a um grupo
router.post(
    '/:idusuario/grupos',
    usuariosController.atribuirGrupo
);

module.exports = router;
