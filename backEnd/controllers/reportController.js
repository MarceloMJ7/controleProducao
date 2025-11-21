// backend/controllers/reportController.js

const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

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

    // --- RELATÓRIO GERAL DE PROJETOS ---
    if (reportType === "projeto") {
      const statsWhere = { criadoPorId: usuarioId, ...dateFilter };

      // BUSCA DADOS PARA CÁLCULO (Incluindo datas agora)
      const todosProjetos = await prisma.projeto.findMany({
        where: statsWhere,
        select: {
          status: true,
          teveNaoConformidade: true,
          data_cadastro: true,
          data_entrega: true,
          updatedAt: true,
        },
      });

      // 1. Contagens Básicas
      const totalProjetos = todosProjetos.length;
      const totalConcluidos = todosProjetos.filter(
        (p) => p.status === "Concluído"
      ).length;
      const totalEmMontagem = todosProjetos.filter(
        (p) => p.status === "Em Montagem"
      ).length;
      const totalPendentes = todosProjetos.filter(
        (p) => p.status === "Pendente"
      ).length;
      const totalNaoConformes = todosProjetos.filter(
        (p) => p.teveNaoConformidade
      ).length;

      // 2. Cálculos de Inteligência (Prazos e Tempo)
      let somaDiasExecucao = 0;
      let qtdAtrasados = 0;
      const projetosConcluidosArr = todosProjetos.filter(
        (p) => p.status === "Concluído"
      );

      projetosConcluidosArr.forEach((p) => {
        // Tempo de Execução (Conclusão - Cadastro)
        const diffTime = new Date(p.updatedAt) - new Date(p.data_cadastro);
        const diffDays = Math.max(
          0,
          Math.ceil(diffTime / (1000 * 60 * 60 * 24))
        );
        somaDiasExecucao += diffDays;

        // Atraso (Conclusão > Entrega Prevista)
        // Comparamos datas sem considerar horas para ser justo
        const dataConclusao = new Date(p.updatedAt).setHours(0, 0, 0, 0);
        const dataPrevista = new Date(p.data_entrega).setHours(0, 0, 0, 0);

        if (dataConclusao > dataPrevista) {
          qtdAtrasados++;
        }
      });

      const mediaDias =
        projetosConcluidosArr.length > 0
          ? (somaDiasExecucao / projetosConcluidosArr.length).toFixed(1)
          : 0;
      const qtdNoPrazo = totalConcluidos - qtdAtrasados;
      const percNoPrazo =
        totalConcluidos > 0
          ? ((qtdNoPrazo / totalConcluidos) * 100).toFixed(0)
          : 0;

      // Monta o Objeto de Estatísticas
      responseData.statistics = {
        totalProjetos: totalProjetos,

        // Quantidades
        qtdConcluidos: totalConcluidos,
        qtdEmMontagem: totalEmMontagem,
        qtdPendentes: totalPendentes,
        qtdNaoConformes: totalNaoConformes,

        // Porcentagens Básicas
        percConcluidos:
          totalProjetos > 0
            ? ((totalConcluidos / totalProjetos) * 100).toFixed(0)
            : 0,
        percEmMontagem:
          totalProjetos > 0
            ? ((totalEmMontagem / totalProjetos) * 100).toFixed(0)
            : 0,
        percPendentes:
          totalProjetos > 0
            ? ((totalPendentes / totalProjetos) * 100).toFixed(0)
            : 0,
        percNaoConformes:
          totalConcluidos > 0
            ? ((totalNaoConformes / totalConcluidos) * 100).toFixed(0)
            : 0,

        // NOVOS DADOS AVANÇADOS
        mediaDiasEntrega: mediaDias,
        qtdAtrasados: qtdAtrasados,
        percNoPrazo: percNoPrazo, // Ex: 95% entregue no prazo
      };

      responseData.chartData = {
        type: "pie",
        title: "Distribuição de Status",
        labels: ["Concluídos", "Em Montagem", "Pendentes"],
        data: [totalConcluidos, totalEmMontagem, totalPendentes],
      };

      // Consulta da Tabela
      const tableWhere = { ...statsWhere };
      if (status) tableWhere.status = status;
      if (teveNaoConformidade === "true") tableWhere.teveNaoConformidade = true;
      else if (teveNaoConformidade === "false")
        tableWhere.teveNaoConformidade = false;

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

      const baseProjectWhere = {
        criadoPorId: usuarioId,
        status: "Concluído",
        ...dateFilter,
      };

      let montadorStats = await Promise.all(
        montadores.map(async (montador) => {
          const concluidos = await prisma.projeto.count({
            where: {
              ...baseProjectWhere,
              montadores: { some: { id: montador.id } },
            },
          });
          const naoConformes = await prisma.projeto.count({
            where: {
              ...baseProjectWhere,
              montadores: { some: { id: montador.id } },
              teveNaoConformidade: true,
            },
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
      const top10Montadores = montadorStats.slice(0, 10);

      const totalMontadores = montadorStats.length;
      const totalProjetosConcluidos = montadorStats.reduce(
        (acc, m) => acc + m.projetosConcluidos,
        0
      );
      const totalNaoConformidades = montadorStats.reduce(
        (acc, m) => acc + m.naoConformidades,
        0
      );

      responseData.statistics = {
        totalMontadores: totalMontadores,
        totalProjetosConcluidos: totalProjetosConcluidos,
        qtdNaoConformidades: totalNaoConformidades,
        mediaProjetosPorMontador:
          totalMontadores > 0
            ? (totalProjetosConcluidos / totalMontadores).toFixed(1)
            : 0,
        taxaNaoConformidadeGeral:
          totalProjetosConcluidos > 0
            ? ((totalNaoConformidades / totalProjetosConcluidos) * 100).toFixed(
                0
              )
            : 0,
      };

      responseData.chartData = {
        type: "bar",
        title: montadorId
          ? "Desempenho Individual"
          : "Top 10 Montadores (Produtividade)",
        labels: top10Montadores.map((m) => m.nome),
        datasets: [
          {
            label: "Projetos Concluídos",
            data: top10Montadores.map((m) => m.projetosConcluidos),
          },
          {
            label: "Não Conformidades",
            data: top10Montadores.map((m) => m.naoConformidades),
          },
        ],
      };
    }

    res.status(200).json(responseData);
  } catch (error) {
    console.error("Erro ao gerar relatório:", error);
    res.status(500).json({ message: "Erro interno ao gerar relatório." });
  }
};
