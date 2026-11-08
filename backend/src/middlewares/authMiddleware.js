const jwt = require('jsonwebtoken');
const pool = require('../config/database');

// Verifica se o usuário possui um token válido
async function autenticarToken(req, res, next) {
    try {
        const authorization = req.headers.authorization;

        if (!authorization) {
            return res.status(401).json({
                mensagem: 'Token de autenticação não informado.'
            });
        }

        const partes = authorization.split(' ');

        if (partes.length !== 2 || partes[0] !== 'Bearer') {
            return res.status(401).json({
                mensagem: 'Formato do token inválido.'
            });
        }

        const token = partes[1];

        // Valida o token
        const decoded = jwt.verify(
            token,
            process.env.JWT_SECRET
        );

        // Busca o usuário novamente no banco
        const resultado = await pool.query(
            `SELECT idusuario, nome, email, tipo_perfil
             FROM usuario
             WHERE idusuario = $1 AND ativo = TRUE`,
            [decoded.idusuario]
        );

        if (resultado.rows.length === 0) {
            return res.status(401).json({
                mensagem: 'Usuário não encontrado ou desativado.'
            });
        }

        // Disponibiliza os dados do usuário para as próximas etapas
        req.usuario = resultado.rows[0];

        next();

    } catch (error) {
        if (error.name === 'TokenExpiredError') {
            return res.status(401).json({
                mensagem: 'Token expirado. Faça login novamente.'
            });
        }

        if (error.name === 'JsonWebTokenError') {
            return res.status(401).json({
                mensagem: 'Token inválido.'
            });
        }

        console.error('Erro na autenticação:', error);

        return res.status(500).json({
            mensagem: 'Erro interno na autenticação.'
        });
    }
}

// Verifica se o usuário possui o perfil necessário
function autorizarPerfil(...perfisPermitidos) {
    return (req, res, next) => {
        if (!req.usuario) {
            return res.status(401).json({
                mensagem: 'Usuário não autenticado.'
            });
        }

        if (!perfisPermitidos.includes(req.usuario.tipo_perfil)) {
            return res.status(403).json({
                mensagem: 'Você não tem permissão para acessar este recurso.'
            });
        }

        next();
    };
}

module.exports = {
    autenticarToken,
    autorizarPerfil
};