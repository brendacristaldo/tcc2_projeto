const pool = require('../config/database');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

async function login(req, res) {
    try {
        const { email, senha } = req.body;

        // Verifica se os campos foram preenchidos
        if (!email || !senha) {
            return res.status(400).json({
                mensagem: 'Informe o e-mail e a senha.'
            });
        }

        // Busca o usuário ativo pelo e-mail
        const resultado = await pool.query(
            `SELECT idusuario, nome, email, senha_hash, tipo_perfil
             FROM usuario
             WHERE email = $1 AND ativo = TRUE
             LIMIT 1`,
            [email]
        );

        if (resultado.rows.length === 0) {
            return res.status(401).json({
                mensagem: 'E-mail ou senha inválidos.'
            });
        }

        const usuario = resultado.rows[0];

        // Compara a senha informada com o hash armazenado
        const senhaValida = await bcrypt.compare(
            senha,
            usuario.senha_hash
        );

        if (!senhaValida) {
            return res.status(401).json({
                mensagem: 'E-mail ou senha inválidos.'
            });
        }

        // Verifica se a chave JWT está configurada
        if (!process.env.JWT_SECRET) {
            throw new Error('JWT_SECRET não configurado.');
        }

        // Gera o token de autenticação
        const token = jwt.sign(
            {
                idusuario: usuario.idusuario,
                tipo_perfil: usuario.tipo_perfil
            },
            process.env.JWT_SECRET,
            {
                expiresIn: process.env.JWT_EXPIRES_IN || '8h'
            }
        );

        // Retorna os dados do usuário sem a senha
        return res.status(200).json({
            mensagem: 'Login realizado com sucesso!',
            token,
            usuario: {
                idusuario: usuario.idusuario,
                nome: usuario.nome,
                email: usuario.email,
                tipo_perfil: usuario.tipo_perfil
            }
        });

    } catch (error) {
        console.error('Erro ao realizar login:', error);

        return res.status(500).json({
            mensagem: 'Erro interno ao realizar login.'
        });
    }
}

async function perfil(req, res) {
    return res.status(200).json({
        mensagem: 'Usuário autenticado com sucesso!',
        usuario: req.usuario
    });
}

module.exports = {
    login,
    perfil
};