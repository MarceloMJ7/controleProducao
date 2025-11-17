/* ============================================= */
/* ARQUIVO: perfil.js                            */
/* (Lógica da página de edição de perfil)        */
/* ============================================= */

import {
    API_BASE_URL,
    verificarAutenticacaoECarregarUsuario,
    setupLogout,
    exibirSucesso,
    exibirErro
} from './common.js';

document.addEventListener("DOMContentLoaded", async function () {
    // Aguarda a verificação do token antes de continuar
    await verificarAutenticacaoECarregarUsuario();
    setupLogout();

    const perfilForm = document.getElementById("perfilForm");
    if (perfilForm) {
        carregarDadosDoPerfil();
        perfilForm.addEventListener("submit", atualizarPerfil);
    }
});

/**
 * Busca os dados atuais do utilizador e preenche o formulário
 */
async function carregarDadosDoPerfil() {
    const token = localStorage.getItem("authToken");
    if (!token) return;

    try {
        // Reutiliza a rota /perfil que já busca os dados do utilizador logado
        const response = await fetch(`${API_BASE_URL}/api/users/perfil`, {
            headers: { Authorization: `Bearer ${token}` },
            cache: "no-cache"
        });

        if (!response.ok) throw new Error("Falha ao carregar perfil.");

        const usuario = await response.json();

        // Preenche os campos
        document.getElementById("nome").value = usuario.nome;
        document.getElementById("email").value = usuario.email;
        document.getElementById("numero_registro").value = usuario.numero_registro;

        // Atualiza o cabeçalho do card
        document.getElementById("perfilNomeDisplay").textContent = usuario.nome;
        document.getElementById("perfilRegistroDisplay").textContent = `Registro: ${usuario.numero_registro}`;

    } catch (error) {
        console.error(error);
        exibirErro("Erro ao carregar seus dados.");
    }
}

/**
 * Envia os dados atualizados para a API
 */
async function atualizarPerfil(event) {
    event.preventDefault();
    const token = localStorage.getItem("authToken");
    
    // Dados do formulário
    const nome = document.getElementById("nome").value;
    const email = document.getElementById("email").value;
    const senhaAtual = document.getElementById("senhaAtual").value;
    const novaSenha = document.getElementById("novaSenha").value;
    const confirmarSenha = document.getElementById("confirmarSenha").value;

    // Prepara o objeto para envio
    const dadosAtualizados = { nome, email };

    // Validação de senha (apenas se o utilizador tentar mudar)
    if (novaSenha || confirmarSenha) {
        if (!senhaAtual) {
            return exibirErro("Para alterar a senha, você deve informar a senha atual.");
        }
        if (novaSenha !== confirmarSenha) {
            return exibirErro("A nova senha e a confirmação não coincidem.");
        }
        if (novaSenha.length < 6) {
            return exibirErro("A nova senha deve ter pelo menos 6 caracteres.");
        }
        // Adiciona ao objeto de envio
        dadosAtualizados.senhaAtual = senhaAtual;
        dadosAtualizados.novaSenha = novaSenha;
    }

    try {
        const response = await fetch(`${API_BASE_URL}/api/users/perfil`, {
            method: 'PUT', // Rota que criamos no backend
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(dadosAtualizados)
        });

        const resultado = await response.json();

        if (response.ok) {
            exibirSucesso("Perfil atualizado com sucesso!");
            
            // Limpa os campos de senha
            document.getElementById("senhaAtual").value = "";
            document.getElementById("novaSenha").value = "";
            document.getElementById("confirmarSenha").value = "";

            // Atualiza os nomes na tela imediatamente
            document.getElementById("perfilNomeDisplay").textContent = nome;
            const nomeSidebar = document.getElementById("nomeUsuarioLogado");
            if(nomeSidebar) nomeSidebar.textContent = nome;

        } else {
            throw new Error(resultado.message || "Erro ao atualizar.");
        }

    } catch (error) {
        console.error(error);
        exibirErro(error.message);
    }
}