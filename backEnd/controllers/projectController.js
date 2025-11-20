// backend/controllers/projectController.js

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// --- CRIAR PROJETO ---
exports.createProject = async (req, res) => {
    const { codigo_projeto, nome_empresa, status, descricao, data_cadastro, data_entrega, montadorIds } = req.body;
    const criadoPorId = req.usuarioId; 

    if (!codigo_projeto || !nome_empresa || !status || !data_cadastro || !data_entrega) {
        return res.status(400).json({ message: "Campos obrigatórios ausentes." });
    }

    try {
        const data = {
            codigo_projeto, nome_empresa, status, descricao,
            data_cadastro: new Date(data_cadastro),
            data_entrega: new Date(data_entrega),
            criadoPorId, 
            montadores: {} 
        };

        if (montadorIds && Array.isArray(montadorIds) && montadorIds.length > 0) {
            const validIds = montadorIds.map(id => parseInt(id)).filter(id => !isNaN(id));
            if (validIds.length > 0) {
                data.montadores = { connect: validIds.map(id => ({ id: id })) };
            }
        }

        const novoProjeto = await prisma.projeto.create({ data: data });
        res.status(201).json(novoProjeto);

    } catch (error) {
        if (error.code === 'P2002') return res.status(409).json({ message: "Código do projeto já existe." });
        res.status(500).json({ message: "Erro interno ao criar projeto." });
    }
};

// --- ATUALIZAR PROJETO (CORRIGIDO - ÚNICA VERSÃO) ---
exports.updateProject = async (req, res) => {
    const { id } = req.params;
    const { codigo_projeto, nome_empresa, status, descricao, data_cadastro, data_entrega, montadorIds } = req.body;
    const usuarioId = req.usuarioId;

    // Validação de segurança: Data de entrega é obrigatória no banco
    if (!data_entrega) {
         return res.status(400).json({ message: "A data de entrega é obrigatória." });
    }

    try {
        const projetoExistente = await prisma.projeto.findUnique({ where: { id: parseInt(id) } });
        if (!projetoExistente || projetoExistente.criadoPorId !== usuarioId) {
            return res.status(404).json({ message: "Projeto não encontrado ou não autorizado." });
        }

        const data = {
            codigo_projeto, nome_empresa, status, descricao,
            data_cadastro: data_cadastro ? new Date(data_cadastro) : undefined,
            data_entrega: new Date(data_entrega), // Nunca será null aqui pois validamos acima
            montadores: {}
        };

        let connectMontadores = [];
        if (montadorIds && Array.isArray(montadorIds)) {
            const validIds = montadorIds.map(id => parseInt(id)).filter(id => !isNaN(id));
            connectMontadores = validIds.map(id => ({ id: id }));
        }
        data.montadores = { set: connectMontadores };

        const projetoAtualizado = await prisma.projeto.update({ where: { id: parseInt(id) }, data: data });
        res.status(200).json(projetoAtualizado);

    } catch (error) {
        console.error("Erro update:", error);
        if (error.code === 'P2002') return res.status(409).json({ message: "Código duplicado." });
        res.status(500).json({ message: "Erro interno ao atualizar." });
    }
};

// --- LISTAR TODOS OS PROJETOS ---
exports.getAllProjects = async (req, res) => {
    const { nome, status, page = 1, limit = 10 } = req.query; 
    const usuarioId = req.usuarioId;

    const p_page = parseInt(page);
    const p_limit = parseInt(limit);
    const skip = (p_page - 1) * p_limit; 

    try {
        const where = { criadoPorId: usuarioId };

        if (nome) {
            where.OR = [
                { nome_empresa: { contains: nome, mode: 'insensitive' } },
                { codigo_projeto: { contains: nome, mode: 'insensitive' } }
            ];
        }
        if (status) where.status = status;

        const total = await prisma.projeto.count({ where: where });

        const projetos = await prisma.projeto.findMany({
            where: where,
            skip: skip,     
            take: p_limit,  
            select: {
                id: true, codigo_projeto: true, nome_empresa: true, status: true,
                descricao: true, data_cadastro: true, data_entrega: true,
                teveNaoConformidade: true, descricaoNaoConformidade: true,
                montadores: { select: { id: true, nome: true } }
            },
            orderBy: { data_cadastro: 'desc' }
        });

        res.status(200).json({
            data: projetos,
            meta: {
                total: total,
                page: p_page,
                limit: p_limit,
                totalPages: Math.ceil(total / p_limit)
            }
        });

    } catch (error) {
        res.status(500).json({ message: "Erro interno ao buscar projetos." });
    }
};

// --- OUTRAS FUNÇÕES ---
exports.getProjectById = async (req, res) => {
    const { id } = req.params;
    const usuarioId = req.usuarioId;
    try {
        const projeto = await prisma.projeto.findUnique({
            where: { id: parseInt(id) },
            include: { montadores: { select: { id: true, nome: true } } }
        });
        if (!projeto || projeto.criadoPorId !== usuarioId) return res.status(404).json({ message: "Não encontrado." });
        res.status(200).json(projeto);
    } catch (error) { res.status(500).json({ message: "Erro interno." }); }
};

exports.deleteProject = async (req, res) => {
    const { id } = req.params;
    const usuarioId = req.usuarioId;
    try {
         const proj = await prisma.projeto.findUnique({ where: { id: parseInt(id) } });
        if (!proj || proj.criadoPorId !== usuarioId) return res.status(404).json({ message: "Não encontrado." });
        await prisma.projeto.delete({ where: { id: parseInt(id) } });
        res.status(204).send();
    } catch (error) { res.status(500).json({ message: "Erro interno." }); }
};

exports.marcarNaoConformidade = async (req, res) => {
    const { id } = req.params;
    const { teveNaoConformidade, descricaoNaoConformidade } = req.body;
    const usuarioId = req.usuarioId;

    if (typeof teveNaoConformidade !== 'boolean') return res.status(400).json({ message: "Campo inválido." });
    const descFinal = teveNaoConformidade ? (descricaoNaoConformidade || null) : null;

    try {
        const projeto = await prisma.projeto.findUnique({
            where: { id: parseInt(id) },
            select: { criadoPorId: true, status: true }
        });

        if (!projeto || projeto.criadoPorId !== usuarioId) return res.status(404).json({ message: "Não encontrado." });

        const atualizado = await prisma.projeto.update({
            where: { id: parseInt(id) },
            data: { teveNaoConformidade: teveNaoConformidade, descricaoNaoConformidade: descFinal }
        });
        res.status(200).json({ message: "Atualizado.", projeto: atualizado });
    } catch (error) { res.status(500).json({ message: "Erro interno." }); }
};