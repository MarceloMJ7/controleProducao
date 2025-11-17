// backend/controllers/montadorController.js

const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

// --- CRIAR MONTADOR ---
exports.createMontador = async (req, res) => {
  const { nome, numero_registro } = req.body;
  try {
    const novoMontador = await prisma.montador.create({
      data: { nome, numero_registro },
    });
    res.status(201).json(novoMontador);
  } catch (error) {
    if (error.code === "P2002") return res.status(409).json({ message: "Registro já existe." });
    res.status(500).json({ message: "Erro ao cadastrar." });
  }
};

// --- LISTAR MONTADORES (COM PAGINAÇÃO) ---
exports.getAllMontadores = async (req, res) => {
    const { nome, page = 1, limit = 10 } = req.query; 
    
    const p_page = parseInt(page);
    const p_limit = parseInt(limit);
    const skip = (p_page - 1) * p_limit;

    const agora = new Date();
    const primeiroDiaMes = new Date(agora.getFullYear(), agora.getMonth(), 1);
    const ultimoDiaMes = new Date(agora.getFullYear(), agora.getMonth() + 1, 0, 23, 59, 59);

    try {
        const where = {};
        if (nome) {
            where.nome = { contains: nome, mode: 'insensitive' };
        }

        // 1. Conta total
        const total = await prisma.montador.count({ where: where });

        // 2. Busca paginado
        const montadores = await prisma.montador.findMany({
            where: where,
            orderBy: { nome: 'asc' },
            skip: skip,
            take: p_limit
        });

        // 3. Calcula estatísticas para esta página
        const montadoresComStats = await Promise.all(
            montadores.map(async (montador) => {
                const projetosAtivos = await prisma.projeto.count({
                    where: {
                        montadores: { some: { id: montador.id } },
                        status: 'Em Montagem'
                    }
                });
                const concluidosNoMes = await prisma.projeto.count({
                    where: {
                        montadores: { some: { id: montador.id } },
                        status: 'Concluído',
                        updatedAt: { gte: primeiroDiaMes, lte: ultimoDiaMes }
                    }
                });
                return { ...montador, projetosAtivos, concluidosNoMes };
            })
        );

        // 4. Retorna com metadados
        res.status(200).json({
            data: montadoresComStats,
            meta: {
                total: total,
                page: p_page,
                limit: p_limit,
                totalPages: Math.ceil(total / p_limit)
            }
        });

    } catch (error) {
        console.error("Erro ao listar montadores:", error);
        res.status(500).json({ message: "Erro interno." });
    }
};

// --- BUSCAR POR ID ---
exports.getMontadorById = async (req, res) => {
  const { id } = req.params;
  try {
      const montador = await prisma.montador.findUnique({ where: { id: parseInt(id) } });
      if (!montador) return res.status(404).json({ message: "Não encontrado" });
      res.status(200).json(montador);
  } catch (e) { res.status(500).json({message: "Erro"}); }
};

// --- ATUALIZAR ---
exports.updateMontador = async (req, res) => {
  const { id } = req.params;
  const dadosAtt = req.body;
  try {
    const montadorAtt = await prisma.montador.update({ where: { id: parseInt(id) }, data: dadosAtt });
    res.status(200).json(montadorAtt);
  } catch (error) { res.status(500).json({ message: "Erro" }); }
};

// --- DELETAR ---
exports.deleteMontador = async (req, res) => {
  const { id } = req.params;
  try {
    await prisma.montador.delete({ where: { id: parseInt(id) } });
    res.status(204).send();
  } catch (error) { res.status(500).json({ message: "Erro" }); }
};