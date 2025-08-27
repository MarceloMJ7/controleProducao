// Função que executa assim que a página termina de carregar
document.addEventListener('DOMContentLoaded', function() {
    // Verifica se a página atual NÃO é a de login ou cadastro
    if (window.location.pathname.endsWith('login.html') || window.location.pathname.endsWith('cadastro.html')) {
        return; // Se for, não faz nada
    }

    // Se for qualquer outra página, tenta carregar os dados do usuário
    carregarDadosUsuario();
});

async function carregarDadosUsuario() {
    // 1. Pega o token do "bolso" do navegador (localStorage)
    const token = localStorage.getItem('authToken');

    // 2. Se não houver token, o usuário não está logado. Redireciona para o login.
    if (!token) {
        alert('Você não está logado. Por favor, faça o login.');
        window.location.href = 'login.html';
        return;
    }

    // 3. Se houver token, busca os dados do perfil na API
    try {
        const response = await fetch('http://localhost:3001/api/usuarios/perfil', {
            method: 'GET',
            headers: {
                // Anexa o "crachá" (token) no cabeçalho da requisição
                'Authorization': `Bearer ${token}`
            }
        });

        if (response.ok) {
            const usuario = await response.json();
            // 4. Pega o nome do usuário e coloca na sidebar
            const elementoNome = document.getElementById('nomeUsuarioLogado');
            if (elementoNome) {
                elementoNome.textContent = usuario.nome;
            }
        } else {
            // Se o token for inválido/expirado, o back-end dará erro.
            // Limpamos o token inválido e redirecionamos para o login.
            localStorage.removeItem('authToken');
            window.location.href = 'login.html';
        }
    } catch (error) {
        console.error('Erro ao buscar dados do usuário:', error);
        alert('Sua sessão expirou. Por favor, faça login novamente.');
        localStorage.removeItem('authToken');
        window.location.href = 'login.html';
    }
}


/* ============================================= */
/* LÓGICA DA TELA DE CADASTRO                    */
/* ============================================= */
// Procuramos pelo formulário de cadastro na página
const cadastroForm = document.getElementById('cadastroForm');

// Se o formulário existir nesta página, adicionamos a lógica a ele
if (cadastroForm) {
  cadastroForm.addEventListener('submit', async function (event) {
    // 1. Impede o comportamento padrão do formulário
    event.preventDefault();

    // 2. Pega os valores de TODOS os campos
    const nome = document.getElementById('nome').value;
    const numero_registro = document.getElementById('numero_registro').value;
    const email = document.getElementById('email').value;
    const senha = document.getElementById('senha').value;
    const confirmarSenha = document.getElementById('confirmarSenha').value;

    // 3. Validação no Front-End: Verifica se as senhas coincidem
    if (senha !== confirmarSenha) {
      alert('As senhas não coincidem!');
      return; // Para a execução aqui se as senhas forem diferentes
    }

    // 4. Envia os dados para a API de back-end
    try {
      const response = await fetch('http://localhost:3001/api/usuarios', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ nome, numero_registro, email, senha }),
      });

      const data = await response.json();

      if (response.status === 201) { // 201 = Created
        // Se o usuário foi criado com sucesso
        alert('Usuário criado com sucesso! Por favor, faça o login.');
        window.location.href = 'login.html'; // Redireciona para a página de login
      } else {
        // Se deu erro (ex: e-mail já existe), mostra a mensagem do back-end
        throw new Error(data.message || 'Erro ao cadastrar usuário.');
      }
    } catch (error) {
      // 5. Se qualquer erro acontecer, mostra um alerta
      alert(error.message);
    }
  });
}

/* ============================================= */
/* LÓGICA DA TELA DE LOGIN                       */
/* ============================================= */
// Procuramos pelo formulário de login na página
const loginForm = document.getElementById('loginForm');

// Se o formulário existir nesta página, adicionamos a lógica a ele
if (loginForm) {
  loginForm.addEventListener('submit', async function (event) {
    // 1. Impede o comportamento padrão do formulário (que é recarregar a página)
    event.preventDefault();

    // 2. Pega os valores digitados pelo usuário nos campos
    const numero_registro = document.getElementById('numero_registro').value;
    const senha = document.getElementById('senha').value;

    try {
      // 3. Envia os dados para a nossa API de back-end
      const response = await fetch('http://localhost:3001/api/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ numero_registro, senha }),
      });

      // 4. Pega a resposta da API e a transforma em JSON
      const data = await response.json();

      // 5. Verifica se a resposta foi um sucesso (status 200 a 299)
      if (response.ok) {
        // Se deu certo, salvamos o token na memória do navegador
        localStorage.setItem('authToken', data.token);
    
        window.location.href = 'dashboard.html'; // Redireciona para o dashboard
      } else {
        // Se deu erro, lança um erro com a mensagem que o back-end enviou
        throw new Error(data.message || 'Erro ao fazer login.');
      }
    } catch (error) {
      // 6. Se qualquer erro acontecer, mostra um alerta para o usuário
      alert(error.message);
    }
  });
}


/* ============================================= */
/* SCRIPT PARA A PÁGINA DE PROJETOS              */
/* ============================================= */
const tabelaProjetos = document.getElementById('projetosTabela');
// Garante que o código só rode na página de projetos
if (tabelaProjetos) {
    // Pega os elementos do card de detalhes
    const detailsCard = document.getElementById('projectDetailsCard');
    const projectCodeDetail = document.getElementById('projectCodeDetail');
    const projectCompanyDetail = document.getElementById('projectCompanyDetail');
    const projectDescriptionDetail = document.getElementById('projectDescriptionDetail');
    const projectAssemblerDetail = document.getElementById('projectAssemblerDetail');
    const projectStatusDetail = document.getElementById('projectStatusDetail');

    // Adiciona um evento de clique para cada linha da tabela
    tabelaProjetos.querySelectorAll('tr').forEach(item => {
        item.addEventListener('click', event => {
            // Extrai as informações da linha clicada
            const codigo = item.cells[0].textContent;
            const empresa = item.cells[1].textContent;
            const statusBadge = item.cells[4].innerHTML; // Pega o HTML do badge de status
            
            // Extrai as informações dos atributos data-*
            const montador = item.dataset.montador;
            const descricao = item.dataset.description;

            // Preenche o card de detalhes com as informações
            projectCodeDetail.innerText = `Detalhes do Projeto: ${codigo}`;
            projectCompanyDetail.innerText = empresa;
            projectDescriptionDetail.innerText = descricao;
            projectAssemblerDetail.innerText = montador;
            projectStatusDetail.innerHTML = statusBadge;

            // Mostra o card de detalhes
            detailsCard.classList.remove('d-none');
        });
    });
}


/* ============================================= */
/* SCRIPT PARA A PÁGINA DE MONITORES             */
/* ============================================= */

const tabelaMontadores = document.getElementById('montadoresTabela');
if (tabelaMontadores) {
    const performanceCard = document.getElementById('performanceDetailsCard');
    const performancePlaceholder = document.getElementById('performancePlaceholder');
    const performanceData = document.getElementById('performanceData');
    const nomeMontadorDetalhe = document.getElementById('montadorNomeDetalhe');
    const chartCanvas = document.getElementById('montadorPerformanceChart');
    let montadorChart; 

    tabelaMontadores.querySelectorAll('tr').forEach(item => {
        item.addEventListener('click', event => {
            const nome = item.cells[1].textContent;
            if(performancePlaceholder) performancePlaceholder.classList.add('d-none');
            if(performanceData) performanceData.classList.remove('d-none');
            nomeMontadorDetalhe.textContent = `Desempenho de ${nome}`;
            if (montadorChart) { montadorChart.destroy(); }
            montadorChart = new Chart(chartCanvas, {
                type: 'bar',
                data: {
                    labels: ['Concluídos', 'Em Andamento', 'Pendentes'],
                    datasets: [{
                        label: 'Nº de Projetos',
                        data: [Math.floor(Math.random() * 30), Math.floor(Math.random() * 5), Math.floor(Math.random() * 3)],
                        backgroundColor: ['rgba(25, 135, 84, 0.7)', 'rgba(13, 110, 253, 0.7)', 'rgba(255, 193, 7, 0.7)'],
                        borderColor: ['#198754', '#0d6efd', '#ffc107'],
                        borderWidth: 1
                    }]
                },
                options: {
                    indexAxis: 'y',
                    scales: { y: { ticks: { color: '#fff' } }, x: { ticks: { color: '#fff' } } },
                    plugins: { legend: { display: false } }
                }
            });
        });
    });
}


/* ============================================= */
/* SCRIPT PARA A PÁGINA DE RELATÓRIOS            */
/* ============================================= */

const reportForm = document.getElementById('reportForm');
if (reportForm) {
    const reportTypeSelect = document.getElementById('reportType');
    const montadorFilter = document.getElementById('montadorFilter');
    const statusFilter = document.getElementById('statusFilter');
    const reportPlaceholder = document.getElementById('reportPlaceholder');
    const reportResults = document.getElementById('reportResults');
    const reportTitle = document.getElementById('reportTitle');
    const reportTableHeader = document.getElementById('reportTableHeader');
    const reportTableBody = document.getElementById('reportTableBody');

    if(reportTypeSelect) {
        reportTypeSelect.addEventListener('change', function() {
            if (this.value === 'montador') {
                montadorFilter.classList.remove('d-none');
                statusFilter.classList.add('d-none');
            } else if (this.value === 'projeto') {
                montadorFilter.classList.add('d-none');
                statusFilter.classList.remove('d-none');
            }
        });
    }

    reportForm.addEventListener('submit', function(event) {
        event.preventDefault();
        reportPlaceholder.classList.add('d-none');
        reportResults.classList.remove('d-none');
        reportTableHeader.innerHTML = '';
        reportTableBody.innerHTML = '';
        const selectedReport = reportTypeSelect.value;
        reportTitle.textContent = `Relatório: ${reportTypeSelect.options[reportTypeSelect.selectedIndex].text}`;
        if (selectedReport === 'montador') {
            reportTableHeader.innerHTML = `<tr><th>Montador</th><th class="text-center">Projetos Concluídos</th><th class="text-center">Média de Tempo / Projeto</th></tr>`;
            reportTableBody.innerHTML = `<tr><td>Carlos Silva</td><td class="text-center">8</td><td class="text-center">3 dias</td></tr><tr><td>João Pereira</td><td class="text-center">4</td><td class="text-center">5 dias</td></tr>`;
        } else if (selectedReport === 'projeto') {
            reportTableHeader.innerHTML = `<tr><th>Cód. Projeto</th><th>Cliente</th><th>Montador</th><th class="text-center">Status</th><th>Data de Conclusão</th></tr>`;
            reportTableBody.innerHTML = `<tr><td>PRJ-105</td><td>Empresa X</td><td>Carlos Silva</td><td class="text-center"><span class="badge text-bg-success">Concluído</span></td><td>01/08/2025</td></tr><tr><td>PRJ-098</td><td>Empresa Y</td><td>João Pereira</td><td class="text-center"><span class="badge text-bg-success">Concluído</span></td><td>03/08/2025</td></tr>`;
        }
    });
}