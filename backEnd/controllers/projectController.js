const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Lógica para LISTAR todos os projetos (com filtros)
// Em exports.getAllProjects
exports.getAllProjects = async (req, res) => {
    const { nome, status } = req.query;
    // Pega o ID do usuário logado
    const usuarioId = req.usuarioId;

    try {
        const where = {
            // FILTRO DE AUTORIZAÇÃO OBRIGATÓRIO!
            criadoPorId: usuarioId 
        };

        if (nome) {
            where.nome_empresa = { contains: nome, mode: 'insensitive' };
        }
        if (status) {
            where.status = status;
        }

        const projetos = await prisma.projeto.findMany({
            where: where,
            include: { montador: true },
            orderBy: { data_cadastro: 'desc' }
        });
        res.json(projetos);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Erro ao buscar projetos.' });
    }
};

// Lógica para CRIAR um novo projeto
// Em exports.createProject
exports.createProject = async (req, res) => {
    const { codigo_projeto, nome_empresa, status, descricao, data_cadastro, data_entrega, montadorId } = req.body;

    // Pega o ID do usuário que o middleware 'verificarToken' nos deu
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
                montadorId: parseInt(montadorId),

                // A LIGAÇÃO É FEITA AQUI:
                criadoPorId: criadorId
            }
        });
        res.status(201).json(novoProjeto);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Erro ao criar projeto." });
    }
};

// Lógica para BUSCAR UM projeto por ID
exports.getProjectById = async (req, res) => {
    const { id } = req.params;
    try {
        const projeto = await prisma.projeto.findUnique({
            where: { id: parseInt(id) },
            include: { montador: true }
        });
        if (!projeto) {
            return res.status(404).json({ message: "Projeto não encontrado." });
        }
        res.status(200).json(projeto);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Erro ao buscar dados do projeto." });
    }
};

// Lógica para ATUALIZAR um projeto
exports.updateProject = async (req, res) => {
    const { id } = req.params;
    const dadosRecebidos = req.body;
    try {
        const projetoExistente = await prisma.projeto.findUnique({
            where: { id: parseInt(id) },
        });
        if (!projetoExistente) {
            return res.status(404).json({ message: "Projeto não encontrado para atualizar." });
        }

        const dadosParaAtualizar = { ...dadosRecebidos };
        if (dadosRecebidos.data_cadastro) {
            dadosParaAtualizar.data_cadastro = new Date(dadosRecebidos.data_cadastro);
        }
        if (dadosRecebidos.data_entrega) {
            dadosParaAtualizar.data_entrega = new Date(dadosRecebidos.data_entrega);
        } else if (dadosRecebidos.data_entrega === null || dadosRecebidos.data_entrega === '') {
            dadosParaAtualizar.data_entrega = null;
        }

        const projetoAtualizado = await prisma.projeto.update({
            where: { id: parseInt(id) },
            data: dadosParaAtualizar,
        });
        res.status(200).json(projetoAtualizado);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Erro ao atualizar projeto." });
    }
};

// Lógica para DELETAR um projeto
exports.deleteProject = async (req, res) => {
    const { id } = req.params;
    try {
        await prisma.projeto.delete({
            where: { id: parseInt(id) },
        });
        res.status(204).send();
    } catch (error) {
        res.status(500).json({ message: "Erro ao deletar projeto." });
    }
};