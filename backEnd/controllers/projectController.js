// backend/controllers/projectController.js
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

// Lógica para LISTAR todos os projetos (com filtros)
exports.getAllProjects = async (req, res) => {
  const { nome, status } = req.query;
  const usuarioId = req.usuarioId;
  try {
    const where = { criadoPorId: usuarioId };
    if (nome) {
      where.nome_empresa = { contains: nome, mode: "insensitive" };
    }
    if (status) {
      where.status = status;
    }
    const projetos = await prisma.projeto.findMany({
      where: where,
      include: { montador: true },
      orderBy: { data_cadastro: "desc" },
    });
    res.json(projetos);
  } catch (error) {
    console.error("Erro ao buscar projetos:", error);
    res.status(500).json({ message: "Erro ao buscar projetos." });
  }
};

// Lógica para CRIAR um novo projeto
exports.createProject = async (req, res) => {
  const {
    codigo_projeto,
    nome_empresa,
    status,
    descricao,
    data_cadastro,
    data_entrega,
    montadorId,
  } = req.body;
  const criadorId = req.usuarioId;
  try {
    const novoProjeto = await prisma.projeto.create({
      data: {
        codigo_projeto,
        nome_empresa,
        status,
        descricao,
        data_cadastro: new Date(data_cadastro),
        data_entrega: data_entrega ? new Date(data_entrega) : null,
        criadoPorId: criadorId,
        montadorId: parseInt(montadorId),
      },
    });
    res.status(201).json(novoProjeto);
  } catch (error) {
    console.error("Erro ao criar projeto:", error);
    res.status(500).json({ message: "Erro ao criar projeto." });
  }
};

// Lógica para BUSCAR UM projeto por ID
exports.getProjectById = async (req, res) => {
  const { id } = req.params;
  const usuarioId = req.usuarioId;
  try {
    const projeto = await prisma.projeto.findFirst({
      where: {
        id: parseInt(id),
        criadoPorId: usuarioId, // Garante que o usuário só pode buscar seus próprios projetos
      },
      include: { montador: true },
    });
    if (!projeto) {
      return res.status(404).json({ message: "Projeto não encontrado." });
    }
    res.status(200).json(projeto);
  } catch (error) {
    console.error("Erro ao buscar projeto por ID:", error);
    res.status(500).json({ message: "Erro ao buscar dados do projeto." });
  }
};

// Lógica para ATUALIZAR um projeto
exports.updateProject = async (req, res) => {
  const { id } = req.params;
  const usuarioId = req.usuarioId;
  const dadosParaAtualizar = req.body;
  try {
    // Primeiro, verifica se o projeto pertence ao usuário
    const projetoExistente = await prisma.projeto.findFirst({
      where: { id: parseInt(id), criadoPorId: usuarioId },
    });
    if (!projetoExistente) {
      return res
        .status(404)
        .json({
          message:
            "Projeto não encontrado ou você não tem permissão para editá-lo.",
        });
    }

    // Converte as datas se elas forem enviadas
    if (dadosParaAtualizar.data_cadastro) {
      dadosParaAtualizar.data_cadastro = new Date(
        dadosParaAtualizar.data_cadastro
      );
    }
    if (dadosParaAtualizar.data_entrega) {
      dadosParaAtualizar.data_entrega = new Date(
        dadosParaAtualizar.data_entrega
      );
    } else if (
      dadosParaAtualizar.data_entrega === null ||
      dadosParaAtualizar.data_entrega === ""
    ) {
      dadosParaAtualizar.data_entrega = null;
    }
    if (dadosParaAtualizar.montadorId) {
      dadosParaAtualizar.montadorId = parseInt(dadosParaAtualizar.montadorId);
    }

    const projetoAtualizado = await prisma.projeto.update({
      where: { id: parseInt(id) },
      data: dadosParaAtualizar,
    });
    res.status(200).json(projetoAtualizado);
  } catch (error) {
    console.error("Erro ao atualizar projeto:", error);
    res.status(500).json({ message: "Erro ao atualizar projeto." });
  }
};

// Lógica para DELETAR um projeto
exports.deleteProject = async (req, res) => {
  const { id } = req.params;
  const usuarioId = req.usuarioId;
  try {
    // Primeiro, verifica se o projeto pertence ao usuário
    const projetoExistente = await prisma.projeto.findFirst({
      where: { id: parseInt(id), criadoPorId: usuarioId },
    });
    if (!projetoExistente) {
      return res
        .status(404)
        .json({
          message:
            "Projeto não encontrado ou você não tem permissão para deletá-lo.",
        });
    }

    await prisma.projeto.delete({
      where: { id: parseInt(id) },
    });
    res.status(204).send();
  } catch (error) {
    console.error("Erro ao deletar projeto:", error);
    res.status(500).json({ message: "Erro ao deletar projeto." });
  }
};
