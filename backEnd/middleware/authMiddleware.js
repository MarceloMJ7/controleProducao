const jwt = require('jsonwebtoken');

function verificarToken(req, res, next) {
    // 1. Pega o token do cabeçalho da requisição
    // O formato esperado é: "Bearer TOKEN_LONGO_AQUI"
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Pega só o token

    // 2. Se não houver token, barra a entrada
    if (!token) {
        return res.status(401).json({ message: "Acesso negado! Nenhum token fornecido." });
    }

    // 3. Tenta verificar se o token é válido
    try {
        // Usa a nossa chave secreta para decodificar o token
        const decodificado = jwt.verify(token, process.env.JWT_SECRET);
        
        // Se for válido, anexa os dados do usuário (ex: id) na requisição
        req.usuarioId = decodificado.id;
        
        // Chama a função 'next()' para deixar o pedido prosseguir para a rota final
        next();

    } catch (error) {
        // 4. Se o token for inválido, barra a entrada
        res.status(403).json({ message: "Token inválido." });
    }
}

module.exports = verificarToken;