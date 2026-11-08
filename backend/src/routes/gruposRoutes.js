
const express = require('express');
const router = express.Router();

const gruposController = require('../controllers/gruposController');

const {
    autenticarToken,
    autorizarPerfil
} = require('../middlewares/authMiddleware');

// Consulta todos os grupos: somente pastor
router.get(
    '/',
    autenticarToken,
    autorizarPerfil('pastor'),
    gruposController.listarGrupos
);

// Cadastro de grupos: somente pastor
router.post(
    '/',
    autenticarToken,
    autorizarPerfil('pastor'),
    gruposController.cadastrarGrupo
);

// Atualização do nome de um grupo: somente pastor
router.put(
    '/:idgrupo',
    autenticarToken,
    autorizarPerfil('pastor'),
    gruposController.atualizarGrupo
);

// Ativação ou desativação de um grupo: somente pastor
router.patch(
    '/:idgrupo/status',
    autenticarToken,
    autorizarPerfil('pastor'),
    gruposController.alterarStatusGrupo
);

// Consulta os grupos do próprio usuário autenticado
router.get(
    '/meus',
    autenticarToken,
    gruposController.listarMeusGrupos
);

module.exports = router;
