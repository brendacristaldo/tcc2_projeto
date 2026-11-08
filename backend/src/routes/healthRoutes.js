
const express = require('express');
const pool = require('../config/database');

const router = express.Router();

// Verifica se a API está funcionando
router.get('/', (req, res) => {
    res.status(200).json({
        mensagem: 'API do sistema de gestão financeira rodando.'
    });
});

// Verifica a conexão com PostgreSQL
router.get('/teste-banco', async (req, res) => {
    try {
        const resultado = await pool.query('SELECT NOW()');

        res.status(200).json({
            mensagem: 'Conexão com PostgreSQL funcionando!',
            horario: resultado.rows[0].now
        });
    } catch (error) {
        console.error('Erro na conexão com PostgreSQL:', error);

        res.status(500).json({
            mensagem: 'Erro ao conectar com o PostgreSQL.'
        });
    }
});

module.exports = router;
