// backend/controllers/dashboardController.js

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

exports.getStats = async (req, res) => {
    const usuarioId = req.usuarioId; // ID do usuário logado

    // Obter o primeiro e último dia do mês atual
    const agora = new Date();
    const primeiroDiaMes = new Date(agora.getFullYear(), agora.getMonth(), 1);
    const ultimoDiaMes = new Date(agora.getFullYear(), agora.getMonth() + 1, 0); // O dia 0 do próximo mês é o último dia do mês atual
    // Ajustar o último dia para o final do dia (23:59:59.999) para incluir tudo
    ultimoDiaMes.setHours(23, 59, 59, 999);


    try {
        // Usar Promise.all para executar as contagens em paralelo
        const [
            // Contagem de projetos por status (como antes)
            projetosPorStatus,
            // NOVA Contagem: Projetos cadastrados no mês atual
            projetosCadastradosMes
        ] = await Promise.all([
            // Agrupa e conta os projetos por status
            prisma.projeto.groupBy({
                by: ['status'],
                where: { criadoPorId: usuarioId },
                _count: { status: true }
            }),
            // Conta projetos criados entre o primeiro e último dia do mês atual
            prisma.projeto.count({
                where: {
                    criadoPorId: usuarioId,
                    data_cadastro: {
                        gte: primeiroDiaMes, // Maior ou igual ao primeiro dia
                        lte: ultimoDiaMes    // Menor ou igual ao último dia (com hora ajustada)
                    }
                }
            })
            // REMOVEMOS a contagem de prisma.montador.count() daqui
        ]);

        // Formata os dados para a resposta da API
        const stats = {
            // totalProjetos: // Removido por simplicidade, mas pode ser adicionado se necessário
            projetosMes: projetosCadastradosMes, // NOVA métrica
            pendentes: 0,
            emMontagem: 0,
            concluidos: 0
            // totalMontadores: // REMOVIDO
        };

        // Preenche as contagens por status
        projetosPorStatus.forEach(item => {
            if (item.status === 'Pendente') stats.pendentes = item._count.status;
            if (item.status === 'Em Montagem') stats.emMontagem = item._count.status;
            if (item.status === 'Concluído') stats.concluidos = item._count.status;
        });

        res.status(200).json(stats); // Retorna o objeto JSON com as estatísticas atualizadas

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
    // Definir data limite (ex: próximos 30 dias)
    const dataLimite = new Date();
    dataLimite.setDate(hoje.getDate() + 30);

    // Ajusta 'hoje' para o início do dia
    hoje.setHours(0, 0, 0, 0);

    try {
        // Busca projetos não concluídos com data de entrega dentro do limite
        const projetosComPrazo = await prisma.projeto.findMany({
            where: {
                criadoPorId: usuarioId,
                status: {
                    not: 'Concluído'
                },
                data_entrega: {
                    gte: hoje,         // Maior ou igual a hoje (início do dia)
                    lte: dataLimite    // Menor ou igual à data limite
                    // *** Linha "not: null" REMOVIDA daqui ***
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