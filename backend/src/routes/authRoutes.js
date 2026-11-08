const express = require('express');
const router = express.Router();

const authController = require('../controllers/authController');

const {
    autenticarToken,
    autorizarPerfil
} = require('../middlewares/authMiddleware');

// Login público
router.post('/login', authController.login);

// Consulta de perfil: exige autenticação
router.get(
    '/me',
    autenticarToken,
    authController.perfil
);

// Exemplo de rota exclusiva para pastor
router.get(
    '/teste-pastor',
    autenticarToken,
    autorizarPerfil('pastor'),
    (req, res) => {
        res.status(200).json({
            mensagem: 'Acesso autorizado para o pastor!',
            usuario: req.usuario
        });
    }
);

module.exports = router;