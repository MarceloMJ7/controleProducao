// Bloco 1: Importando as ferramentas
const express = require('express');
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken'); // <-- NOVA IMPORTAÇÃO

// Bloco 2: Inicializando as ferramentas
const router = express.Router();
const prisma = new PrismaClient();

// Rota POST para CADASTRAR um usuário (já existe)
router.post('/usuarios', async (req, res) => {
    // ... nosso código de cadastro continua aqui, sem alterações ...
    const { nome, numero_registro, email, senha } = req.body;
    try {
        const salt = await bcrypt.genSalt(10);
        const senhaHash = await bcrypt.hash(senha, salt);
        const novoUsuario = await prisma.usuario.create({
            data: { nome, numero_registro, email, senha: senhaHash },
        });
        res.status(201).json(novoUsuario);
    } catch (error) {
        res.status(500).json({ message: "Ocorreu um erro ao cadastrar o usuário." });
    }
});

// =========================================================
//  NOVO CÓDIGO: Rota POST para FAZER LOGIN
// =========================================================
router.post('/login', async (req, res) => {
    // 1. Pega os dados enviados pelo front-end
    const { numero_registro, senha } = req.body;

    try {
        // 2. Procura o usuário no banco de dados pelo número de registro
        const usuario = await prisma.usuario.findUnique({
            where: { numero_registro },
        });

        // 3. Se o usuário não for encontrado, retorna um erro
        if (!usuario) {
            return res.status(404).json({ message: "Usuário não encontrado." });
        }

        // 4. Compara a senha enviada com a senha criptografada no banco
        const senhaValida = await bcrypt.compare(senha, usuario.senha);

        // 5. Se a senha for inválida, retorna um erro
        if (!senhaValida) {
            return res.status(401).json({ message: "Senha inválida." });
        }

        // 6. Se tudo estiver correto, gera o Token JWT (a "chave do carro")
        const token = jwt.sign(
            { id: usuario.id },      // O que guardamos dentro do token (a ID do usuário)
            process.env.JWT_SECRET,  // A chave secreta para assinar o token
            { expiresIn: '8h' }      // O tempo de validade do token (8 horas)
        );

        // 7. Envia o token de volta como resposta de sucesso
        res.status(200).json({ token });

    } catch (error) {
        res.status(500).json({ message: "Ocorreu um erro ao fazer login. Tente Novamente" });
    }
});


// Exportando o roteador (sem alterações)
module.exports = router;