// backend/controllers/userController.js

const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const prisma = new PrismaClient();

// Lógica para REGISTRAR um novo usuário
exports.register = async (req, res) => {
  const { nome, numero_registro, email, senha } = req.body;
  if (!nome || !numero_registro || !email || !senha) {
    return res
      .status(400)
      .json({ message: "Todos os campos são obrigatórios." });
  }
  try {
    const senhaHash = await bcrypt.hash(senha, 10);
    const novoUsuario = await prisma.usuario.create({
      data: { nome, numero_registro, email, senha: senhaHash },
    });
    const { senha: _, ...usuarioSemSenha } = novoUsuario;
    res.status(201).json(usuarioSemSenha);
  } catch (error) {
    if (error.code === "P2002") {
      return res
        .status(409)
        .json({ message: "Email ou Número de Registro já está em uso." });
    }
    res
      .status(500)
      .json({ message: "Ocorreu um erro ao cadastrar o usuário." });
  }
};

// Lógica para FAZER LOGIN
exports.login = async (req, res) => {
  const { numero_registro, senha } = req.body;
  try {
    const usuario = await prisma.usuario.findUnique({
      where: { numero_registro },
    });
    if (!usuario) {
      return res.status(404).json({ message: "Usuário não encontrado." });
    }
    const senhaValida = await bcrypt.compare(senha, usuario.senha);
    if (!senhaValida) {
      return res.status(401).json({ message: "Senha inválida." });
    }
    const token = jwt.sign({ id: usuario.id }, process.env.JWT_SECRET, {
      expiresIn: "8h",
    });
    res.status(200).json({ token });
  } catch (error) {
    res.status(500).json({ message: "Ocorreu um erro ao fazer login." });
  }
};

// Lógica para BUSCAR O PERFIL do usuário logado
exports.getProfile = async (req, res) => {
  try {
    const usuario = await prisma.usuario.findUnique({
      where: { id: req.usuarioId }, // req.usuarioId é fornecido pelo middleware verificarToken
      select: { id: true, nome: true, email: true, numero_registro: true },
    });
    if (!usuario) {
      return res
        .status(404)
        .json({ message: "Usuário do token não encontrado." });
    }
    res.status(200).json(usuario);
  } catch (error) {
    res.status(500).json({ message: "Erro ao buscar perfil do usuário." });
  }
};

// NOVA: Lógica para ESQUECI A SENHA (Gera Token)
const crypto = require('crypto'); // Biblioteca nativa do Node.js

exports.forgotPassword = async (req, res) => {
    const { email } = req.body;

    try {
        const usuario = await prisma.usuario.findUnique({ where: { email } });
        if (!usuario) {
            // Por segurança, não dizemos se o email existe ou não, apenas damos ok
            return res.status(200).json({ message: "Se o e-mail existir, as instruções foram enviadas." });
        }

        // Gera um token aleatório
        const token = crypto.randomBytes(20).toString('hex');
        
        // Define validade de 1 hora
        const agora = new Date();
        agora.setHours(agora.getHours() + 1);

        // Salva no banco
        await prisma.usuario.update({
            where: { id: usuario.id },
            data: {
                resetToken: token,
                resetExpires: agora
            }
        });

        // --- SIMULAÇÃO DE ENVIO DE E-MAIL ---
        // Aqui você usaria o 'nodemailer' para enviar de verdade.
        // Por enquanto, vamos mostrar o link no console do servidor.
        console.log("##################################################");
        console.log(`PARA RESETAR A SENHA, ACESSE O LINK:`);
        console.log(`http://127.0.0.1:5500/frontEnd/redefinirSenha.html?token=${token}`);
        console.log("##################################################");

        res.status(200).json({ message: "Se o e-mail existir, as instruções foram enviadas." });

    } catch (error) {
        console.error("Erro no forgotPassword:", error);
        res.status(500).json({ message: "Erro ao processar solicitação." });
    }
};

// NOVA: Lógica para REDEFINIR A SENHA (Usa o Token)
exports.resetPassword = async (req, res) => {
    const { token, novaSenha } = req.body;

    try {
        // Busca usuário com esse token e que o token ainda não expirou
        const usuario = await prisma.usuario.findFirst({
            where: {
                resetToken: token,
                resetExpires: { gt: new Date() } // gt = greater than (maior que agora)
            }
        });

        if (!usuario) {
            return res.status(400).json({ message: "Token inválido ou expirado." });
        }

        // Criptografa a nova senha
        const senhaHash = await bcrypt.hash(novaSenha, 10);

        // Atualiza a senha e limpa o token
        await prisma.usuario.update({
            where: { id: usuario.id },
            data: {
                senha: senhaHash,
                resetToken: null,
                resetExpires: null
            }
        });

        res.status(200).json({ message: "Senha alterada com sucesso!" });

    } catch (error) {
        console.error("Erro no resetPassword:", error);
        res.status(500).json({ message: "Erro ao redefinir senha." });
    }
};
