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

// backend/controllers/dashboardController.js
// ... (a função getStats continua aqui em cima)

// NOVA FUNÇÃO para buscar projetos que exigem atenção
exports.getProjetosAtencao = async (req, res) => {
    const usuarioId = req.usuarioId;
    const hoje = new Date();

    try {
        const projetosAtrasados = await prisma.projeto.findMany({
            where: {
                criadoPorId: usuarioId,
                status: {
                    not: 'Concluído'
                },
                data_entrega: {
                    lt: hoje
                }
            },
            select: { // Seleciona campos necessários
                id: true,
                codigo_projeto: true,
                nome_empresa: true, // <-- ADICIONE ESTA LINHA
                status: true,
                data_entrega: true,
                descricao: true
            },
            orderBy: {
                data_entrega: 'asc'
            },
            take: 5
        });

        // Adiciona o tipo de atenção
        const resultado = projetosAtrasados.map(p => ({
            ...p,
            tipo_atencao: 'Atrasado'
        }));

        res.status(200).json(resultado);

    } catch (error) {
        console.error("Erro ao buscar projetos que exigem atenção:", error);
        res.status(500).json({ message: "Erro ao buscar projetos com atenção." });
    }
};

// NOVA FUNÇÃO para buscar as últimas atualizações (projetos recentes)
exports.getUltimasAtualizacoes = async (req, res) => {
    const usuarioId = req.usuarioId;

    try {
        const projetosRecentes = await prisma.projeto.findMany({
            where: {
                criadoPorId: usuarioId
            },
            select: { // Seleciona campos relevantes
                id: true,
                codigo_projeto: true,
                nome_empresa: true, // <-- ADICIONE ESTA LINHA
                status: true,
                data_cadastro: true
            },
            orderBy: {
                data_cadastro: 'desc'
            },
            take: 5
        });

        res.status(200).json(projetosRecentes);

    } catch (error) {
        console.error("Erro ao buscar últimas atualizações:", error);
        res.status(500).json({ message: "Erro ao buscar atualizações." });
    }
};

exports.getPrazosProximos = async (req, res) => {
    const usuarioId = req.usuarioId;
    const hoje = new Date();
    // Definir data limite (ex: próximos 30 dias). Ajuste conforme necessário.
    const dataLimite = new Date();
    dataLimite.setDate(hoje.getDate() + 30);

    // Ajusta 'hoje' para o início do dia para incluir entregas de hoje
    hoje.setHours(0, 0, 0, 0);

    try {
        // Busca projetos não concluídos com data de entrega definida e dentro do limite
        const projetosComPrazo = await prisma.projeto.findMany({
            where: {
                criadoPorId: usuarioId,
                status: {
                    not: 'Concluído'
                },
                data_entrega: {
                    gte: hoje,         // Maior ou igual a hoje (início do dia)
                    lte: dataLimite,   // Menor ou igual à data limite
                    not: null          // Garante que a data de entrega não é nula
                }
            },
            select: { // Seleciona campos para a tabela
                id: true,
                codigo_projeto: true,
                nome_empresa: true,
                data_entrega: true
            },
            orderBy: {
                data_entrega: 'asc' // Ordena pelos prazos mais próximos primeiro
            },
            take: 5 // Limita a 5 resultados
        });

        res.status(200).json(projetosComPrazo);

    } catch (error) {
        console.error("Erro ao buscar prazos próximos:", error);
        res.status(500).json({ message: "Erro ao buscar prazos de entrega." });
    }
};