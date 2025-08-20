const express = require('express');
const { PrismaClient } = require('@prisma/client');
const verificarToken = require('../middleware/authMiddleware'); // <-- Importando nosso segurança

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
    // Pega os dados enviados pelo front-end no corpo (body) da requisição
    const { codigo_projeto, nome_empresa, status, descricao, data_entrega, montadorId } = req.body;

    // Pega a ID do usuário que está logado (graças ao nosso middleware verificarToken)
    // No futuro, poderíamos usar isso para registrar quem criou o projeto
    const usuarioId = req.usuarioId;

    try {
        // Usa o Prisma para criar um novo registro na tabela 'Projeto'
        const novoProjeto = await prisma.projeto.create({
            data: {
                codigo_projeto,
                nome_empresa,
                status,
                descricao,
                data_entrega: new Date(data_entrega), // Converte o texto da data para o formato de data
                montadorId, // Associa o projeto ao ID do montador
            }
        });

        // Envia de volta uma resposta de sucesso com os dados do projeto criado
        res.status(201).json(novoProjeto);

    } catch (error) {
        console.error(error); // Mostra o erro detalhado no terminal do back-end
        res.status(500).json({ message: "Erro ao criar projeto." });
    }
});

module.exports = router;