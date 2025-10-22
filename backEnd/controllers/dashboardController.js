// backend/controllers/dashboardController.js

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

exports.getStats = async (req, res) => {
    // Pega o ID do usuário logado, que o middleware de autenticação nos fornece
    const usuarioId = req.usuarioId;

    try {
        // Usamos Promise.all para executar todas as contagens em paralelo, o que é muito mais rápido
        const [
            totalProjetos,
            projetosPorStatus,
            totalMontadores
        ] = await Promise.all([
            // Conta todos os projetos criados pelo usuário logado
            prisma.projeto.count({ where: { criadoPorId: usuarioId } }),

            // Agrupa e conta os projetos por status
            prisma.projeto.groupBy({
                by: ['status'],
                where: { criadoPorId: usuarioId },
                _count: {
                    status: true
                }
            }),

            // Conta todos os montadores (geralmente eles são para toda a empresa)
            prisma.montador.count()
        ]);

        // Formata os dados para ser fácil de usar no front-end
        const stats = {
            totalProjetos: totalProjetos,
            totalMontadores: totalMontadores,
            pendentes: 0,
            emMontagem: 0,
            concluidos: 0
        };

        projetosPorStatus.forEach(item => {
            if (item.status === 'Pendente') stats.pendentes = item._count.status;
            if (item.status === 'Em Montagem') stats.emMontagem = item._count.status;
            if (item.status === 'Concluído') stats.concluidos = item._count.status;
        });

        // Retorna um único objeto JSON com todos os resultados
        res.status(200).json(stats);

    } catch (error) {
        console.error("Erro ao buscar estatísticas do dashboard:", error);
        res.status(500).json({ message: "Erro ao buscar estatísticas." });
    }
};