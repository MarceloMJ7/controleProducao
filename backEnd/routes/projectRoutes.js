const express = require('express');
const { PrismaClient } = require('@prisma/client');
const verificarToken = require('../middleware/authMiddleware'); 

const router = express.Router();
const prisma = new PrismaClient();

// =========================================================
//  ROTA PROTEGIDA PARA BUSCAR TODOS OS PROJETOS
// =========================================================
router.get('/projetos', verificarToken, async (req, res) => {
    // Se o código chegou até aqui, significa que o token é válido
    // e o middleware `verificarToken` chamou a função next().

    try {
        const projetos = await prisma.projeto.findMany({
            include: {
                montador: true // Inclui os dados do montador relacionado
            }
        });
        res.status(200).json(projetos);
    } catch (error) {
        res.status(500).json({ message: "Erro ao buscar projetos." });
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
router.put('/projetos/:id', verificarToken, async (req, res) => {
    const { id } = req.params;
    const dadosParaAtualizar = req.body; // Pega todos os dados do corpo

    try {
        // PASSO A: Primeiro, vamos verificar se o projeto realmente existe
        const projetoExistente = await prisma.projeto.findUnique({
            where: { id: parseInt(id) },
        });

        // Se ele não existir (retornar null), enviamos um erro 404
        if (!projetoExistente) {
            return res.status(404).json({ message: "Projeto não encontrado." });
        }

        // PASSO B: Se ele existe, aí sim, nós o atualizamos
        const projetoAtualizado = await prisma.projeto.update({
            where: {
                id: parseInt(id),
            },
            data: dadosParaAtualizar, 
        });

        res.status(200).json(projetoAtualizado);

    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Erro ao atualizar projeto." });
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