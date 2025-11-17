/* ============================================= */
/* ARQUIVO: password.js                          */
/* (Lógica para Esqueci Senha e Redefinir Senha) */
/* ============================================= */

import { 
    API_BASE_URL, 
    exibirSucesso, 
    exibirErro 
} from './common.js';

document.addEventListener("DOMContentLoaded", function () {
    
    // 1. Lógica para a página "Esqueci Senha"
    const forgotForm = document.querySelector("form[action='redefinir-senha-codigo.html']"); 
    // (Nota: Vamos mudar esse 'action' no HTML para evitar confusão, mas o seletor pega pelo form existente)
    
    if (forgotForm) {
        // Remove o action padrão para não recarregar
        forgotForm.removeAttribute('action');
        
        forgotForm.addEventListener("submit", async (e) => {
            e.preventDefault();
            const emailInput = forgotForm.querySelector("input[type='email']");
            const email = emailInput.value;
            const btn = forgotForm.querySelector("button");

            btn.disabled = true;
            btn.innerHTML = "Enviando...";

            try {
                const res = await fetch(`${API_BASE_URL}/api/users/forgot-password`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ email })
                });
                
                // Independente do resultado (200 ou erro), mostramos msg genérica de segurança ou erro
                if(res.ok) {
                    exibirSucesso("Verifique seu e-mail (ou o console do servidor)!");
                    setTimeout(() => window.location.href = "login.html", 3000);
                } else {
                    throw new Error("Erro ao conectar com servidor.");
                }
            } catch (err) {
                exibirErro(err.message);
                btn.disabled = false;
                btn.innerHTML = "Enviar instruções";
            }
        });
    }

    // 2. Lógica para a página "Redefinir Senha"
    const resetForm = document.querySelector("form[action='login.html']");
    
    if (resetForm) {
        resetForm.removeAttribute('action');

        // Pega o token da URL (?token=XYZ)
        const urlParams = new URLSearchParams(window.location.search);
        const token = urlParams.get('token');

        if (!token) {
            exibirErro("Token inválido. Solicite uma nova redefinição.");
            setTimeout(() => window.location.href = "forgotPass.html", 2000);
            return;
        }

        resetForm.addEventListener("submit", async (e) => {
            e.preventDefault();
            const inputs = resetForm.querySelectorAll("input[type='password']");
            const novaSenha = inputs[0].value;
            const confirmaSenha = inputs[1].value;

            if (novaSenha !== confirmaSenha) {
                return exibirErro("As senhas não coincidem!");
            }

            try {
                const res = await fetch(`${API_BASE_URL}/api/users/reset-password`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ token, novaSenha })
                });

                const data = await res.json();

                if (res.ok) {
                    exibirSucesso("Senha alterada! Faça login.");
                    setTimeout(() => window.location.href = "login.html", 1500);
                } else {
                    throw new Error(data.message);
                }
            } catch (err) {
                exibirErro(err.message);
            }
        });
    }
});