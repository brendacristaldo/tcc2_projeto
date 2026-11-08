
const pool = require('../config/database');

// Retorna os dados consolidados do dashboard do pastor
async function obterDashboardPastor(req, res) {
    try {
        const [
            resumo,
            dadosMensais,
            grupos,
            eventos
        ] = await Promise.all([

            // Resumo financeiro:
            // saldo considera todo o histórico;
            // entradas e saídas consideram o mês atual.
            pool.query(
                `SELECT
                    COALESCE(
                        SUM(valor) FILTER (WHERE tipo = 'entrada'),
                        0
                    ) AS total_entradas,

                    COALESCE(
                        SUM(valor) FILTER (WHERE tipo = 'saida'),
                        0
                    ) AS total_saidas,

                    COALESCE(
                        SUM(
                            CASE
                                WHEN tipo = 'entrada' THEN valor
                                WHEN tipo = 'saida' THEN -valor
                                ELSE 0
                            END
                        ),
                        0
                    ) AS saldo_geral,

                    COALESCE(
                        SUM(valor) FILTER (
                            WHERE tipo = 'entrada'
                              AND data >= DATE_TRUNC('month', CURRENT_DATE)
                              AND data < DATE_TRUNC('month', CURRENT_DATE)
                                  + INTERVAL '1 month'
                        ),
                        0
                    ) AS entradas_mes,

                    COALESCE(
                        SUM(valor) FILTER (
                            WHERE tipo = 'saida'
                              AND data >= DATE_TRUNC('month', CURRENT_DATE)
                              AND data < DATE_TRUNC('month', CURRENT_DATE)
                                  + INTERVAL '1 month'
                        ),
                        0
                    ) AS saidas_mes,

                    (
                        SELECT COUNT(*)::INTEGER
                        FROM grupo
                        WHERE ativo = TRUE
                    ) AS total_grupos_ativos

                 FROM movimentacao`
            ),

            // Últimos seis meses, incluindo o mês atual.
            // Meses sem movimentação também aparecem no resultado.
            pool.query(
                `WITH meses AS (
                    SELECT
                        generate_series(
                            DATE_TRUNC('month', CURRENT_DATE) - INTERVAL '5 months',
                            DATE_TRUNC('month', CURRENT_DATE),
                            INTERVAL '1 month'
                        ) AS mes
                 )
                 SELECT
                    TO_CHAR(meses.mes, 'YYYY-MM') AS mes,

                    COALESCE(
                        SUM(m.valor) FILTER (WHERE m.tipo = 'entrada'),
                        0
                    ) AS entradas,

                    COALESCE(
                        SUM(m.valor) FILTER (WHERE m.tipo = 'saida'),
                        0
                    ) AS saidas

                 FROM meses
                 LEFT JOIN movimentacao m
                    ON m.data >= meses.mes
                   AND m.data < meses.mes + INTERVAL '1 month'

                 GROUP BY meses.mes
                 ORDER BY meses.mes`
            ),

            // Saldo individual de todos os grupos.
            // Grupos inativos permanecem na consulta para preservar
            // a visualização do histórico financeiro.
            pool.query(
                `SELECT
                    g.idgrupo,
                    g.nome,
                    g.ativo,

                    COALESCE(
                        SUM(m.valor) FILTER (WHERE m.tipo = 'entrada'),
                        0
                    ) AS entradas,

                    COALESCE(
                        SUM(m.valor) FILTER (WHERE m.tipo = 'saida'),
                        0
                    ) AS saidas,

                    COALESCE(
                        SUM(
                            CASE
                                WHEN m.tipo = 'entrada' THEN m.valor
                                WHEN m.tipo = 'saida' THEN -m.valor
                                ELSE 0
                            END
                        ),
                        0
                    ) AS saldo

                 FROM grupo g
                 LEFT JOIN movimentacao m
                    ON m.grupo_id = g.idgrupo

                 GROUP BY
                    g.idgrupo,
                    g.nome,
                    g.ativo

                 ORDER BY g.ativo DESC, g.nome`
            ),

            // Próximos eventos ativos de todos os grupos.
            pool.query(
                `SELECT
                    e.idevento,
                    e.nome,
                    e.data_inicio,
                    e.data_fim,
                    e.grupo_id,
                    g.nome AS grupo_nome,

                    CASE
                        WHEN CURRENT_DATE BETWEEN e.data_inicio
                            AND COALESCE(e.data_fim, e.data_inicio)
                        THEN 'Em andamento'
                        ELSE 'Planejado'
                    END AS status

                 FROM evento e
                 INNER JOIN grupo g
                    ON g.idgrupo = e.grupo_id

                 WHERE e.ativo = TRUE
                   AND COALESCE(e.data_fim, e.data_inicio) >= CURRENT_DATE

                 ORDER BY e.data_inicio ASC, e.nome
                 LIMIT 5`
            )
        ]);

        return res.status(200).json({
            resumo: resumo.rows[0],
            dadosMensais: dadosMensais.rows,
            grupos: grupos.rows,
            eventos: eventos.rows
        });

    } catch (error) {
        console.error('Erro ao consultar dashboard do pastor:', error);

        return res.status(500).json({
            mensagem: 'Erro interno ao consultar os dados do dashboard.'
        });
    }
}

module.exports = {
    obterDashboardPastor
};
