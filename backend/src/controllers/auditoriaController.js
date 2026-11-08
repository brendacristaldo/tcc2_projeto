
const pool = require('../config/database');

// Listar histórico de auditoria
async function listarAuditoria(req, res) {
    try {
        const resultado = await pool.query(
            `SELECT
                idauditoria,
                movimentacao_id,
                usuario_id,
                usuario_nome,
                operacao,
                dados_anteriores,
                dados_novos,
                criado_em
             FROM auditoria
             ORDER BY criado_em DESC, idauditoria DESC`
        );

        return res.status(200).json(resultado.rows);

    } catch (error) {
        console.error('Erro ao listar auditoria:', error);

        return res.status(500).json({
            mensagem: 'Erro interno ao consultar o histórico de auditoria.'
        });
    }
}

module.exports = {
    listarAuditoria
};
