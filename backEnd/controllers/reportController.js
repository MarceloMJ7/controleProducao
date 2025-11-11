// backend/controllers/reportController.js

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

exports.generateReport = async (req, res) => {
    const {
        reportType,  // 'projeto' ou 'montador'
        montadorId,  // ID do montador
        status,      // Status do projeto
        startDate,
        endDate
    } = req.body;
    
    const usuarioId = req.usuarioId; // Vem do middleware

    try {
        let responseData = {
            statistics: {},
            chartData: {},
            tableData: []
        };

        // --- 1. PREPARA O FILTRO DE DATA ---
        // O filtro de data será aplicado a todos os projetos consultados
        const dateFilter = {};
        if (startDate || endDate) {
            // Usamos 'updatedAt' como referência, pois é quando o status
            // (ex: 'Concluído') é definido.
            dateFilter.updatedAt = {};
            if (startDate) {
                dateFilter.updatedAt.gte = new Date(startDate);
            }
            if (endDate) {
                const dataFim = new Date(endDate);
                dataFim.setDate(dataFim.getDate() + 1); // Adiciona 1 dia
                dateFilter.updatedAt.lte = dataFim;
            }
        }

        // --- 2. LÓGICA DO RELATÓRIO "GERAL DE PROJETOS" ---
        if (reportType === 'projeto') {
            
            const whereClause = {
                criadoPorId: usuarioId,
                ...dateFilter // Aplica o filtro de data
            };

            if (status) {
                whereClause.status = status;
            }

            // Busca os projetos para a tabela
            const projetos = await prisma.projeto.findMany({
                where: whereClause,
                select: {
                    codigo_projeto: true,
                    nome_empresa: true,
                    status: true,
                    data_cadastro: true,
                    data_entrega: true,
                    teveNaoConformidade: true,
                    montadores: { select: { nome: true } }
                },
                orderBy: { data_entrega: 'desc' }
            });

            // Popula os dados da tabela
            responseData.tableData = projetos;

            // Calcula as estatísticas (KPIs)
            const totalProjetos = projetos.length;
            const totalConcluidos = projetos.filter(p => p.status === 'Concluído').length;
            const totalEmMontagem = projetos.filter(p => p.status === 'Em Montagem').length;
            const totalPendentes = projetos.filter(p => p.status === 'Pendente').length;
            const totalNaoConformes = projetos.filter(p => p.teveNaoConformidade).length;

            responseData.statistics = {
                totalProjetos: totalProjetos,
                percConcluidos: totalProjetos > 0 ? (totalConcluidos / totalProjetos * 100).toFixed(0) : 0,
                percPendentes: totalProjetos > 0 ? (totalPendentes / totalProjetos * 100).toFixed(0) : 0,
                // % de não conformidade sobre os concluídos
                percNaoConformes: totalConcluidos > 0 ? (totalNaoConformes / totalConcluidos * 100).toFixed(0) : 0,
            };

            // Prepara dados para o Gráfico de Pizza (Status)
            responseData.chartData = {
                type: 'pie',
                labels: ['Concluídos', 'Em Montagem', 'Pendentes'],
                data: [totalConcluidos, totalEmMontagem, totalPendentes]
            };
        }
        
        // --- 3. LÓGICA DO RELATÓRIO "DESEMPENHO DO MONTADOR" ---
        else if (reportType === 'montador') {
            
            const montadorWhere = {};
            if (montadorId) {
                montadorWhere.id = parseInt(montadorId);
            }
            
            const montadores = await prisma.montador.findMany({
                where: montadorWhere,
                select: { id: true, nome: true }
            });

            const baseProjectWhere = {
                criadoPorId: usuarioId,
                status: 'Concluído', // Relatório de montador foca em produtividade (concluídos)
                ...dateFilter
            };

            // Gera a tabela e os dados do gráfico
            const montadorStats = await Promise.all(
                montadores.map(async (montador) => {
                    const concluidos = await prisma.projeto.count({
                        where: {
                            ...baseProjectWhere,
                            montadores: { some: { id: montador.id } },
                        }
                    });
                    const naoConformes = await prisma.projeto.count({
                        where: {
                            ...baseProjectWhere,
                            montadores: { some: { id: montador.id } },
                            teveNaoConformidade: true
                        }
                    });
                    return {
                        id: montador.id,
                        nome: montador.nome,
                        projetosConcluidos: concluidos,
                        naoConformidades: naoConformes
                    };
                })
            );

            // Popula os dados da tabela
            responseData.tableData = montadorStats;

            // Calcula as estatísticas (KPIs)
            const totalMontadores = montadorStats.length;
            const totalProjetosConcluidos = montadorStats.reduce((acc, m) => acc + m.projetosConcluidos, 0);
            const totalNaoConformidades = montadorStats.reduce((acc, m) => acc + m.naoConformidades, 0);

            responseData.statistics = {
                totalMontadores: totalMontadores,
                totalProjetosConcluidos: totalProjetosConcluidos,
                mediaProjetosPorMontador: totalMontadores > 0 ? (totalProjetosConcluidos / totalMontadores).toFixed(1) : 0,
                taxaNaoConformidadeGeral: totalProjetosConcluidos > 0 ? (totalNaoConformidades / totalProjetosConcluidos * 100).toFixed(0) : 0
            };

            // Prepara dados para o Gráfico de Barras (Desempenho)
            responseData.chartData = {
                type: 'bar',
                labels: montadorStats.map(m => m.nome),
                datasets: [
                    {
                        label: 'Projetos Concluídos',
                        data: montadorStats.map(m => m.projetosConcluidos),
                        backgroundColor: 'rgba(54, 162, 235, 0.7)', // Azul
                    },
                    {
                        label: 'Não Conformidades',
                        data: montadorStats.map(m => m.naoConformidades),
                        backgroundColor: 'rgba(255, 99, 132, 0.7)', // Vermelho
                    }
                ]
            };
        }
        
        // Retorna o objeto completo
        res.status(200).json(responseData);

    } catch (error) {
        console.error("Erro ao gerar relatório:", error);
        res.status(500).json({ message: "Erro interno ao gerar relatório." });
    }
};