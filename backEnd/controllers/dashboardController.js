// backend/controllers/dashboardController.js

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

exports.getStats = async (req, res) => {
    const usuarioId = req.usuarioId;

    // Definição do intervalo do mês atual
    const agora = new Date();
    const primeiroDiaMes = new Date(agora.getFullYear(), agora.getMonth(), 1);
    const ultimoDiaMes = new Date(agora.getFullYear(), agora.getMonth() + 1, 0);
    ultimoDiaMes.setHours(23, 59, 59, 999);

    try {
        const [pendentes, emMontagem, concluidosMes, projetosCadastradosMes] = await Promise.all([
            
            // 1. Pendentes (Total Geral - Estoque)
            // Mantém geral para nenhum serviço antigo ficar esquecido na fila.
            prisma.projeto.count({
                where: { criadoPorId: usuarioId, status: 'Pendente' }
            }),

            // 2. Em Montagem (Total Geral - Carga de Trabalho)
            // Mantém geral para mostrar o volume real de trabalho na oficina hoje.
            prisma.projeto.count({
                where: { criadoPorId: usuarioId, status: 'Em Montagem' }
            }),

            // 3. Concluídos (MÊS ATUAL - Produtividade) [CORRIGIDO]
            // Filtra pela data de atualização (quando foi concluído) dentro deste mês.
            prisma.projeto.count({
                where: {
                    criadoPorId: usuarioId,
                    status: 'Concluído',
                    updatedAt: { gte: primeiroDiaMes, lte: ultimoDiaMes }
                }
            }),

            // 4. Cadastrados (Mês Atual - Entradas)
            prisma.projeto.count({
                where: {
                    criadoPorId: usuarioId,
                    data_cadastro: { gte: primeiroDiaMes, lte: ultimoDiaMes }
                }
            })
        ]);

        const stats = {
            projetosMes: projetosCadastradosMes, // Entradas
            pendentes: pendentes,                // Fila
            emMontagem: emMontagem,              // Em Andamento
            concluidos: concluidosMes            // Saídas (Meta do Mês)
        };

        res.status(200).json(stats);

    } catch (error) {
        console.error("Erro ao buscar estatísticas do dashboard:", error);
        res.status(500).json({ message: "Erro ao buscar estatísticas." });
    }
};

// --- AS OUTRAS FUNÇÕES (Atencao, Atualizacoes, Prazos) PERMANECEM IGUAIS ---
exports.getProjetosAtencao = async (req, res) => {
    const usuarioId = req.usuarioId;
    const hoje = new Date();
    try {
        const projetosAtrasados = await prisma.projeto.findMany({
            where: {
                criadoPorId: usuarioId,
                status: { not: 'Concluído' },
                data_entrega: { lt: hoje }
            },
            select: {
                id: true, codigo_projeto: true, nome_empresa: true,
                status: true, data_entrega: true, descricao: true
            },
            orderBy: { data_entrega: 'asc' },
            take: 5
        });
        const resultado = projetosAtrasados.map(p => ({ ...p, tipo_atencao: 'Atrasado' }));
        res.status(200).json(resultado);
    } catch (error) { res.status(500).json({ message: "Erro ao buscar projetos." }); }
};

exports.getUltimasAtualizacoes = async (req, res) => {
    const usuarioId = req.usuarioId;
    try {
        const projetosRecentes = await prisma.projeto.findMany({
            where: { criadoPorId: usuarioId },
            select: {
                id: true, codigo_projeto: true, nome_empresa: true,
                status: true, data_cadastro: true
            },
            orderBy: { data_cadastro: 'desc' },
            take: 5
        });
        res.status(200).json(projetosRecentes);
    } catch (error) { res.status(500).json({ message: "Erro ao buscar atualizações." }); }
};

exports.getPrazosProximos = async (req, res) => {
    const usuarioId = req.usuarioId;
    const hoje = new Date();
    const dataLimite = new Date();
    dataLimite.setDate(hoje.getDate() + 30);
    hoje.setHours(0, 0, 0, 0);
    try {
        const projetosComPrazo = await prisma.projeto.findMany({
            where: {
                criadoPorId: usuarioId,
                status: { not: 'Concluído' },
                data_entrega: { gte: hoje, lte: dataLimite }
            },
            select: { id: true, codigo_projeto: true, nome_empresa: true, data_entrega: true },
            orderBy: { data_entrega: 'asc' },
            take: 5
        });
        res.status(200).json(projetosComPrazo);
    } catch (error) { res.status(500).json({ message: "Erro ao buscar prazos." }); }
};