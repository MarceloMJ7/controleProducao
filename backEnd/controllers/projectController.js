// backend/controllers/projectController.js

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// --- CRIAR PROJETO (ATUALIZADO) ---
exports.createProject = async (req, res) => {
    // data_entrega agora é obrigatória
    const { codigo_projeto, nome_empresa, status, descricao, data_cadastro, data_entrega, montadorIds } = req.body;
    const criadoPorId = req.usuarioId; 

    // *** ALTERAÇÃO AQUI: Adicionada validação para data_entrega ***
    if (!codigo_projeto || !nome_empresa || !status || !data_cadastro || !data_entrega) {
        return res.status(400).json({ message: "Campos obrigatórios ausentes (código, nome da empresa, status, data de cadastro, data de entrega)." });
    }

    try {
        // Prepara os dados para criação
        const data = {
            codigo_projeto,
            nome_empresa,
            status,
            descricao,
            data_cadastro: new Date(data_cadastro),
            data_entrega: new Date(data_entrega), // Agora é sempre uma data válida
            criadoPorId, 
            montadores: {} 
        };

        if (montadorIds && Array.isArray(montadorIds) && montadorIds.length > 0) {
            const validIds = montadorIds.map(id => parseInt(id)).filter(id => !isNaN(id));
            if (validIds.length > 0) {
                data.montadores = {
                    connect: validIds.map(id => ({ id: id }))
                };
            }
        }

        const novoProjeto = await prisma.projeto.create({ data: data });
        res.status(201).json(novoProjeto);

    } catch (error) {
        console.error("Erro ao criar projeto:", error);
        if (error.code === 'P2002' && error.meta?.target?.includes('codigo_projeto')) {
             return res.status(409).json({ message: "Código do projeto já existe." });
        }
        res.status(500).json({ message: "Erro interno ao criar projeto." });
    }
};

// --- ATUALIZAR PROJETO (ATUALIZADO) ---
exports.updateProject = async (req, res) => {
    const { id } = req.params;
    // data_entrega agora é obrigatória
    const { codigo_projeto, nome_empresa, status, descricao, data_cadastro, data_entrega, montadorIds } = req.body;
    const usuarioId = req.usuarioId;

    // *** ALTERAÇÃO AQUI: Validação de data_entrega adicionada ***
    if (!data_entrega) {
         return res.status(400).json({ message: "O campo data de entrega é obrigatório." });
    }
    // (Outras validações podem ser adicionadas se necessário)

    try {
        const projetoExistente = await prisma.projeto.findUnique({
            where: { id: parseInt(id) }
        });
        if (!projetoExistente || projetoExistente.criadoPorId !== usuarioId) {
            return res.status(404).json({ message: "Projeto não encontrado ou não autorizado." });
        }

        const data = {
            codigo_projeto,
            nome_empresa,
            status,
            descricao,
            data_cadastro: data_cadastro ? new Date(data_cadastro) : undefined,
            data_entrega: new Date(data_entrega), // Agora é obrigatório e convertido para Date
            montadores: {}
        };

        let connectMontadores = [];
        if (montadorIds && Array.isArray(montadorIds) && montadorIds.length > 0) {
            const validIds = montadorIds.map(id => parseInt(id)).filter(id => !isNaN(id));
            if (validIds.length > 0) {
                connectMontadores = validIds.map(id => ({ id: id }));
            }
        }
        data.montadores = {
            set: connectMontadores
        };

        const projetoAtualizado = await prisma.projeto.update({
            where: { id: parseInt(id) },
            data: data
        });

        res.status(200).json(projetoAtualizado);

    } catch (error) {
        console.error("Erro ao atualizar projeto:", error);
        if (error.code === 'P2002' && error.meta?.target?.includes('codigo_projeto')) {
             return res.status(409).json({ message: "Código do projeto já existe." });
        }
        res.status(500).json({ message: "Erro interno ao atualizar projeto." });
    }
};

// --- ATUALIZAR PROJETO (ATUALIZADO) ---
exports.updateProject = async (req, res) => {
    const { id } = req.params; // Pega o ID do projeto da URL
    // Pega os dados atualizados do corpo da requisição
    // Espera 'montadorIds' como um array de números [1, 2, ...] ou vazio/null
    const { codigo_projeto, nome_empresa, status, descricao, data_cadastro, data_entrega, montadorIds } = req.body;
    const usuarioId = req.usuarioId; // ID do usuário logado

    try {
        // Verifica se o projeto existe e pertence ao usuário
        const projetoExistente = await prisma.projeto.findUnique({
            where: { id: parseInt(id) }
        });
        if (!projetoExistente || projetoExistente.criadoPorId !== usuarioId) {
            return res.status(404).json({ message: "Projeto não encontrado ou não autorizado." });
        }

        // Prepara os dados para atualização
        const data = {
            codigo_projeto,
            nome_empresa,
            status,
            descricao,
            data_cadastro: data_cadastro ? new Date(data_cadastro) : undefined, // Só atualiza se for enviado
            data_entrega: data_entrega ? new Date(data_entrega) : null, // Permite limpar a data
            montadores: {} // Objeto para definir os montadores
        };

        // --- LÓGICA PARA DEFINIR MONTADORES ---
        let connectMontadores = [];
        if (montadorIds && Array.isArray(montadorIds) && montadorIds.length > 0) {
             // Filtra para garantir que são apenas números válidos
            const validIds = montadorIds.map(id => parseInt(id)).filter(id => !isNaN(id));
            if (validIds.length > 0) {
                connectMontadores = validIds.map(id => ({ id: id }));
            }
        }

        // Usa a sintaxe 'set' do Prisma para substituir TODAS as conexões existentes
        // Se connectMontadores for [], ele desconectará todos os montadores atuais.
        data.montadores = {
            set: connectMontadores // Formato: [{id: 1}, {id: 2}, ...] ou []
        };


        // Atualiza o projeto no banco de dados
        const projetoAtualizado = await prisma.projeto.update({
            where: { id: parseInt(id) },
            data: data
        });

        res.status(200).json(projetoAtualizado); // Retorna o projeto atualizado

    } catch (error) {
        console.error("Erro ao atualizar projeto:", error);
         // Verifica erro de código de projeto duplicado
        if (error.code === 'P2002' && error.meta?.target?.includes('codigo_projeto')) {
             return res.status(409).json({ message: "Código do projeto já existe." });
        }
        res.status(500).json({ message: "Erro interno ao atualizar projeto." });
    }
};

// --- LISTAR TODOS OS PROJETOS (ATUALIZADO) ---
exports.getAllProjects = async (req, res) => {
    const { nome, status } = req.query;
    const usuarioId = req.usuarioId;

    try {
        const where = {
            criadoPorId: usuarioId
        };

        if (nome) {
            where.OR = [
                { nome_empresa: { contains: nome, mode: 'insensitive' } },
                { codigo_projeto: { contains: nome, mode: 'insensitive' } }
            ];
        }

        if (status) {
            where.status = status;
        }

        const projetos = await prisma.projeto.findMany({
            where: where,
            // Seleciona os campos necessários E os novos campos de não conformidade
            select: {
                id: true,
                codigo_projeto: true,
                nome_empresa: true,
                status: true,
                descricao: true,
                data_cadastro: true,
                data_entrega: true,
                criadoPorId: true, // Necessário para include
                teveNaoConformidade: true,      // <-- ADICIONADO
                descricaoNaoConformidade: true, // <-- ADICIONADO
                montadores: { // Incluindo montadores dentro do select
                    select: {
                        id: true,
                        nome: true
                    }
                }
            },
            // Se você usava include antes, pode manter, mas select é mais explícito
            // include: {
            //     montadores: { select: { id: true, nome: true } }
            // },
            orderBy: {
                data_cadastro: 'desc'
            }
        });

        res.status(200).json(projetos);

    } catch (error) {
        console.error("Erro ao listar projetos:", error);
        res.status(500).json({ message: "Erro interno ao buscar projetos." });
    }
};

// --- BUSCAR UM PROJETO POR ID (ATUALIZADO) ---
exports.getProjectById = async (req, res) => {
    const { id } = req.params;
    const usuarioId = req.usuarioId;

    try {
        const projeto = await prisma.projeto.findUnique({
            where: {
                id: parseInt(id)
            },
             // --- ALTERAÇÃO AQUI ---
             // Inclui a LISTA de montadores associados
            include: {
                montadores: { // Nome da relação definida no schema
                    select: { // Seleciona apenas id e nome dos montadores
                        id: true,
                        nome: true
                    }
                }
            }
        });

        // Verifica se o projeto existe e pertence ao usuário
        if (!projeto || projeto.criadoPorId !== usuarioId) {
            return res.status(404).json({ message: "Projeto não encontrado ou não autorizado." });
        }

        res.status(200).json(projeto);

    } catch (error) {
        console.error("Erro ao buscar projeto por ID:", error);
        res.status(500).json({ message: "Erro interno ao buscar projeto." });
    }
};

// --- DELETAR PROJETO (SEM ALTERAÇÕES NECESSÁRIAS NA LÓGICA PRINCIPAL) ---
// O Prisma cuida automaticamente de remover as ligações na tabela N-M quando um projeto é deletado.
exports.deleteProject = async (req, res) => {
    const { id } = req.params;
    const usuarioId = req.usuarioId;

    try {
        // Verifica se o projeto existe e pertence ao usuário antes de deletar
         const projetoExistente = await prisma.projeto.findUnique({
            where: { id: parseInt(id) }
        });
        if (!projetoExistente || projetoExistente.criadoPorId !== usuarioId) {
            return res.status(404).json({ message: "Projeto não encontrado ou não autorizado." });
        }

        // Deleta o projeto
        await prisma.projeto.delete({
            where: {
                id: parseInt(id),
            },
        });

        res.status(204).send(); // Sucesso, sem conteúdo

    } catch (error) {
        console.error("Erro ao deletar projeto:", error);
        res.status(500).json({ message: "Erro interno ao deletar projeto." });
    }
};

exports.marcarNaoConformidade = async (req, res) => {
    const { id } = req.params; // ID do projeto da URL
    const { teveNaoConformidade, descricaoNaoConformidade } = req.body; // Dados do corpo da requisição
    const usuarioId = req.usuarioId; // ID do usuário logado

    // Validação básica de entrada
    if (typeof teveNaoConformidade !== 'boolean') {
        return res.status(400).json({ message: "O campo 'teveNaoConformidade' deve ser true ou false." });
    }
    // Se marcou como não conforme, a descrição pode ser opcional mas não deve ser vazia se enviada
    // Se desmarcou, limpamos a descrição
    const descFinal = teveNaoConformidade ? (descricaoNaoConformidade || null) : null;


    try {
        // Busca o projeto para verificar permissão e status (opcionalmente)
        const projeto = await prisma.projeto.findUnique({
            where: { id: parseInt(id) },
            select: { criadoPorId: true, status: true } // Seleciona só o necessário
        });

        if (!projeto || projeto.criadoPorId !== usuarioId) {
            return res.status(404).json({ message: "Projeto não encontrado ou não autorizado." });
        }

       
        if (projeto.status !== 'Concluído' && teveNaoConformidade === true) {
             return res.status(400).json({ message: "Só é possível marcar não conformidade em projetos já concluídos." });
        }
    

        // Atualiza apenas os campos de não conformidade
        const projetoAtualizado = await prisma.projeto.update({
            where: { id: parseInt(id) },
            data: {
                teveNaoConformidade: teveNaoConformidade,
                descricaoNaoConformidade: descFinal
            }
        });

        res.status(200).json({
             message: "Status de não conformidade atualizado.",
             projeto: { // Retorna só os campos relevantes para confirmação
                 id: projetoAtualizado.id,
                 teveNaoConformidade: projetoAtualizado.teveNaoConformidade,
                 descricaoNaoConformidade: projetoAtualizado.descricaoNaoConformidade
             }
         });

    } catch (error) {
        console.error("Erro ao marcar não conformidade:", error);
        res.status(500).json({ message: "Erro interno ao atualizar não conformidade." });
    }
};