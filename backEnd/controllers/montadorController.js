// backend/controllers/montadorController.js

const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

// Lógica para CRIAR um novo montador
exports.createMontador = async (req, res) => {
  const { nome, numero_registro } = req.body;
  try {
    const novoMontador = await prisma.montador.create({
      data: { nome, numero_registro },
    });
    res.status(201).json(novoMontador);
  } catch (error) {
    if (error.code === "P2002") {
      return res.status(409).json({ message: "Número de registro já existe." });
    }
    console.error("Erro ao criar montador:", error);
    res.status(500).json({ message: "Erro ao cadastrar montador." });
  }
};

// ### INÍCIO DA VERSÃO 100% CORRIGIDA ###
// Lógica para LISTAR todos os montadores (COM ESTATÍSTICAS)
exports.getAllMontadores = async (req, res) => {
    const { nome } = req.query;

    const hoje = new Date();
    const inicioDoMes = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
    const fimDoMes = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0, 23, 59, 59);

    try {
        const where = {};
        if (nome) {
            where.nome = {
                contains: nome,
                mode: 'insensitive'
            };
        }

        // 1. Busca os montadores e os seus projetos relacionados
        const montadoresComProjetos = await prisma.montador.findMany({
            where: where,
            orderBy: { nome: 'asc' },
            include: {
                // Traz os projetos de cada montador para podermos contar
                projetos: {
                    select: {
                        status: true,
                        data_entrega: true
                    }
                }
            }
        });

        console.log("DADOS VINDOS DO PRISMA:", JSON.stringify(montadoresComProjetos, null, 2));

        // 2. Com os dados em mãos, faz a contagem em JavaScript
        const resultadoFormatado = montadoresComProjetos.map(montador => {
            // Conta quantos projetos têm o status 'Em Montagem'
            const projetosAtivos = montador.projetos.filter(p => p.status === 'Em Montagem').length;
            
            // Conta quantos projetos estão 'Concluído' E a data de entrega está no mês atual
            const concluidosNoMes = montador.projetos.filter(p => {
                return p.status === 'Concluído' && 
                       p.data_entrega && 
                       new Date(p.data_entrega) >= inicioDoMes && 
                       new Date(p.data_entrega) <= fimDoMes;
            }).length;

            // Retorna o objeto formatado que o front-end espera
            return {
                id: montador.id,
                nome: montador.nome,
                numero_registro: montador.numero_registro,
                projetosAtivos: projetosAtivos,
                concluidosNoMes: concluidosNoMes
            };
        });

        res.status(200).json(resultadoFormatado);

    } catch (error) {
        console.error("Erro ao listar montadores com estatísticas:", error);
        res.status(500).json({ message: "Erro interno ao buscar montadores." });
    }
};
// ### FIM DA VERSÃO CORRIGIDA ###


// Lógica para BUSCAR UM montador por ID
exports.getMontadorById = async (req, res) => {
  const { id } = req.params;
  try {
    const buscarMontador = await prisma.montador.findUnique({
      where: { id: parseInt(id) },
    });
    if (!buscarMontador) {
      return res.status(404).json({ message: "Montador não encontrado" });
    }
    res.status(200).json(buscarMontador);
  } catch (error) {
    console.error("Erro ao buscar montador por ID:", error);
    return res.status(500).json({ message: "Erro interno no servidor" });
  }
};

// Lógica para ATUALIZAR um montador
exports.updateMontador = async (req, res) => {
  const { id } = req.params;
  const dadosAtt = req.body;
  try {
    const montadorAtt = await prisma.montador.update({
      where: { id: parseInt(id) },
      data: dadosAtt,
    });
    res.status(200).json(montadorAtt);
  } catch (error) {
    console.error("Erro ao atualizar montador:", error);
    return res.status(500).json({ message: "Erro interno no servidor" });
  }
};

// Lógica para DELETAR um montador
exports.deleteMontador = async (req, res) => {
  const { id } = req.params;
  try {
    await prisma.montador.delete({
      where: { id: parseInt(id) },
    });
    res.status(204).send();
  } catch (error) {
    console.error("Erro ao deletar montador:", error);
    res.status(500).json({ message: "Erro ao deletar montador" });
  }
};