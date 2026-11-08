
const express = require('express');
const router = express.Router();

const dashboardController = require('../controllers/dashboardController');

const {
    autenticarToken,
    autorizarPerfil
} = require('../middlewares/authMiddleware');

// Dashboard exclusivo do pastor
router.use(autenticarToken);
router.use(autorizarPerfil('pastor'));

router.get('/', dashboardController.obterDashboardPastor);

module.exports = router;
