const express = require('express');
const { PrismaClient } = require('@prisma/client');
const verificarToken = require('../middleware/authMiddleware'); 

const router = express.Router();
const prisma = new PrismaClient();

// =========================================================
//  ROTA PROTEGIDA PARA BUSCAR TODOS OS PROJETOS
// =========================================================
// Rota para listar todos os projetos (com filtros)
router.get('/projetos', verificarToken, async (req, res) => {
    // Extrai os possíveis filtros da URL (ex: /api/projetos?nome=...&status=...)
    const { nome, status } = req.query;

    try {
        // Cria um objeto 'where' para a consulta do Prisma
        const where = {};

        // Se um 'nome' foi fornecido, adiciona um filtro de nome da empresa
        if (nome) {
            where.nome_empresa = {
                contains: nome, // Procura por texto que "contém" o valor
                mode: 'insensitive' // Ignora maiúsculas/minúsculas
            };
        }

        // Se um 'status' foi fornecido, adiciona um filtro de status
        if (status) {
            where.status = status;
        }

        const projetos = await prisma.projeto.findMany({
            where: where, // Usa o objeto de filtros que construímos
            include: { montador: true },
            orderBy: { data_cadastro: 'desc' }
        });
        res.json(projetos);
    } catch (error) {
        console.error(error); // Bom para ver o erro detalhado no log da Vercel
        res.status(500).json({ message: 'Erro ao buscar projetos.' });
    }
});

router.post('/projetos', verificarToken, async (req, res) => {
    // Garanta que 'data_cadastro' está sendo pego aqui
    const { codigo_projeto, nome_empresa, status, descricao, data_cadastro, data_entrega, montadorId } = req.body;

    try {
        const novoProjeto = await prisma.projeto.create({
            data: {
                codigo_projeto,
                nome_empresa,
                status,
                descricao,
                data_cadastro: new Date(data_cadastro), // Converte o texto para Data
                data_entrega: data_entrega ? new Date(data_entrega) : null, // Converte se existir
                montadorId: parseInt(montadorId), // Garante que o ID seja um número
            }
        });
        res.status(201).json(novoProjeto);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Erro ao criar projeto." });
    }
});

//Put Rota para att 

// ROTA PUT ATUALIZADA COM VERIFICAÇÃO DE EXISTÊNCIA
// ROTA PUT ATUALIZADA E ROBUSTA
router.put('/projetos/:id', verificarToken, async (req, res) => {
    const { id } = req.params;
    const dadosRecebidos = req.body;

    try {
        // PASSO A: Primeiro, verificar se o projeto que queremos editar realmente existe
        const projetoExistente = await prisma.projeto.findUnique({
            where: { id: parseInt(id) },
        });

        if (!projetoExistente) {
            return res.status(404).json({ message: "Projeto não encontrado para atualizar." });
        }

        // PASSO B: Preparar os dados para atualização, convertendo o que for necessário
        const dadosParaAtualizar = { ...dadosRecebidos }; // Copia os dados recebidos

        // Se a data_cadastro foi enviada, converte para o formato Date
        if (dadosRecebidos.data_cadastro) {
            dadosParaAtualizar.data_cadastro = new Date(dadosRecebidos.data_cadastro);
        }

        // Se a data_entrega foi enviada, converte para o formato Date
        if (dadosRecebidos.data_entrega) {
            dadosParaAtualizar.data_entrega = new Date(dadosRecebidos.data_entrega);
        } else if (dadosRecebidos.data_entrega === null || dadosRecebidos.data_entrega === '') {
            // Isso permite que a data de entrega seja apagada (definida como nula)
            dadosParaAtualizar.data_entrega = null;
        }

        // PASSO C: Se tudo estiver certo, atualizar o projeto
        const projetoAtualizado = await prisma.projeto.update({
            where: { id: parseInt(id) },
            data: dadosParaAtualizar,
        });

        res.status(200).json(projetoAtualizado);

    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Erro ao atualizar projeto." });
    }
});
//  NOVA ROTA: GET para buscar UM ÚNICO projeto por ID
// =========================================================
router.get('/projetos/:id', verificarToken, async (req, res) => {
    const { id } = req.params;

    try {
        const projeto = await prisma.projeto.findUnique({
            where: {
                id: parseInt(id)
            },
            // Usamos 'include' para também trazer os dados do montador associado
            include: {
                montador: true,
            }
        });

        // Se o projeto com esse ID não for encontrado
        if (!projeto) {
            return res.status(404).json({ message: "Projeto não encontrado." });
        }

        // Se encontrou, envia os dados do projeto
        res.status(200).json(projeto);

    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Erro ao buscar dados do projeto." });
    }
});
// Rota para deletar arquivos 

router.delete('/projetos/:id', verificarToken, async (req, res) => {
    // 1. Pega o ID do projeto que veio na URL
    const { id } = req.params;

    try {
        // 2. Usa o Prisma para deletar o projeto ONDE o ID bate
        await prisma.projeto.delete({
            where: {
                id: parseInt(id),
            },
        });

        // 3. Devolve uma resposta de sucesso, mas sem conteúdo
        res.status(204).send();

    } catch (error) {
        res.status(500).json({ message: "Erro ao deletar projeto." });
    }
});
module.exports = router;