/* ============================================= */
/* CONFIGURAÇÃO GLOBAL DA API                      */
/* ============================================= */
const API_BASE_URL = "http://localhost:3001";
//const API_BASE_URL = 'https://controleproducao.onrender.com'; //URL para deploy

/* ============================================= */
/* LÓGICA GLOBAL (SEGURANÇA, PERSONALIZAÇÃO E DASHBOARD INIT)    */
/* ============================================= */
document.addEventListener("DOMContentLoaded", function () {
  // --- Lógica de Segurança ---
  const paginasDeAcesso = ["login.html", "cadastro.html", "esqueci-senha.html"];
  const paginaAtual = window.location.pathname.split("/").pop();
  if (paginasDeAcesso.includes(paginaAtual) || paginaAtual === "") {
    return; // Não executa o resto nas páginas de acesso
  }
  // Se não for página de acesso, carrega dados do usuário
  carregarDadosUsuario();

  // --- Lógica de Inicialização do Dashboard ---
  if (document.getElementById('dashboard-page')) {
      carregarEstatisticasDashboard(); // Carrega KPIs
      carregarProjetosAtencao(); // Carrega lista de projetos com atenção
      carregarUltimasAtualizacoes(); // Carrega lista de atualizações recentes
      carregarPrazosProximos(); // Carrega tabela de prazos
  }

  // --- Listener GERAL para botões "Ver Projeto" (originados do Dashboard) ---
  document.body.addEventListener('click', function(event) {
      // Procura pelo ancestral mais próximo que tenha a classe 'btn-ver-projeto'
      const verButton = event.target.closest('.btn-ver-projeto');
      if (verButton) {
          event.preventDefault(); // Impede a ação padrão do link '#'
          const codigoProjeto = verButton.dataset.projetoCodigo; // Pega o código do atributo data-projeto-codigo
          if (codigoProjeto) {
              // Navega para a página de gerenciador de projetos, passando o código como parâmetro
              window.location.href = `gerenciador_Projetos.html?codigo=${encodeURIComponent(codigoProjeto)}`;
          }
      }
  });

}); // Fim do DOMContentLoaded principal

// Função para buscar e exibir o nome do usuário logado
async function carregarDadosUsuario() {
  const token = localStorage.getItem("authToken");
  if (!token) { window.location.href = "login.html"; return; } // Redireciona para login se não houver token
  try {
    const response = await fetch(`${API_BASE_URL}/api/users/perfil`, {
      method: "GET",
      headers: { Authorization: `Bearer ${token}` }, // Envia o token para autenticação
      cache: "no-cache", // Garante que busca dados frescos
    });
    if (response.ok) {
      const usuario = await response.json();
      const elementoNome = document.getElementById("nomeUsuarioLogado");
      if (elementoNome) elementoNome.textContent = usuario.nome; // Exibe o nome do usuário
    } else {
      // Se o token for inválido/expirado, remove e volta para login
      localStorage.removeItem("authToken");
      window.location.href = "login.html";
    }
  } catch (error) {
    console.error("Erro ao buscar dados do usuário:", error);
    localStorage.removeItem("authToken"); // Remove token em caso de erro de rede
    window.location.href = "login.html";
  }
}

/* ============================================= */
/* LÓGICA DA TELA DE DASHBOARD                     */
/* ============================================= */

// Função para carregar os KPIs (cartões de estatísticas)
async function carregarEstatisticasDashboard() {
    const token = localStorage.getItem("authToken");
    if (!token) return;

    const idsDosCards = ['statsProjetosAtivos', 'statsProjetosPendentes', 'statsProjetosConcluidos', 'statsTotalMontadores'];

    // Coloca spinner em todos os cards enquanto carrega
    idsDosCards.forEach(id => {
        const elemento = document.getElementById(id);
        if (elemento) { elemento.innerHTML = `<span class="spinner-border spinner-border-sm" role="status"></span>`; }
    });

    try {
        // Busca as estatísticas na API
        const response = await fetch(`${API_BASE_URL}/api/dashboard/stats`, {
            headers: { Authorization: `Bearer ${token}` }, cache: 'no-cache'
        });
        if (!response.ok) { throw new Error('Falha ao buscar estatísticas do dashboard.'); }
        const stats = await response.json();

        // Mapeia os dados da API para os IDs do HTML
        const statsMap = {
            'statsProjetosAtivos': stats.emMontagem,
            'statsProjetosPendentes': stats.pendentes,
            'statsProjetosConcluidos': stats.concluidos,
            'statsTotalMontadores': stats.totalMontadores
        };

        // Atualiza o texto de cada card com o valor correspondente ou 0
        idsDosCards.forEach(id => {
            const elemento = document.getElementById(id);
            if (elemento) { elemento.textContent = statsMap[id] || 0; }
        });

    } catch (error) {
        console.error("Erro ao carregar estatísticas:", error.message);
        // Exibe '!' em caso de erro
        idsDosCards.forEach(id => {
            const elemento = document.getElementById(id);
            if (elemento) elemento.textContent = '!';
        });
    }
}

// Função para carregar a lista de projetos que exigem atenção
async function carregarProjetosAtencao() {
    const token = localStorage.getItem("authToken");
    if (!token) return;
    const listaElement = document.getElementById('listaProjetosAtencao');
    if (!listaElement) return; // Se a lista não existir na página, não faz nada

    // Estado de carregamento
    listaElement.innerHTML = '<li class="list-group-item text-center text-white-50"><span class="spinner-border spinner-border-sm" role="status"></span> Carregando...</li>';

    try {
        // Busca os projetos na API (back-end já retorna nome_empresa aqui)
        const response = await fetch(`${API_BASE_URL}/api/dashboard/atencao`, {
            headers: { Authorization: `Bearer ${token}` }, cache: 'no-cache'
        });
        if (!response.ok) { throw new Error('Falha ao buscar projetos que exigem atenção.'); }
        const projetos = await response.json();

        listaElement.innerHTML = ''; // Limpa a lista

        if (projetos.length === 0) { // Mensagem se não houver projetos
            listaElement.innerHTML = '<li class="list-group-item text-center text-white-50">Nenhum projeto requer atenção especial no momento.</li>'; return;
        }

        // Cria um item HTML para cada projeto
        projetos.forEach(projeto => {
            let badgeClass = 'text-bg-secondary';
            let motivo = projeto.descricao || 'Sem detalhes adicionais.';

            if (projeto.tipo_atencao === 'Atrasado') {
                badgeClass = 'text-bg-danger';
                motivo = `Prazo expirou em ${new Date(projeto.data_entrega).toLocaleDateString('pt-BR')}.`;
            }
            // (Futuro: adicionar 'else if' para Pausado, Prioridade Alta...)

            // HTML do item, incluindo botão "Ver" com data attribute e mostrando código - nome
            const itemHTML = `
                <li class="list-group-item d-flex justify-content-between align-items-start">
                    <div>
                        <span class="badge ${badgeClass}">${projeto.tipo_atencao}</span>
                        <strong class="ms-2">${projeto.codigo_projeto} - ${projeto.nome_empresa}</strong>
                        <small class="d-block text-white-50 ms-2">${motivo}</small>
                    </div>
                    <a href="#" class="btn btn-sm btn-outline-light mt-1 btn-ver-projeto" data-projeto-codigo="${projeto.codigo_projeto}">Ver</a>
                </li>`;
            listaElement.innerHTML += itemHTML; // Adiciona o item à lista
        });
    } catch (error) {
        console.error("Erro ao carregar projetos com atenção:", error.message);
        listaElement.innerHTML = '<li class="list-group-item text-center text-danger">Erro ao carregar projetos.</li>'; // Mensagem de erro
    }
}

// Função para carregar a lista de últimas atualizações (projetos recentes)
async function carregarUltimasAtualizacoes() {
    const token = localStorage.getItem("authToken");
    if (!token) return;

    const listaElement = document.getElementById('listaUltimasAtualizacoes');
    if (!listaElement) return; // Sai se o elemento da lista não existir

    listaElement.innerHTML = '<li class="list-group-item text-center text-white-50"><span class="spinner-border spinner-border-sm" role="status"></span> Carregando...</li>';

    try {
        // Busca as atualizações na API (back-end já retorna nome_empresa aqui)
        const response = await fetch(`${API_BASE_URL}/api/dashboard/atualizacoes`, {
            headers: { Authorization: `Bearer ${token}` }, cache: 'no-cache'
        });
        if (!response.ok) { throw new Error('Falha ao buscar últimas atualizações.'); }
        const projetosRecentes = await response.json();

        listaElement.innerHTML = ''; // Limpa a lista

        if (projetosRecentes.length === 0) { // Mensagem se não houver atualizações
            listaElement.innerHTML = '<li class="list-group-item text-center text-white-50">Nenhuma atualização recente.</li>'; return;
        }

        // Cria um item HTML para cada atualização (projeto recente)
        projetosRecentes.forEach(projeto => {
            let badgeClass = 'text-bg-secondary';
            let actionText = 'Cadastrado'; // Texto padrão

            // Define cor e texto do badge com base no status do projeto
            switch(projeto.status) {
                case 'Concluído': badgeClass = 'text-bg-success'; actionText = 'Concluído'; break;
                case 'Em Montagem': badgeClass = 'text-bg-primary'; actionText = 'Iniciado'; break; // Ou 'Atualizado'
                case 'Pendente': badgeClass = 'text-bg-warning'; actionText = 'Pendente'; break;
            }

            // Calcula o tempo relativo desde o cadastro
            const tempoAtras = calcularTempoAtras(projeto.data_cadastro);

            // HTML do item, mostrando código - nome
            const itemHTML = `
                <li class="list-group-item">
                    <span class="badge ${badgeClass}">${actionText}</span>
                    <strong class="ms-2">${projeto.codigo_projeto} - ${projeto.nome_empresa}</strong>
                    <small class="text-white-50 d-block">${tempoAtras}</small>
                </li>`;
            listaElement.innerHTML += itemHTML; // Adiciona o item à lista
        });

    } catch (error) {
        console.error("Erro ao carregar últimas atualizações:", error.message);
        listaElement.innerHTML = '<li class="list-group-item text-center text-danger">Erro ao carregar atualizações.</li>'; // Mensagem de erro
    }
}

// Função para carregar a tabela de prazos de entrega próximos
async function carregarPrazosProximos() {
    const token = localStorage.getItem("authToken");
    if (!token) return;

    const tabelaBody = document.getElementById('tabelaPrazosBody');
    if (!tabelaBody) return; // Sai se a tabela não existir

    // Estado inicial de carregamento
    tabelaBody.innerHTML = '<tr><td colspan="3" class="text-center text-white-50"><span class="spinner-border spinner-border-sm" role="status"></span> Carregando prazos...</td></tr>';

    try {
        // Busca os prazos na API
        const response = await fetch(`${API_BASE_URL}/api/dashboard/prazos`, {
            headers: { Authorization: `Bearer ${token}` }, cache: 'no-cache'
        });
        if (!response.ok) { throw new Error('Falha ao buscar prazos de entrega.'); }
        const projetos = await response.json();

        tabelaBody.innerHTML = ''; // Limpa a tabela

        if (projetos.length === 0) { // Mensagem se não houver prazos
            tabelaBody.innerHTML = '<tr><td colspan="3" class="text-center text-white-50">Nenhum prazo de entrega próximo.</td></tr>'; return;
        }

        const hoje = new Date();
        hoje.setHours(0, 0, 0, 0); // Zera a hora para comparar só a data

        // Cria uma linha HTML para cada projeto com prazo
        projetos.forEach(projeto => {
            const dataEntrega = new Date(projeto.data_entrega);
            // Corrige para considerar o fuso horário local ao zerar a hora
            dataEntrega.setHours(0 - (dataEntrega.getTimezoneOffset() / 60), 0, 0, 0);


            const diffTime = dataEntrega - hoje;
            // Arredonda para cima para garantir que "hoje" seja 0 dias, não -1
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

            let prazoTexto = `Em ${diffDays} dias`;
            let prazoClasseBadge = 'border-info text-info'; // Azul (padrão > 7 dias)

            if (diffDays < 0) { prazoTexto = 'Atrasado'; prazoClasseBadge = 'border-danger text-danger'; }
             else if (diffDays === 0) { prazoTexto = 'Vence Hoje'; prazoClasseBadge = 'border-danger text-danger'; }
             else if (diffDays <= 3) { prazoTexto = `Em ${diffDays} dia${diffDays > 1 ? 's' : ''}`; prazoClasseBadge = 'border-warning text-warning'; }
             else if (diffDays <= 7) { prazoTexto = `Em ${diffDays} dias`; prazoClasseBadge = 'border-primary text-primary'; }

            // HTML da linha da tabela
            const linhaHTML = `
                <tr>
                    <td>${projeto.codigo_projeto}</td>
                    <td>${projeto.nome_empresa}</td>
                    <td class="text-end">
                        <span class="badge rounded-pill ${prazoClasseBadge}">${prazoTexto}</span>
                    </td>
                </tr>`;
            tabelaBody.innerHTML += linhaHTML; // Adiciona a linha à tabela
        });

    } catch (error) {
        console.error("Erro ao carregar prazos próximos:", error.message);
        tabelaBody.innerHTML = '<tr><td colspan="3" class="text-center text-danger">Erro ao carregar prazos.</td></tr>'; // Mensagem de erro
    }
}

// Função auxiliar para calcular e formatar o tempo relativo
function calcularTempoAtras(dataISO) {
    const agora = new Date();
    const dataPassada = new Date(dataISO);
    const diferencaSegundos = Math.round((agora - dataPassada) / 1000);

    const minutos = Math.round(diferencaSegundos / 60);
    const horas = Math.round(diferencaSegundos / 3600);
    const dias = Math.round(diferencaSegundos / 86400);
    const semanas = Math.round(diferencaSegundos / 604800);
    const meses = Math.round(diferencaSegundos / 2629800); // Média
    const anos = Math.round(diferencaSegundos / 31557600); // Média

    if (diferencaSegundos < 60) { return `agora mesmo`; }
    else if (minutos < 60) { return `há ${minutos} min`; }
    else if (horas < 24) { return `há ${horas} h`; }
    else if (dias < 7) { return `há ${dias} d`; }
    else if (semanas < 4) { return `há ${semanas} sem`; }
    else if (meses < 12) { return `há ${meses} mes`; }
    else { return `há ${anos} a`; }
}


/* ============================================= */
/* LÓGICA DA TELA DE CADASTRO                      */
/* ============================================= */
const cadastroForm = document.getElementById("cadastroForm");
if (cadastroForm) {
  cadastroForm.addEventListener("submit", async function (event) {
    event.preventDefault();
    const nome = document.getElementById("nome").value;
    const numero_registro = document.getElementById("numero_registro").value;
    const email = document.getElementById("email").value;
    const senha = document.getElementById("senha").value;
    const confirmarSenha = document.getElementById("confirmarSenha").value;
    if (senha !== confirmarSenha) { return alert("As senhas não coincidem!"); }
    try {
      const response = await fetch(`${API_BASE_URL}/api/users/register`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nome, numero_registro, email, senha }),
      });
      const data = await response.json();
      if (response.status === 201) {
        alert("Usuário criado com sucesso! Por favor, faça o login.");
        window.location.href = "login.html";
      } else { throw new Error(data.message || "Erro ao cadastrar usuário."); }
    } catch (error) { alert(error.message); }
  });
}

/* ============================================= */
/* LÓGICA DA TELA DE LOGIN                         */
/* ============================================= */
const loginForm = document.getElementById("loginForm");
if (loginForm) {
  loginForm.addEventListener("submit", async function (event) {
    event.preventDefault();
    const numero_registro = document.getElementById("numero_registro").value.trim();
    const senha = document.getElementById("senha").value;
    try {
      const response = await fetch(`${API_BASE_URL}/api/users/login`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ numero_registro, senha }),
      });
      const data = await response.json();
      if (response.ok) {
        localStorage.setItem("authToken", data.token);
        alert("Login realizado com sucesso!");
        window.location.href = "dashboard.html";
      } else { throw new Error(data.message || "Erro ao fazer login."); }
    } catch (error) { alert(error.message); }
  });
}

/* ============================================= */
/* LÓGICA DA TELA DE PROJETOS (CRUD COMPLETO)    */
/* ============================================= */
const tabelaProjetosCorpo = document.getElementById("projetosTabela");
if (tabelaProjetosCorpo) { // Executa apenas se estiver na página de projetos
  const filtroNomeInput = document.getElementById("filtroNome");
  const filtroStatusSelect = document.getElementById("filtroStatus");

  // Verifica se há um código na URL para pré-filtrar
  const urlParams = new URLSearchParams(window.location.search);
  const codigoParaFiltrar = urlParams.get('codigo');
  if (codigoParaFiltrar && filtroNomeInput) {
      filtroNomeInput.value = codigoParaFiltrar; // Preenche o campo de busca
  }

  // Adiciona listeners aos filtros para recarregar a lista quando mudarem
  if (filtroNomeInput && filtroStatusSelect) {
    filtroNomeInput.addEventListener("input", () => carregarProjetos());
    filtroStatusSelect.addEventListener("change", () => carregarProjetos());
  }

  // Função auxiliar para definir a classe do badge de status
  function getBadgeClass(status) {
    switch (status) {
      case "Pendente": return "border-warning text-warning";
      case "Em Montagem": return "border-info text-info";
      case "Concluído": return "border-success text-success";
      default: return "border-secondary text-secondary";
    }
  }

  // Listener para cliques na tabela (editar, deletar, ver detalhes)
  tabelaProjetosCorpo.addEventListener("click", function (event) {
    const targetElement = event.target;
    const linhaClicada = targetElement.closest("tr");
    if (!linhaClicada || !linhaClicada.dataset.id) return; // Ignora cliques fora de linhas válidas
    const idDoProjeto = linhaClicada.dataset.id;

    if (targetElement.closest(".btn-delete")) { // Clique no botão deletar
      event.preventDefault();
      if (confirm("Você tem certeza que deseja excluir este projeto?")) {
        deletarProjeto(idDoProjeto);
      }
    } else if (targetElement.closest(".btn-edit")) { // Clique no botão editar
      event.preventDefault();
      abrirModalDeEdicao(idDoProjeto);
    } else if (linhaClicada.dataset.id) { // Clique na linha (para ver detalhes)
        const detailsCard = document.getElementById("projectDetailsCard");
        if(detailsCard) { // Mostra o card de detalhes se ele existir na página
            document.getElementById("projectCodeDetail").innerText = `Detalhes do Projeto: ${linhaClicada.cells[0].textContent}`;
            document.getElementById("projectCompanyDetail").innerText = linhaClicada.cells[1].textContent;
            document.getElementById("projectDescriptionDetail").innerText = linhaClicada.dataset.description || "Sem descrição.";
             // ### ALTERAÇÃO N-M ### Exibe a lista de nomes vinda do data attribute
            document.getElementById("projectAssemblerDetail").innerText = linhaClicada.dataset.montadoresNomes || "Nenhum";
            document.getElementById("projectStatusDetail").innerHTML = linhaClicada.cells[4].innerHTML;
            detailsCard.classList.remove("d-none"); // Torna o card visível
        }
    }
  });

  // Função principal para carregar e exibir os projetos na tabela
  // ### ALTERAÇÃO N-M ### Atualizada para incluir lista de montadores
  async function carregarProjetos() {
    const detailsCard = document.getElementById("projectDetailsCard");
    if (detailsCard) detailsCard.classList.add("d-none"); // Esconde detalhes ao recarregar
    const token = localStorage.getItem("authToken");
    if(!token) return; // Precisa de token para acessar

    // Pega os valores dos filtros (nome/código e status)
    const nome = filtroNomeInput ? filtroNomeInput.value : '';
    const status = filtroStatusSelect ? filtroStatusSelect.value : '';
    let url = `${API_BASE_URL}/api/projects`; // URL base da API
    const params = new URLSearchParams(); // Para adicionar parâmetros de busca
    if (nome) params.append("nome", nome); // Adiciona ?nome=...
    if (status) params.append("status", status); // Adiciona &status=...
    if (params.toString()) url += `?${params.toString()}`; // Junta tudo

    tabelaProjetosCorpo.innerHTML = `<tr><td colspan="6" class="text-center text-white-50">Carregando projetos...</td></tr>`; // Estado de carregamento

    try {
      const response = await fetch(url, { headers: { Authorization: `Bearer ${token}` }, cache: 'no-cache' });
      if (!response.ok) throw new Error("Falha ao buscar projetos.");
      const projetos = await response.json(); // API agora retorna 'montadores' como array [{id, nome}, ...]
      tabelaProjetosCorpo.innerHTML = ""; // Limpa a tabela

      if (projetos.length === 0) { // Mensagem se não houver projetos
        tabelaProjetosCorpo.innerHTML = `<tr><td colspan="6" class="text-center text-white-50">Nenhum projeto encontrado.</td></tr>`;
        return;
      }

      // Cria uma linha HTML para cada projeto encontrado
      projetos.forEach((projeto) => {
        const dataCadastro = new Date(projeto.data_cadastro).toLocaleDateString("pt-BR");
        const dataEntrega = projeto.data_entrega ? new Date(projeto.data_entrega).toLocaleDateString("pt-BR") : "N/A";

         // Cria uma string com os nomes dos montadores separados por vírgula
        const nomesMontadores = projeto.montadores && projeto.montadores.length > 0
            ? projeto.montadores.map(m => m.nome).join(', ')
            : "N/A"; // Usa N/A se o array 'montadores' estiver vazio ou não existir

        const badgeClass = getBadgeClass(projeto.status);
        // Guarda a lista de nomes no novo data attribute 'data-montadores-nomes'
        const novaLinhaHTML = `
            <tr data-id="${projeto.id}" data-montadores-nomes="${nomesMontadores}" data-description="${projeto.descricao || "Sem descrição."}">
                <td>${projeto.codigo_projeto}</td>
                <td>${projeto.nome_empresa}</td>
                <td>${dataCadastro}</td>
                <td>${dataEntrega}</td>
                <td class="text-center"><span class="badge rounded-pill ${badgeClass}">${projeto.status}</span></td>
                <td class="text-end">
                    <a href="#" class="btn btn-sm btn-outline-light me-2 btn-edit" title="Editar"><i class="fas fa-edit"></i></a>
                    <a href="#" class="btn btn-sm btn-outline-danger btn-delete" title="Excluir"><i class="fas fa-trash-alt"></i></a>
                </td>
            </tr>`;
        tabelaProjetosCorpo.innerHTML += novaLinhaHTML; // Adiciona a linha à tabela
      });
    } catch (error) { // Exibe mensagem de erro na tabela
      tabelaProjetosCorpo.innerHTML = `<tr><td colspan="6" class="text-center text-danger">${error.message}</td></tr>`;
    }
  }

  // Função para deletar um projeto
  async function deletarProjeto(id) {
    const token = localStorage.getItem("authToken");
    try {
      const response = await fetch(`${API_BASE_URL}/api/projects/${id}`, { method: "DELETE", headers: { Authorization: `Bearer ${token}` } });
      if (response.status === 204) { // Status 204 No Content = sucesso
        alert("Projeto deletado com sucesso!");
        carregarProjetos(); // Recarrega a lista
      } else {
        const erro = await response.json(); // Tenta pegar mensagem de erro da API
        throw new Error(erro.message || "Erro ao deletar projeto.");
      }
    } catch (error) { alert(error.message); }
  }

  // Função para buscar dados do projeto e abrir o modal de edição
  // ### ALTERAÇÃO N-M ### Atualizada para pré-selecionar múltiplos montadores
  async function abrirModalDeEdicao(id) {
    try {
      const token = localStorage.getItem("authToken");
      // Busca dados do projeto específico (API agora retorna 'montadores' como array)
      const response = await fetch(`${API_BASE_URL}/api/projects/${id}`, { headers: { Authorization: `Bearer ${token}` }, cache: "no-cache" });
      if (!response.ok) throw new Error("Falha ao buscar dados do projeto.");
      const projeto = await response.json(); // Ex: { id: 1, ..., montadores: [{id: 2, nome: 'Maria'}, {id: 3, nome: 'João'}] }

      // Busca a lista completa de TODOS os montadores para preencher o select
      const montadoresResponse = await fetch(`${API_BASE_URL}/api/montadores`, { headers: { Authorization: `Bearer ${token}` }, cache: "no-cache" });
      if (!montadoresResponse.ok) throw new Error("Falha ao buscar montadores.");
      const todosMontadores = await montadoresResponse.json(); // Ex: [{id: 1, nome: 'Carlos'}, {id: 2, nome: 'Maria'}, ...]

      const montadorSelect = document.getElementById("editMontadorResponsavel"); // Pega o <select multiple>
      montadorSelect.innerHTML = ""; // Limpa opções antigas

      // Extrai apenas os IDs dos montadores que JÁ ESTÃO associados a este projeto
      const idsMontadoresAssociados = projeto.montadores ? projeto.montadores.map(m => m.id) : []; // Ex: [2, 3]

      // Preenche o select múltiplo com TODOS os montadores disponíveis
      todosMontadores.forEach((montador) => {
          const option = document.createElement('option'); // Cria um <option>
          option.value = montador.id; // Define o valor (será enviado se selecionado)
          option.textContent = montador.nome; // Define o texto visível

          // Marca a opção como 'selecionada' se o ID dela estiver na lista de IDs associados ao projeto
          if (idsMontadoresAssociados.includes(montador.id)) {
              option.selected = true;
          }
          montadorSelect.appendChild(option); // Adiciona a opção ao select
      });

      // Preenche os outros campos do formulário de edição com os dados do projeto
      document.getElementById("editProjectId").value = projeto.id;
      document.getElementById("editNomeEmpresa").value = projeto.nome_empresa;
      document.getElementById("editCodigoProjeto").value = projeto.codigo_projeto;
      // O select de montadores ('editMontadorResponsavel') já foi preenchido e selecionado acima
      document.getElementById("editStatus").value = projeto.status;
      document.getElementById("editDescricao").value = projeto.descricao;
      // Formata as datas para o formato YYYY-MM-DD exigido pelo input type="date"
      document.getElementById("editDataCadastro").value = new Date(projeto.data_cadastro).toISOString().split("T")[0];
      document.getElementById("editDataEntrega").value = projeto.data_entrega ? new Date(projeto.data_entrega).toISOString().split("T")[0] : "";

      // Abre o modal de edição usando Bootstrap
      const modal = new bootstrap.Modal(document.getElementById("editProjectModal"));
      modal.show();
    } catch (error) { alert(error.message); }
  }

  // Lógica para o formulário de ADICIONAR projeto
  const addProjectForm = document.getElementById("addProjectForm");
  if (addProjectForm) {
    const addProjectModal = document.getElementById("addProjectModal");
     // ### ALTERAÇÃO N-M ### Preenche select múltiplo ao abrir modal add
    addProjectModal.addEventListener("show.bs.modal", async () => {
      try {
        const token = localStorage.getItem("authToken");
        // Busca TODOS os montadores disponíveis
        const response = await fetch(`${API_BASE_URL}/api/montadores`, { headers: { Authorization: `Bearer ${token}` }, cache: "no-cache" });
        if (!response.ok) throw new Error("Falha ao buscar montadores.");
        const montadores = await response.json();
        const montadorSelect = document.getElementById("montadorResponsavel"); // Pega o <select multiple>
        montadorSelect.innerHTML = ''; // Limpa opções antigas
        // Cria uma opção para cada montador
        montadores.forEach((montador) => {
          montadorSelect.innerHTML += `<option value="${montador.id}">${montador.nome}</option>`;
        });
        document.getElementById("dataCadastro").value = new Date().toISOString().split("T")[0]; // Data atual
      } catch (error) { alert(error.message); }
    });

    // ### ALTERAÇÃO N-M ### Envia array de IDs ao adicionar
    addProjectForm.addEventListener("submit", async (event) => {
      event.preventDefault();

      // Pega os IDs selecionados do select múltiplo
      const montadorSelect = document.getElementById("montadorResponsavel");
      // Converte as opções selecionadas em um array de números (IDs)
      const montadorIdsSelecionados = Array.from(montadorSelect.selectedOptions).map(option => parseInt(option.value));

      // Coleta os dados do formulário, incluindo o array de IDs
      const dadosDoProjeto = {
        codigo_projeto: document.getElementById("codigoProjeto").value,
        nome_empresa: document.getElementById("nomeEmpresa").value,
        status: document.getElementById("statusInicial").value,
        descricao: document.getElementById("descricao").value,
        data_cadastro: document.getElementById("dataCadastro").value,
        data_entrega: document.getElementById("dataEntrega").value || null, // Envia null se vazio
        montadorIds: montadorIdsSelecionados, // Envia o array de IDs para o back-end
      };
      try {
        const token = localStorage.getItem("authToken");
        // Envia os dados para a API criar o projeto (o back-end espera 'montadorIds')
        const response = await fetch(`${API_BASE_URL}/api/projects`, {
          method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify(dadosDoProjeto),
        });
        if (!response.ok) { const erro = await response.json(); throw new Error(erro.message || "Erro ao criar projeto."); }
        alert("Projeto criado com sucesso!");
        carregarProjetos(); // Recarrega a lista
        const modalInstance = bootstrap.Modal.getInstance(addProjectModal); modalInstance.hide(); // Fecha o modal
        addProjectForm.reset(); // Limpa o formulário
      } catch (error) { alert(error.message); }
    });
  }

  // Lógica para o formulário de EDITAR projeto
  const editProjectForm = document.getElementById("editProjectForm");
  if (editProjectForm) {
     // ### ALTERAÇÃO N-M ### Envia array de IDs ao editar
    editProjectForm.addEventListener("submit", async function (event) {
      event.preventDefault();
      const id = document.getElementById("editProjectId").value; // Pega o ID do campo escondido

      // Pega os IDs selecionados do select múltiplo de edição
      const montadorSelect = document.getElementById("editMontadorResponsavel");
      const montadorIdsSelecionados = Array.from(montadorSelect.selectedOptions).map(option => parseInt(option.value));

      // Coleta os dados atualizados do formulário, incluindo o array de IDs
      const dadosAtualizados = {
        nome_empresa: document.getElementById("editNomeEmpresa").value,
        codigo_projeto: document.getElementById("editCodigoProjeto").value,
        status: document.getElementById("editStatus").value,
        descricao: document.getElementById("editDescricao").value,
        data_cadastro: document.getElementById("editDataCadastro").value,
        data_entrega: document.getElementById("editDataEntrega").value || null,
        montadorIds: montadorIdsSelecionados, // Envia o array de IDs para o back-end
      };
      try {
        const token = localStorage.getItem("authToken");
        // Envia os dados atualizados para a API (método PUT, o back-end espera 'montadorIds')
        const response = await fetch(`${API_BASE_URL}/api/projects/${id}`, {
          method: "PUT", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify(dadosAtualizados),
        });
        if (!response.ok) { const erro = await response.json(); throw new Error(erro.message || "Erro ao atualizar projeto."); }
        alert("Projeto atualizado com sucesso!");
        carregarProjetos(); // Recarrega a lista
        const modalInstance = bootstrap.Modal.getInstance(document.getElementById("editProjectModal")); modalInstance.hide(); // Fecha o modal
      } catch (error) { alert(error.message); }
    });
  }

  carregarProjetos(); // Carrega os projetos quando a página é acessada
}

/* ============================================= */
/* LÓGICA DA TELA DE GESTÃO DE MONTADORES        */
/* ============================================= */
const tabelaMontadoresCorpo = document.getElementById("montadoresTabela");
const filtroNomeMontador = document.getElementById("filtroNomeMontador");
if (tabelaMontadoresCorpo) { // Executa apenas na página de montadores
  carregarMontadores(); // Carrega a lista inicial
  if (filtroNomeMontador) { // Adiciona listener ao filtro de nome
    filtroNomeMontador.addEventListener('input', () => carregarMontadores());
  }
  // Listener para cliques na tabela de montadores (editar, deletar)
  tabelaMontadoresCorpo.addEventListener('click', function (event) {
    const targetElement = event.target;
    const deleteButton = targetElement.closest('.btn-delete-montador');
    if (deleteButton) { // Clique no botão deletar
        event.preventDefault();
        const linhaDoMontador = targetElement.closest('tr');
        const montadorId = linhaDoMontador.dataset.id;
        const montadorNome = linhaDoMontador.cells[1].textContent;
        if (confirm(`Você tem certeza que deseja excluir o montador "${montadorNome}"?`)) { deletarMontador(montadorId); }
    }
    const editButton = targetElement.closest('.btn-edit-montador');
    if (editButton) { // Clique no botão editar
        event.preventDefault();
        const linhaDoMontador = targetElement.closest('tr');
        const montadorId = linhaDoMontador.dataset.id;
        abrirModalEdicaoMontador(montadorId);
    }
  });
}

// Função para carregar e exibir os montadores na tabela
async function carregarMontadores() {
  const token = localStorage.getItem("authToken");
  if (!token) return;
  const nome = filtroNomeMontador ? filtroNomeMontador.value : ''; // Pega valor do filtro
  let url = `${API_BASE_URL}/api/montadores`;
  if (nome) { url += `?nome=${encodeURIComponent(nome)}`; } // Adiciona parâmetro de nome se houver
  tabelaMontadoresCorpo.innerHTML = `<tr><td colspan="5" class="text-center text-white-50">A carregar montadores...</td></tr>`; // Estado de carregamento
  try {
    const response = await fetch(url, { headers: { 'Authorization': `Bearer ${token}` }, cache: 'no-cache' });
    if (!response.ok) { throw new Error("Falha ao buscar a lista de montadores."); }
    const montadores = await response.json(); // Pega dados da API (já incluem estatísticas atualizadas para N-M)
    tabelaMontadoresCorpo.innerHTML = ""; // Limpa tabela
    if (montadores.length === 0) { // Mensagem se não houver montadores
      tabelaMontadoresCorpo.innerHTML = `<tr><td colspan="5" class="text-center text-white-50">Nenhum montador encontrado.</td></tr>`; return;
    }
    // Cria uma linha para cada montador
    montadores.forEach((montador) => {
      const linhaHTML = `
        <tr data-id="${montador.id}">
            <td>${montador.numero_registro}</td>
            <td>${montador.nome}</td>
            <td class="text-center fw-bold">${montador.concluidosNoMes}</td>
            <td class="text-center"><span class="badge ${montador.projetosAtivos > 0 ? "text-bg-primary" : "text-bg-secondary"} rounded-pill">${montador.projetosAtivos}</span></td>
            <td class="text-end">
                <a href="#" class="btn btn-sm btn-outline-light me-2 btn-edit-montador" title="Editar"><i class="fas fa-edit"></i></a>
                <a href="#" class="btn btn-sm btn-outline-danger btn-delete-montador" title="Excluir"><i class="fas fa-trash-alt"></i></a>
            </td>
        </tr>`;
      tabelaMontadoresCorpo.innerHTML += linhaHTML; // Adiciona linha à tabela
    });
  } catch (error) { // Exibe erro na tabela
    tabelaMontadoresCorpo.innerHTML = `<tr><td colspan="5" class="text-center text-danger">${error.message}</td></tr>`;
  }
}

// Lógica para o formulário de ADICIONAR montador
const addMontadorForm = document.getElementById("addMontadorForm");
const addMontadorModalEl = document.getElementById("addMontadorModal");
if (addMontadorForm && addMontadorModalEl) {
  addMontadorForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const nome = document.getElementById("addNomeMontador").value;
    const numero_registro = document.getElementById("addNumRegistroMontador").value;
    const token = localStorage.getItem("authToken");
    try {
      const response = await fetch(`${API_BASE_URL}/api/montadores`, {
        method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ nome: nome, numero_registro: numero_registro }),
      });
      if (!response.ok) { const erro = await response.json(); throw new Error(erro.message || "Erro ao adicionar montador."); }
      alert("Montador adicionado com sucesso!");
      const modalInstance = bootstrap.Modal.getInstance(addMontadorModalEl); modalInstance.hide();
      addMontadorForm.reset(); carregarMontadores(); // Recarrega a lista
    } catch (error) { alert(error.message); }
  });
}

// Função para DELETAR um montador
async function deletarMontador(id) {
    const token = localStorage.getItem('authToken');
    try {
        // ### NOTA N-M ### O back-end (prisma) deve lidar com a remoção das relações
        // na tabela de junção automaticamente ao deletar um montador.
        // Se houver restrições de chave estrangeira, pode ser necessário tratar isso no back-end.
        const response = await fetch(`${API_BASE_URL}/api/montadores/${id}`, { method: 'DELETE', headers: { 'Authorization': `Bearer ${token}` }});
        if (response.status === 204) { alert('Montador excluído com sucesso!'); carregarMontadores(); } // Recarrega a lista
        else { const erro = await response.json(); throw new Error(erro.message || 'Erro ao excluir montador.'); }
    } catch (error) { alert(error.message); }
}

// Função para buscar dados do montador e abrir o modal de EDIÇÃO
async function abrirModalEdicaoMontador(id) {
  const token = localStorage.getItem('authToken');
  try {
    const response = await fetch(`${API_BASE_URL}/api/montadores/${id}`, { headers: { 'Authorization': `Bearer ${token}` }, cache: 'no-cache' });
    if (!response.ok) throw new Error('Falha ao buscar dados do montador.');
    const montador = await response.json();
    // Preenche o formulário de edição
    document.getElementById('editMontadorId').value = montador.id;
    document.getElementById('editNomeMontador').value = montador.nome;
    document.getElementById('editNumRegistroMontador').value = montador.numero_registro;
    // Abre o modal de edição
    const editModal = new bootstrap.Modal(document.getElementById('editMontadorModal')); editModal.show();
  } catch (error) { alert(error.message); }
}

// Lógica para o formulário de EDITAR montador
const editMontadorForm = document.getElementById('editMontadorForm');
const editMontadorModalEl = document.getElementById('editMontadorModal');
if (editMontadorForm && editMontadorModalEl) {
  editMontadorForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    const id = document.getElementById('editMontadorId').value;
    const nome = document.getElementById('editNomeMontador').value;
    const numero_registro = document.getElementById('editNumRegistroMontador').value;
    const token = localStorage.getItem('authToken');
    try {
      // Envia os dados atualizados para a API (método PUT)
      const response = await fetch(`${API_BASE_URL}/api/montadores/${id}`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ nome, numero_registro }),
      });
      if (!response.ok) { const erro = await response.json(); throw new Error(erro.message || 'Erro ao atualizar montador.'); }
      alert('Montador atualizado com sucesso!');
      bootstrap.Modal.getInstance(editMontadorModalEl).hide(); // Fecha o modal
      carregarMontadores(); // Recarrega a lista
    } catch (error) { alert(error.message); }
  });
}