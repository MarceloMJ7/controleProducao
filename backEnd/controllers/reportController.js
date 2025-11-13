// backend/controllers/reportController.js

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

exports.generateReport = async (req, res) => {
    const {
        reportType,
        montadorId,
        status,
        teveNaoConformidade,
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
        const dateFilter = {};
        if (startDate || endDate) {
            dateFilter.updatedAt = {}; // Usando 'updatedAt' (quando foi concluído/atualizado)
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
            
            // --- CONSULTA PARA KPIs E GRÁFICO (Ignora filtros de status/NC) ---
            const statsWhere = {
                criadoPorId: usuarioId,
                ...dateFilter
            };
            
            const todosProjetosDoPeriodo = await prisma.projeto.findMany({
                where: statsWhere,
                select: { status: true, teveNaoConformidade: true }
            });

            // Calcula as estatísticas (KPIs) com base em TODOS os projetos
            const totalProjetos = todosProjetosDoPeriodo.length;
            const totalConcluidos = todosProjetosDoPeriodo.filter(p => p.status === 'Concluído').length;
            const totalEmMontagem = todosProjetosDoPeriodo.filter(p => p.status === 'Em Montagem').length;
            const totalPendentes = todosProjetosDoPeriodo.filter(p => p.status === 'Pendente').length;
            const totalNaoConformes = todosProjetosDoPeriodo.filter(p => p.teveNaoConformidade).length;

            responseData.statistics = {
                totalProjetos: totalProjetos,
                percConcluidos: totalProjetos > 0 ? (totalConcluidos / totalProjetos * 100).toFixed(0) : 0,
                percEmMontagem: totalProjetos > 0 ? (totalEmMontagem / totalProjetos * 100).toFixed(0) : 0, 
                
                // ==========================================================
                // ==== ESTA É A LINHA QUE FOI CORRIGIDA (adicionado : 0) ====
                // ==========================================================
                percPendentes: totalProjetos > 0 ? (totalPendentes / totalProjetos * 100).toFixed(0) : 0,
                
                percNaoConformes: totalConcluidos > 0 ? (totalNaoConformes / totalConcluidos * 100).toFixed(0) : 0,
            };

            // Prepara dados para o Gráfico de Pizza (Status)
            responseData.chartData = {
                type: 'pie',
                title: 'Distribuição de Status de Projetos',
                labels: ['Concluídos', 'Em Montagem', 'Pendentes'],
                data: [totalConcluidos, totalEmMontagem, totalPendentes]
            };

            // --- CONSULTA PARA A TABELA (Respeita TODOS os filtros) ---
            const tableWhere = { ...statsWhere }; 
            if (status) {
                tableWhere.status = status; 
            }
            if (teveNaoConformidade === 'true') {
                tableWhere.teveNaoConformidade = true; 
            } else if (teveNaoConformidade === 'false') {
                tableWhere.teveNaoConformidade = false; 
            }

            const projetosFiltrados = await prisma.projeto.findMany({
                where: tableWhere,
                select: {
                    codigo_projeto: true, nome_empresa: true, status: true,
                    data_cadastro: true, data_entrega: true, teveNaoConformidade: true,
                    montadores: { select: { nome: true } }
                },
                orderBy: { data_entrega: 'desc' }
            });
            
            responseData.tableData = projetosFiltrados;
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
                status: 'Concluído', 
                ...dateFilter
            };

            let montadorStats = await Promise.all(
                montadores.map(async (montador) => {
                    const concluidos = await prisma.projeto.count({
                        where: { ...baseProjectWhere, montadores: { some: { id: montador.id } } }
                    });
                    const naoConformes = await prisma.projeto.count({
                        where: { ...baseProjectWhere, montadores: { some: { id: montador.id } }, teveNaoConformidade: true }
                    });
                    return {
                        id: montador.id,
                        nome: montador.nome,
                        projetosConcluidos: concluidos,
                        naoConformidades: naoConformes
                    };
                })
            );

            montadorStats.sort((a, b) => b.projetosConcluidos - a.projetosConcluidos);
            
            responseData.tableData = montadorStats;

            const top10Montadores = montadorStats.slice(0, 10);
            
            const totalMontadores = montadorStats.length;
            const totalProjetosConcluidos = montadorStats.reduce((acc, m) => acc + m.projetosConcluidos, 0);
            const totalNaoConformidades = montadorStats.reduce((acc, m) => acc + m.naoConformidades, 0);

            responseData.statistics = {
                totalMontadores: totalMontadores,
                totalProjetosConcluidos: totalProjetosConcluidos,
                mediaProjetosPorMontador: totalMontadores > 0 ? (totalProjetosConcluidos / totalMontadores).toFixed(1) : 0,
                taxaNaoConformidadeGeral: totalProjetosConcluidos > 0 ? (totalNaoConformidades / totalProjetosConcluidos * 100).toFixed(0) : 0
            };

            responseData.chartData = {
                type: 'bar',
                title: montadorId ? 'Desempenho do Montador' : 'Top 10 Montadores por Projetos Concluídos',
                labels: top10Montadores.map(m => m.nome),
                datasets: [
                    {
                        label: 'Projetos Concluídos',
                        data: top10Montadores.map(m => m.projetosConcluidos),
                    },
                    {
                        label: 'Não Conformidades',
                        data: top10Montadores.map(m => m.naoConformidades),
                    }
                ]
            };
        }
        
        res.status(200).json(responseData);

    } catch (error) {
        console.error("Erro ao gerar relatório:", error);
        res.status(500).json({ message: "Erro interno ao gerar relatório." });
    }
};