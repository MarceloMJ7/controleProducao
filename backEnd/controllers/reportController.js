// backend/controllers/reportController.js

const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

// Função auxiliar com arredondamento correto (toFixed)
// Substituímos o Math.floor para garantir precisão matemática
function calcularPorcentagemSegura(parte, total) {
  if (!total || total === 0) return 0;
  return Number(((parte / total) * 100).toFixed(1));
}

exports.generateReport = async (req, res) => {
  const {
    reportType,
    montadorId,
    status,
    teveNaoConformidade,
    startDate,
    endDate,
  } = req.body;

  const usuarioId = req.usuarioId;

  try {
    let responseData = {
      statistics: {},
      chartData: {},
      tableData: [],
    };

    // 1. Filtro de Data
    const dateFilter = {};
    if (startDate || endDate) {
      dateFilter.updatedAt = {};
      if (startDate) dateFilter.updatedAt.gte = new Date(startDate);
      if (endDate) {
        const dataFim = new Date(endDate);
        dataFim.setDate(dataFim.getDate() + 1);
        dateFilter.updatedAt.lte = dataFim;
      }
    }

    // 2. Filtro Base (Aplica-se aos dados filtrados)
    const baseWhere = { criadoPorId: usuarioId, ...dateFilter };
    
    // Flag para saber se estamos num modo filtrado de N/C
    const isFilteringNC = teveNaoConformidade === "true" || teveNaoConformidade === "false";

    if (teveNaoConformidade === "true") {
      baseWhere.teveNaoConformidade = true;
      baseWhere.status = "Concluído";
    } else if (teveNaoConformidade === "false") {
      baseWhere.teveNaoConformidade = false;
      baseWhere.status = "Concluído";
    }
    
    if (status && !baseWhere.status) {
        baseWhere.status = status;
    }

    // --- RELATÓRIO GERAL DE PROJETOS ---
    if (reportType === "projeto") {
      
      // Busca Principal (Respeita todos os filtros)
      const todosProjetos = await prisma.projeto.findMany({
        where: baseWhere,
        select: {
          status: true,
          teveNaoConformidade: true,
          data_cadastro: true,
          data_entrega: true,
          updatedAt: true,
        },
      });

      // CÁLCULO ESPECIAL: Total de Concluídos Geral (Ignora filtro de N/C)
      // Necessário para calcular a porcentagem correta (ex: 3 erros em 4 totais)
      const countConcluidosGeral = await prisma.projeto.count({
        where: {
            criadoPorId: usuarioId,
            status: "Concluído",
            ...dateFilter
        }
      });

      // Contagens Filtradas
      const totalProjetos = todosProjetos.length;
      const qtdConcluidosFiltrados = todosProjetos.filter(p => p.status === "Concluído").length;
      const qtdEmMontagem = todosProjetos.filter(p => p.status === "Em Montagem").length;
      const qtdPendentes = todosProjetos.filter(p => p.status === "Pendente").length;
      
      const denominadorConcluidos = isFilteringNC ? countConcluidosGeral : totalProjetos;

      // --- CORREÇÃO DE PORCENTAGEM (SOMA 100%) ---
      // 1. Calcula as duas primeiras porcentagens normalmente
      const percConcluidos = calcularPorcentagemSegura(qtdConcluidosFiltrados, denominadorConcluidos);
      const percEmMontagem = calcularPorcentagemSegura(qtdEmMontagem, totalProjetos);

      // 2. Calcula Pendentes pelo "Resto" para fechar 100%
      let percPendentes;
      
      if (!isFilteringNC && totalProjetos > 0) {
          // Se estamos no relatório geral, o que sobrar é Pendente
          const somaAtuais = percConcluidos + percEmMontagem;
          percPendentes = Number((100 - somaAtuais).toFixed(1));
          
          // Segurança para não dar negativo em casos extremos
          if (percPendentes < 0) percPendentes = 0;
      } else {
          // Se for filtro específico (N/C), calcula normalmente
          percPendentes = calcularPorcentagemSegura(qtdPendentes, totalProjetos);
      }

      // Prazos
      let somaDiasExecucao = 0;
      let qtdAtrasados = 0;
      const projetosConcluidosArr = todosProjetos.filter(p => p.status === "Concluído");

      projetosConcluidosArr.forEach((p) => {
        const diffTime = new Date(p.updatedAt) - new Date(p.data_cadastro);
        const diffDays = Math.max(0, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));
        somaDiasExecucao += diffDays;

        const dataConclusao = new Date(p.updatedAt).setHours(0, 0, 0, 0);
        const dataPrevista = new Date(p.data_entrega).setHours(0, 0, 0, 0);

        if (dataConclusao > dataPrevista) qtdAtrasados++;
      });

      const mediaDias = projetosConcluidosArr.length > 0
          ? (somaDiasExecucao / projetosConcluidosArr.length).toFixed(1)
          : 0;
      
      const qtdNoPrazo = qtdConcluidosFiltrados - qtdAtrasados;

      // Montagem Estatísticas
      responseData.statistics = {
        totalProjetos: totalProjetos, 
        totalConcluidosGeral: countConcluidosGeral, 
        isFilteringNC: isFilteringNC,

        qtdConcluidos: qtdConcluidosFiltrados,
        qtdEmMontagem: qtdEmMontagem,
        qtdPendentes: qtdPendentes,
        
        // Porcentagens Corrigidas
        percConcluidos: percConcluidos,
        percEmMontagem: percEmMontagem,
        percPendentes: percPendentes,
        
        mediaDiasEntrega: mediaDias,
        qtdAtrasados: qtdAtrasados,
        percNoPrazo: calcularPorcentagemSegura(qtdNoPrazo, qtdConcluidosFiltrados),
      };

      responseData.chartData = {
        type: "pie",
        title: "Distribuição",
        labels: isFilteringNC ? ["Selecionados", "Outros Concluídos"] : ["Concluídos", "Em Montagem", "Pendentes"],
        data: isFilteringNC 
            ? [qtdConcluidosFiltrados, countConcluidosGeral - qtdConcluidosFiltrados] 
            : [qtdConcluidosFiltrados, qtdEmMontagem, qtdPendentes],
      };

      // Tabela
      const tableWhere = { ...baseWhere };
      const projetosFiltrados = await prisma.projeto.findMany({
        where: tableWhere,
        select: {
          codigo_projeto: true,
          nome_empresa: true,
          status: true,
          data_cadastro: true,
          data_entrega: true,
          teveNaoConformidade: true,
          descricaoNaoConformidade: true,
          montadores: { select: { nome: true } },
        },
        orderBy: { data_entrega: "desc" },
      });

      responseData.tableData = projetosFiltrados;
    }

    // --- RELATÓRIO DE MONTADOR ---
    else if (reportType === "montador") {
      const montadorWhere = {};
      if (montadorId) montadorWhere.id = parseInt(montadorId);

      const montadores = await prisma.montador.findMany({
        where: montadorWhere,
        select: { id: true, nome: true },
      });

      const baseProjectStatsWhere = {
        criadoPorId: usuarioId,
        status: "Concluído", 
        ...dateFilter 
      };
      
      if (teveNaoConformidade === "true") baseProjectStatsWhere.teveNaoConformidade = true;
      else if (teveNaoConformidade === "false") baseProjectStatsWhere.teveNaoConformidade = false;

      let montadorStats = await Promise.all(
        montadores.map(async (montador) => {
          const concluidos = await prisma.projeto.count({
            where: { ...baseProjectStatsWhere, montadores: { some: { id: montador.id } } },
          });
          const naoConformes = await prisma.projeto.count({
            where: { ...baseProjectStatsWhere, montadores: { some: { id: montador.id } }, teveNaoConformidade: true },
          });
          return {
            id: montador.id,
            nome: montador.nome,
            projetosConcluidos: concluidos,
            naoConformidades: naoConformes,
          };
        })
      );

      montadorStats.sort((a, b) => b.projetosConcluidos - a.projetosConcluidos);
      responseData.tableData = montadorStats;
      
      const totalMontadores = montadorStats.length;
      const totalProjetosConcluidos = montadorStats.reduce((acc, m) => acc + m.projetosConcluidos, 0);
      const totalNaoConformidades = montadorStats.reduce((acc, m) => acc + m.naoConformidades, 0);

      responseData.statistics = {
        totalMontadores: totalMontadores,
        totalProjetosConcluidos: totalProjetosConcluidos,
        qtdNaoConformidades: totalNaoConformidades,
        mediaProjetosPorMontador: totalMontadores > 0 ? (totalProjetosConcluidos / totalMontadores).toFixed(1) : 0,
        taxaNaoConformidadeGeral: calcularPorcentagemSegura(totalNaoConformidades, totalProjetosConcluidos),
      };

      responseData.chartData = {
        type: "bar",
        title: montadorId ? "Desempenho Individual" : "Top 10 Montadores",
        labels: montadorStats.slice(0, 10).map((m) => m.nome),
        datasets: [
          { label: "Concluídos", data: montadorStats.slice(0, 10).map((m) => m.projetosConcluidos) },
          { label: "Não Conformidades", data: montadorStats.slice(0, 10).map((m) => m.naoConformidades) },
        ],
      };
    }

    res.status(200).json(responseData);
  } catch (error) {
    console.error("Erro relatorio:", error);
    res.status(500).json({ message: "Erro interno." });
  }
};