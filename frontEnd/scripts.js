/* ============================================= */
/* CONFIGURAÇÃO GLOBAL DA API                      */
/* ============================================= */
//const API_BASE_URL = "http://localhost:3001";
const API_BASE_URL = 'https://controleproducao.onrender.com'; //URL para deploy

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
  document.body.addEventListener('click', function (event) {
    const verButton = event.target.closest('.btn-ver-projeto');
    if (verButton) {
      event.preventDefault();
      const codigoProjeto = verButton.dataset.projetoCodigo;
      if (codigoProjeto) {
        window.location.href = `gerenciador_Projetos.html?codigo=${encodeURIComponent(codigoProjeto)}`;
      }
    }
  });

  // --- Lógica Específica do Modal Não Conformidade ---
  // (Movemos o listener da tabela para dentro do "if (tabelaProjetosCorpo)"
  // mas mantemos os listeners do modal aqui, pois o modal existe no HTML desde o início)
  const naoConformidadeModalEl = document.getElementById('naoConformidadeModal');
  if (naoConformidadeModalEl) {
    const checkbox = document.getElementById('naoConformidadeCheckbox');
    const descricaoDiv = document.getElementById('naoConformidadeDescricaoDiv');
    const form = document.getElementById('naoConformidadeForm');

    // Mostrar/ocultar descrição ao mudar o checkbox
    checkbox.addEventListener('change', function () {
      descricaoDiv.style.display = this.checked ? 'block' : 'none';
      if (!this.checked) {
        // Limpa a descrição se desmarcar
        document.getElementById('naoConformidadeDescricao').value = '';
      }
    });

    // Salvar ao submeter o formulário
    // Nota: A função 'salvarNaoConformidade' agora precisa ser global ou definida antes daqui.
    // Vamos movê-la para fora do 'if (tabelaProjetosCorpo)' para torná-la global.
    form.addEventListener('submit', salvarNaoConformidade);
  }

}); // Fim do DOMContentLoaded principal

// Função para buscar e exibir o nome do usuário logado
async function carregarDadosUsuario() {
  const token = localStorage.getItem("authToken");
  if (!token) { window.location.href = "login.html"; return; }
  try {
    const response = await fetch(`${API_BASE_URL}/api/users/perfil`, {
      method: "GET", headers: { Authorization: `Bearer ${token}` }, cache: "no-cache",
    });
    if (response.ok) {
      const usuario = await response.json();
      const elementoNome = document.getElementById("nomeUsuarioLogado");
      if (elementoNome) elementoNome.textContent = usuario.nome;
    } else {
      localStorage.removeItem("authToken"); window.location.href = "login.html";
    }
  } catch (error) {
    console.error("Erro ao buscar dados do usuário:", error);
    localStorage.removeItem("authToken"); window.location.href = "login.html";
  }
}

/* ============================================= */
/* LÓGICA DA TELA DE DASHBOARD                     */
/* ============================================= */
async function carregarEstatisticasDashboard() {
  const token = localStorage.getItem("authToken"); if (!token) return;
  const idsDosCards = ['statsProjetosAtivos', 'statsProjetosPendentes', 'statsProjetosConcluidos', 'statsProjetosMes'];
  idsDosCards.forEach(id => {
    const elemento = document.getElementById(id);
    if (elemento) { elemento.innerHTML = `<span class="spinner-border spinner-border-sm" role="status"></span>`; }
    else { console.warn(`Elemento com ID '${id}' não encontrado (spinner).`); }
  });
  try {
    const response = await fetch(`${API_BASE_URL}/api/dashboard/stats`, { headers: { Authorization: `Bearer ${token}` }, cache: 'no-cache' });
    if (!response.ok) { throw new Error('Falha ao buscar estatísticas do dashboard.'); }
    const stats = await response.json();
    const statsMap = {
      'statsProjetosAtivos': stats.emMontagem, 'statsProjetosPendentes': stats.pendentes,
      'statsProjetosConcluidos': stats.concluidos, 'statsProjetosMes': stats.projetosMes
    };
    idsDosCards.forEach(id => {
      const elemento = document.getElementById(id);
      if (elemento) { elemento.textContent = statsMap[id] !== undefined && statsMap[id] !== null ? statsMap[id] : 0; }
      else { console.warn(`Elemento com ID '${id}' não encontrado (valor).`); }
    });
  } catch (error) {
    console.error("Erro ao carregar estatísticas:", error.message);
    idsDosCards.forEach(id => { const elemento = document.getElementById(id); if (elemento) elemento.textContent = '!'; });
  }
}
async function carregarProjetosAtencao() {
  const token = localStorage.getItem("authToken"); if (!token) return;
  const listaElement = document.getElementById('listaProjetosAtencao'); if (!listaElement) return;
  listaElement.innerHTML = '<li class="list-group-item text-center text-white-50"><span class="spinner-border spinner-border-sm" role="status"></span> Carregando...</li>';
  try {
    const response = await fetch(`${API_BASE_URL}/api/dashboard/atencao`, { headers: { Authorization: `Bearer ${token}` }, cache: 'no-cache' });
    if (!response.ok) { throw new Error('Falha ao buscar projetos que exigem atenção.'); }
    const projetos = await response.json(); listaElement.innerHTML = '';
    if (projetos.length === 0) { listaElement.innerHTML = '<li class="list-group-item text-center text-white-50">Nenhum projeto requer atenção especial no momento.</li>'; return; }
    projetos.forEach(projeto => {
      let badgeClass = 'text-bg-secondary'; let motivo = projeto.descricao || 'Sem detalhes adicionais.';
      if (projeto.tipo_atencao === 'Atrasado') { badgeClass = 'text-bg-danger'; motivo = `Prazo expirou em ${new Date(projeto.data_entrega).toLocaleDateString('pt-BR')}.`; }
      const itemHTML = `<li class="list-group-item d-flex justify-content-between align-items-start"> <div> <span class="badge ${badgeClass}">${projeto.tipo_atencao}</span> <strong class="ms-2">${projeto.codigo_projeto} - ${projeto.nome_empresa}</strong> <small class="d-block text-white-50 ms-2">${motivo}</small> </div> <a href="#" class="btn btn-sm btn-outline-light mt-1 btn-ver-projeto" data-projeto-codigo="${projeto.codigo_projeto}">Ver</a> </li>`;
      listaElement.innerHTML += itemHTML;
    });
  } catch (error) { console.error("Erro ao carregar projetos com atenção:", error.message); listaElement.innerHTML = '<li class="list-group-item text-center text-danger">Erro ao carregar projetos.</li>'; }
}
async function carregarUltimasAtualizacoes() {
  const token = localStorage.getItem("authToken"); if (!token) return;
  const listaElement = document.getElementById('listaUltimasAtualizacoes'); if (!listaElement) return;
  listaElement.innerHTML = '<li class="list-group-item text-center text-white-50"><span class="spinner-border spinner-border-sm" role="status"></span> Carregando...</li>';
  try {
    const response = await fetch(`${API_BASE_URL}/api/dashboard/atualizacoes`, { headers: { Authorization: `Bearer ${token}` }, cache: 'no-cache' });
    if (!response.ok) { throw new Error('Falha ao buscar últimas atualizações.'); }
    const projetosRecentes = await response.json(); listaElement.innerHTML = '';
    if (projetosRecentes.length === 0) { listaElement.innerHTML = '<li class="list-group-item text-center text-white-50">Nenhuma atualização recente.</li>'; return; }
    projetosRecentes.forEach(projeto => {
      let badgeClass = 'text-bg-secondary'; let actionText = 'Cadastrado';
      switch (projeto.status) {
        case 'Concluído': badgeClass = 'text-bg-success'; actionText = 'Concluído'; break;
        case 'Em Montagem': badgeClass = 'text-bg-primary'; actionText = 'Iniciado'; break;
        case 'Pendente': badgeClass = 'text-bg-warning'; actionText = 'Pendente'; break;
      }
      const tempoAtras = calcularTempoAtras(projeto.data_cadastro);
      const itemHTML = `<li class="list-group-item"> <span class="badge ${badgeClass}">${actionText}</span> <strong class="ms-2">${projeto.codigo_projeto} - ${projeto.nome_empresa}</strong> <small class="text-white-50 d-block">${tempoAtras}</small> </li>`;
      listaElement.innerHTML += itemHTML;
    });
  } catch (error) { console.error("Erro ao carregar últimas atualizações:", error.message); listaElement.innerHTML = '<li class="list-group-item text-center text-danger">Erro ao carregar atualizações.</li>'; }
}
async function carregarPrazosProximos() {
  const token = localStorage.getItem("authToken"); if (!token) return;
  const tabelaBody = document.getElementById('tabelaPrazosBody'); if (!tabelaBody) return;
  tabelaBody.innerHTML = '<tr><td colspan="3" class="text-center text-white-50"><span class="spinner-border spinner-border-sm" role="status"></span> Carregando prazos...</td></tr>';
  try {
    const response = await fetch(`${API_BASE_URL}/api/dashboard/prazos`, { headers: { Authorization: `Bearer ${token}` }, cache: 'no-cache' });
    if (!response.ok) { throw new Error('Falha ao buscar prazos de entrega.'); }
    const projetos = await response.json(); tabelaBody.innerHTML = '';
    if (projetos.length === 0) { tabelaBody.innerHTML = '<tr><td colspan="3" class="text-center text-white-50">Nenhum prazo de entrega próximo.</td></tr>'; return; }
    const hoje = new Date(); hoje.setHours(0, 0, 0, 0);
    projetos.forEach(projeto => {
      const dataEntrega = new Date(projeto.data_entrega); dataEntrega.setHours(0 - (dataEntrega.getTimezoneOffset() / 60), 0, 0, 0);
      const diffTime = dataEntrega - hoje; const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      let prazoTexto = `Em ${diffDays} dias`; let prazoClasseBadge = 'border-info text-info';
      if (diffDays < 0) { prazoTexto = 'Atrasado'; prazoClasseBadge = 'border-danger text-danger'; }
      else if (diffDays === 0) { prazoTexto = 'Vence Hoje'; prazoClasseBadge = 'border-danger text-danger'; }
      else if (diffDays <= 3) { prazoTexto = `Em ${diffDays} dia${diffDays > 1 ? 's' : ''}`; prazoClasseBadge = 'border-warning text-warning'; }
      else if (diffDays <= 7) { prazoTexto = `Em ${diffDays} dias`; prazoClasseBadge = 'border-primary text-primary'; }
      const linhaHTML = `<tr> <td>${projeto.codigo_projeto}</td> <td>${projeto.nome_empresa}</td> <td class="text-end"> <span class="badge rounded-pill ${prazoClasseBadge}">${prazoTexto}</span> </td> </tr>`;
      tabelaBody.innerHTML += linhaHTML;
    });
  } catch (error) { console.error("Erro ao carregar prazos próximos:", error.message); tabelaBody.innerHTML = '<tr><td colspan="3" class="text-center text-danger">Erro ao carregar prazos.</td></tr>'; }
}
function calcularTempoAtras(dataISO) {
  const agora = new Date(); const dataPassada = new Date(dataISO); const diferencaSegundos = Math.round((agora - dataPassada) / 1000);
  const minutos = Math.round(diferencaSegundos / 60); const horas = Math.round(diferencaSegundos / 3600); const dias = Math.round(diferencaSegundos / 86400);
  const semanas = Math.round(diferencaSegundos / 604800); const meses = Math.round(diferencaSegundos / 2629800); const anos = Math.round(diferencaSegundos / 31557600);
  if (diferencaSegundos < 60) { return `agora mesmo`; } else if (minutos < 60) { return `há ${minutos} min`; } else if (horas < 24) { return `há ${horas} h`; }
  else if (dias < 7) { return `há ${dias} d`; } else if (semanas < 4) { return `há ${semanas} sem`; } else if (meses < 12) { return `há ${meses} mes`; } else { return `há ${anos} a`; }
}

/* ============================================= */
/* LÓGICA DA TELA DE CADASTRO                      */
/* ============================================= */
const cadastroForm = document.getElementById("cadastroForm");
if (cadastroForm) {
  cadastroForm.addEventListener("submit", async function (event) {
    event.preventDefault();
    const nome = document.getElementById("nome").value; const numero_registro = document.getElementById("numero_registro").value;
    const email = document.getElementById("email").value; const senha = document.getElementById("senha").value;
    const confirmarSenha = document.getElementById("confirmarSenha").value;
    if (senha !== confirmarSenha) { return alert("As senhas não coincidem!"); }
    try {
      const response = await fetch(`${API_BASE_URL}/api/users/register`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ nome, numero_registro, email, senha }), });
      const data = await response.json();
      if (response.status === 201) { alert("Usuário criado com sucesso! Por favor, faça o login."); window.location.href = "login.html"; }
      else { throw new Error(data.message || "Erro ao cadastrar usuário."); }
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
    const numero_registro = document.getElementById("numero_registro").value.trim(); const senha = document.getElementById("senha").value;
    try {
      const response = await fetch(`${API_BASE_URL}/api/users/login`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ numero_registro, senha }), });
      const data = await response.json();
      if (response.ok) { localStorage.setItem("authToken", data.token); alert("Login realizado com sucesso!"); window.location.href = "dashboard.html"; }
      else { throw new Error(data.message || "Erro ao fazer login."); }
    } catch (error) { alert(error.message); }
  });
}

/* ============================================= */
/* LÓGICA DA TELA DE PROJETOS (CRUD + NÃO CONFORMIDADE) */
/* ============================================= */

// ### FUNÇÃO MOVIDA PARA O ESCOPO GLOBAL ###
// (Para ser acessível pelo listener do DOMContentLoaded)
async function salvarNaoConformidade(event) {
  event.preventDefault(); // Impede o envio padrão do formulário

  const id = document.getElementById('naoConformidadeProjectId').value;
  const teveNaoConformidade = document.getElementById('naoConformidadeCheckbox').checked;
  const descricaoNaoConformidade = document.getElementById('naoConformidadeDescricao').value;
  const token = localStorage.getItem("authToken");

  if (!id || !token) { alert("Erro: ID do projeto ou token não encontrado."); return; }

  const dados = {
    teveNaoConformidade: teveNaoConformidade,
    descricaoNaoConformidade: teveNaoConformidade ? (descricaoNaoConformidade.trim() || null) : null
  };

  try {
    const response = await fetch(`${API_BASE_URL}/api/projects/${id}/naoconformidade`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify(dados)
    });

    if (!response.ok) {
      const erro = await response.json();
      throw new Error(erro.message || 'Erro ao salvar status de não conformidade.');
    }

    const modalElement = document.getElementById('naoConformidadeModal');
    const modalInstance = bootstrap.Modal.getInstance(modalElement);
    if (modalInstance) { modalInstance.hide(); }

    alert('Status de não conformidade atualizado com sucesso!');

    // Chama carregarProjetos() - mas ela está definida dentro do if() abaixo.
    // Precisamos garantir que ela possa ser chamada.
    // A melhor forma é chamar a função global que inicializa a página de projetos,
    // mas como não temos uma, vamos chamar a 'carregarProjetos' que estará no escopo global
    // se a lógica for refatorada, ou simplesmente recarregar a tabela.
    // Por enquanto, vamos assumir que 'carregarProjetos' está acessível ou recarregar a página.
    // Solução: Vamos definir carregarProjetos no escopo global também.
    if (typeof carregarProjetos === "function") {
      carregarProjetos(); // Recarrega a lista
    } else {
      console.error("Função carregarProjetos() não encontrada para recarregar a tabela.");
    }

  } catch (error) {
    console.error("Erro ao salvar não conformidade:", error);
    alert(error.message);
  }
}


const tabelaProjetosCorpo = document.getElementById("projetosTabela");
if (tabelaProjetosCorpo) { // Executa apenas se estiver na página de projetos
  const filtroNomeInput = document.getElementById("filtroNome");
  const filtroStatusSelect = document.getElementById("filtroStatus");

  const urlParams = new URLSearchParams(window.location.search);
  const codigoParaFiltrar = urlParams.get('codigo');
  if (codigoParaFiltrar && filtroNomeInput) { filtroNomeInput.value = codigoParaFiltrar; }

  if (filtroNomeInput && filtroStatusSelect) {
    filtroNomeInput.addEventListener("input", () => carregarProjetos());
    filtroStatusSelect.addEventListener("change", () => carregarProjetos());
  }

  function getBadgeClass(status) {
    switch (status) {
      case "Pendente": return "border-warning text-warning";
      case "Em Montagem": return "border-info text-info";
      case "Concluído": return "border-success text-success";
      default: return "border-secondary text-secondary";
    }
  }

  // ### LISTENER ÚNICO E CORRETO AQUI ###
  // (Removido do DOMContentLoaded e colocado aqui, onde as funções estão no escopo)
  tabelaProjetosCorpo.addEventListener("click", function (event) {
    const targetElement = event.target;
    const linhaClicada = targetElement.closest("tr");
    if (!linhaClicada || !linhaClicada.dataset.id) return;
    const idDoProjeto = linhaClicada.dataset.id;

    // 1. Checar botão Não Conformidade
    if (targetElement.closest(".btn-nao-conformidade")) {
      event.preventDefault();
      abrirModalNaoConformidade(idDoProjeto); // Esta função está definida abaixo
      return;
    }

    // 2. Checar botão Delete
    if (targetElement.closest(".btn-delete")) {
      event.preventDefault();
      if (confirm("Você tem certeza que deseja excluir este projeto?")) {
        deletarProjeto(idDoProjeto); // Esta função está definida abaixo
      }
      return;
    }

    // 3. Checar botão Edit
    if (targetElement.closest(".btn-edit")) {
      event.preventDefault();
      abrirModalDeEdicao(idDoProjeto); // Esta função está definida abaixo
      return;
    }

    // 4. Se não for botão, é clique na linha para Detalhes
    const detailsCard = document.getElementById("projectDetailsCard");
    if (detailsCard) {
      document.getElementById("projectCodeDetail").innerText = `Detalhes do Projeto: ${linhaClicada.cells[0].textContent}`;
      document.getElementById("projectCompanyDetail").innerText = linhaClicada.cells[1].textContent;
      document.getElementById("projectDescriptionDetail").innerText = linhaClicada.dataset.description || "Sem descrição.";
      document.getElementById("projectAssemblerDetail").innerText = linhaClicada.dataset.montadoresNomes || "Nenhum";
      document.getElementById("projectStatusDetail").innerHTML = linhaClicada.cells[4].innerHTML;
      detailsCard.classList.remove("d-none");
    }
  });


  // Função principal para carregar e exibir os projetos na tabela
  async function carregarProjetos() {
    const detailsCard = document.getElementById("projectDetailsCard");
    if (detailsCard) detailsCard.classList.add("d-none");
    const token = localStorage.getItem("authToken"); if (!token) return;
    const nome = filtroNomeInput ? filtroNomeInput.value : ''; const status = filtroStatusSelect ? filtroStatusSelect.value : '';
    let url = `${API_BASE_URL}/api/projects`; const params = new URLSearchParams();
    if (nome) params.append("nome", nome); if (status) params.append("status", status);
    if (params.toString()) url += `?${params.toString()}`;
    tabelaProjetosCorpo.innerHTML = `<tr><td colspan="6" class="text-center text-white-50">Carregando projetos...</td></tr>`;
    try {
      const response = await fetch(url, { headers: { Authorization: `Bearer ${token}` }, cache: 'no-cache' });
      if (!response.ok) {
        let errorMsg = "Falha ao buscar projetos.";
        try { const erroApi = await response.json(); errorMsg = erroApi.message || errorMsg; } catch (e) { /* Ignora */ }
        throw new Error(errorMsg);
      }
      const projetos = await response.json();
      tabelaProjetosCorpo.innerHTML = "";
      if (projetos.length === 0) { tabelaProjetosCorpo.innerHTML = `<tr><td colspan="6" class="text-center text-white-50">Nenhum projeto encontrado.</td></tr>`; return; }

      projetos.forEach((projeto) => {
        const dataCadastro = new Date(projeto.data_cadastro).toLocaleDateString("pt-BR");
        const dataEntrega = projeto.data_entrega ? new Date(projeto.data_entrega).toLocaleDateString("pt-BR") : "N/A";
        const nomesMontadores = projeto.montadores && projeto.montadores.length > 0 ? projeto.montadores.map(m => m.nome).join(', ') : "N/A";
        const badgeClass = getBadgeClass(projeto.status);

        const naoConformidadeIcone = projeto.teveNaoConformidade
          ? '<i class="fas fa-exclamation-circle text-danger ms-1 small" title="Este projeto teve não conformidade registrada"></i>'
          : '';

        const botaoNaoConformidade = projeto.status === 'Concluído'
          ? `<a href="#" class="btn btn-sm btn-outline-warning me-2 btn-nao-conformidade" title="Registrar/Ver Não Conformidade"><i class="fas fa-exclamation-triangle"></i></a>`
          : '';

        // Guarda os dados de N-C nos data attributes da linha
        const novaLinhaHTML = `
            <tr data-id="${projeto.id}"
                data-montadores-nomes="${nomesMontadores}"
                data-description="${projeto.descricao || ""}"
                data-codigo="${projeto.codigo_projeto || ""}"
                data-teve-nao-conformidade="${projeto.teveNaoConformidade || false}"
                data-descricao-nao-conformidade="${projeto.descricaoNaoConformidade || ""}" >
                <td>${projeto.codigo_projeto}</td>
                <td>${projeto.nome_empresa}</td>
                <td>${dataCadastro}</td>
                <td>${dataEntrega}</td>
                <td class="text-center">
                    <span class="badge rounded-pill ${badgeClass}">${projeto.status}</span>${naoConformidadeIcone}
                </td>
                <td class="text-end">
                    ${botaoNaoConformidade}
                    <a href="#" class="btn btn-sm btn-outline-light me-2 btn-edit" title="Editar"><i class="fas fa-edit"></i></a>
                    <a href="#" class="btn btn-sm btn-outline-danger btn-delete" title="Excluir"><i class="fas fa-trash-alt"></i></a>
                </td>
            </tr>`;
        tabelaProjetosCorpo.innerHTML += novaLinhaHTML;
      });
    } catch (error) {
      tabelaProjetosCorpo.innerHTML = `<tr><td colspan="6" class="text-center text-danger">${error.message}</td></tr>`;
    }
  }
  // Tornar a função carregarProjetos acessível globalmente (ou pelo menos para salvarNaoConformidade)
  // Como 'salvarNaoConformidade' foi movida, ela precisa chamar 'carregarProjetos'
  // Vamos redefinir 'carregarProjetos' no escopo global para garantir
  window.carregarProjetos = carregarProjetos;


  // Função para deletar um projeto
  async function deletarProjeto(id) {
    const token = localStorage.getItem("authToken");
    try {
      const response = await fetch(`${API_BASE_URL}/api/projects/${id}`, { method: "DELETE", headers: { Authorization: `Bearer ${token}` } });
      if (response.status === 204) { alert("Projeto deletado com sucesso!"); carregarProjetos(); }
      else { const erro = await response.json(); throw new Error(erro.message || "Erro ao deletar projeto."); }
    } catch (error) { alert(error.message); }
  }

  // Função para buscar dados do projeto e abrir o modal de edição
  async function abrirModalDeEdicao(id) {
    try {
      const token = localStorage.getItem("authToken");
      const response = await fetch(`${API_BASE_URL}/api/projects/${id}`, { headers: { Authorization: `Bearer ${token}` }, cache: "no-cache" });
      if (!response.ok) throw new Error("Falha ao buscar dados do projeto.");
      const projeto = await response.json();
      const montadoresResponse = await fetch(`${API_BASE_URL}/api/montadores`, { headers: { Authorization: `Bearer ${token}` }, cache: "no-cache" });
      if (!montadoresResponse.ok) throw new Error("Falha ao buscar montadores.");
      const todosMontadores = await montadoresResponse.json();
      const montadorSelect = document.getElementById("editMontadorResponsavel");
      montadorSelect.innerHTML = "";
      const idsMontadoresAssociados = projeto.montadores ? projeto.montadores.map(m => m.id) : [];
      todosMontadores.forEach((montador) => {
        const option = document.createElement('option');
        option.value = montador.id; option.textContent = montador.nome;
        if (idsMontadoresAssociados.includes(montador.id)) { option.selected = true; }
        montadorSelect.appendChild(option);
      });
      document.getElementById("editProjectId").value = projeto.id;
      document.getElementById("editNomeEmpresa").value = projeto.nome_empresa;
      document.getElementById("editCodigoProjeto").value = projeto.codigo_projeto;
      document.getElementById("editStatus").value = projeto.status;
      document.getElementById("editDescricao").value = projeto.descricao;
      document.getElementById("editDataCadastro").value = new Date(projeto.data_cadastro).toISOString().split("T")[0];
      document.getElementById("editDataEntrega").value = projeto.data_entrega ? new Date(projeto.data_entrega).toISOString().split("T")[0] : "";
      const modal = new bootstrap.Modal(document.getElementById("editProjectModal")); modal.show();
    } catch (error) { alert(error.message); }
  }

  // Lógica para o formulário de ADICIONAR projeto
  const addProjectForm = document.getElementById("addProjectForm");
  if (addProjectForm) {
    const addProjectModal = document.getElementById("addProjectModal");
    addProjectModal.addEventListener("show.bs.modal", async () => {
      try {
        const token = localStorage.getItem("authToken");
        const response = await fetch(`${API_BASE_URL}/api/montadores`, { headers: { Authorization: `Bearer ${token}` }, cache: "no-cache" });
        if (!response.ok) throw new Error("Falha ao buscar montadores.");
        const montadores = await response.json();
        const montadorSelect = document.getElementById("montadorResponsavel");
        montadorSelect.innerHTML = '';
        montadores.forEach((montador) => { montadorSelect.innerHTML += `<option value="${montador.id}">${montador.nome}</option>`; });
        document.getElementById("dataCadastro").value = new Date().toISOString().split("T")[0];
      } catch (error) { alert(error.message); }
    });
    addProjectForm.addEventListener("submit", async (event) => {
      event.preventDefault();
      const montadorSelect = document.getElementById("montadorResponsavel");
      const montadorIdsSelecionados = Array.from(montadorSelect.selectedOptions).map(option => parseInt(option.value));
      const dadosDoProjeto = {
        codigo_projeto: document.getElementById("codigoProjeto").value, nome_empresa: document.getElementById("nomeEmpresa").value,
        status: document.getElementById("statusInicial").value, descricao: document.getElementById("descricao").value,
        data_cadastro: document.getElementById("dataCadastro").value, data_entrega: document.getElementById("dataEntrega").value || null,
        montadorIds: montadorIdsSelecionados,
      };
      try {
        const token = localStorage.getItem("authToken");
        const response = await fetch(`${API_BASE_URL}/api/projects`, {
          method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify(dadosDoProjeto),
        });
        if (!response.ok) { const erro = await response.json(); throw new Error(erro.message || "Erro ao criar projeto."); }
        alert("Projeto criado com sucesso!"); carregarProjetos();
        const modalInstance = bootstrap.Modal.getInstance(addProjectModal); modalInstance.hide();
        addProjectForm.reset();
      } catch (error) { alert(error.message); }
    });
  }

  // Lógica para o formulário de EDITAR projeto
  const editProjectForm = document.getElementById("editProjectForm");
  if (editProjectForm) {
    editProjectForm.addEventListener("submit", async function (event) {
      event.preventDefault();
      const id = document.getElementById("editProjectId").value;
      const montadorSelect = document.getElementById("editMontadorResponsavel");
      const montadorIdsSelecionados = Array.from(montadorSelect.selectedOptions).map(option => parseInt(option.value));
      const dadosAtualizados = {
        nome_empresa: document.getElementById("editNomeEmpresa").value, codigo_projeto: document.getElementById("editCodigoProjeto").value,
        status: document.getElementById("editStatus").value, descricao: document.getElementById("editDescricao").value,
        data_cadastro: document.getElementById("editDataCadastro").value, data_entrega: document.getElementById("editDataEntrega").value || null,
        montadorIds: montadorIdsSelecionados,
      };
      try {
        const token = localStorage.getItem("authToken");
        const response = await fetch(`${API_BASE_URL}/api/projects/${id}`, {
          method: "PUT", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify(dadosAtualizados),
        });
        if (!response.ok) { const erro = await response.json(); throw new Error(erro.message || "Erro ao atualizar projeto."); }
        alert("Projeto atualizado com sucesso!"); carregarProjetos();
        const modalInstance = bootstrap.Modal.getInstance(document.getElementById("editProjectModal")); modalInstance.hide();
      } catch (error) { alert(error.message); }
    });
  }

  // ### NOVAS FUNÇÕES PARA NÃO CONFORMIDADE ###

  // Função para abrir e preencher o modal de Não Conformidade
  function abrirModalNaoConformidade(id) {
    const linhaProjeto = document.querySelector(`#projetosTabela tr[data-id='${id}']`);
    if (!linhaProjeto) {
      console.error("Não foi possível encontrar os dados do projeto na tabela para o ID:", id);
      alert("Erro ao carregar dados da não conformidade.");
      return;
    }
    const codigoProjeto = linhaProjeto.dataset.codigo || 'N/A';
    const teveNaoConformidade = linhaProjeto.dataset.teveNaoConformidade === 'true';
    const descricaoNaoConformidade = linhaProjeto.dataset.descricaoNaoConformidade || '';
    document.getElementById('naoConformidadeProjectId').value = id;
    document.getElementById('naoConformidadeProjectCode').textContent = codigoProjeto;
    const checkbox = document.getElementById('naoConformidadeCheckbox');
    checkbox.checked = teveNaoConformidade;
    document.getElementById('naoConformidadeDescricao').value = descricaoNaoConformidade;
    document.getElementById('naoConformidadeDescricaoDiv').style.display = teveNaoConformidade ? 'block' : 'none';
    const modalElement = document.getElementById('naoConformidadeModal');
    const modal = bootstrap.Modal.getOrCreateInstance(modalElement);
    modal.show();
  }

  // Iniciar o carregamento dos projetos
  carregarProjetos();
} // Fim do if (tabelaProjetosCorpo)

/* ============================================= */
/* LÓGICA DA TELA DE GESTÃO DE MONTADORES        */
/* ============================================= */
const tabelaMontadoresCorpo = document.getElementById("montadoresTabela");
const filtroNomeMontador = document.getElementById("filtroNomeMontador");
if (tabelaMontadoresCorpo) { // Executa apenas na página de montadores
  carregarMontadores();
  if (filtroNomeMontador) { filtroNomeMontador.addEventListener('input', () => carregarMontadores()); }
  tabelaMontadoresCorpo.addEventListener('click', function (event) {
    const targetElement = event.target;
    const deleteButton = targetElement.closest('.btn-delete-montador');
    if (deleteButton) {
      event.preventDefault();
      const linhaDoMontador = targetElement.closest('tr');
      const montadorId = linhaDoMontador.dataset.id;
      const montadorNome = linhaDoMontador.cells[1].textContent;
      if (confirm(`Você tem certeza que deseja excluir o montador "${montadorNome}"?`)) { deletarMontador(montadorId); }
    }
    const editButton = targetElement.closest('.btn-edit-montador');
    if (editButton) {
      event.preventDefault();
      const linhaDoMontador = targetElement.closest('tr');
      const montadorId = linhaDoMontador.dataset.id;
      abrirModalEdicaoMontador(montadorId);
    }
  });
}
async function carregarMontadores() {
  const token = localStorage.getItem("authToken"); if (!token) return;
  const nome = filtroNomeMontador ? filtroNomeMontador.value : '';
  let url = `${API_BASE_URL}/api/montadores`; if (nome) { url += `?nome=${encodeURIComponent(nome)}`; }
  tabelaMontadoresCorpo.innerHTML = `<tr><td colspan="5" class="text-center text-white-50">A carregar montadores...</td></tr>`;
  try {
    const response = await fetch(url, { headers: { 'Authorization': `Bearer ${token}` }, cache: 'no-cache' });
    if (!response.ok) { throw new Error("Falha ao buscar a lista de montadores."); }
    const montadores = await response.json(); tabelaMontadoresCorpo.innerHTML = "";
    if (montadores.length === 0) { tabelaMontadoresCorpo.innerHTML = `<tr><td colspan="5" class="text-center text-white-50">Nenhum montador encontrado.</td></tr>`; return; }
    montadores.forEach((montador) => {
      const linhaHTML = `<tr data-id="${montador.id}"><td>${montador.numero_registro}</td><td>${montador.nome}</td><td class="text-center fw-bold">${montador.concluidosNoMes}</td><td class="text-center"><span class="badge ${montador.projetosAtivos > 0 ? "text-bg-primary" : "text-bg-secondary"} rounded-pill">${montador.projetosAtivos}</span></td><td class="text-end"><a href="#" class="btn btn-sm btn-outline-light me-2 btn-edit-montador" title="Editar"><i class="fas fa-edit"></i></a><a href="#" class="btn btn-sm btn-outline-danger btn-delete-montador" title="Excluir"><i class="fas fa-trash-alt"></i></a></td></tr>`;
      tabelaMontadoresCorpo.innerHTML += linhaHTML;
    });
  } catch (error) { tabelaMontadoresCorpo.innerHTML = `<tr><td colspan="5" class="text-center text-danger">${error.message}</td></tr>`; }
}
const addMontadorForm = document.getElementById("addMontadorForm");
const addMontadorModalEl = document.getElementById("addMontadorModal");
if (addMontadorForm && addMontadorModalEl) {
  addMontadorForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const nome = document.getElementById("addNomeMontador").value; const numero_registro = document.getElementById("addNumRegistroMontador").value;
    const token = localStorage.getItem("authToken");
    try {
      const response = await fetch(`${API_BASE_URL}/api/montadores`, { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` }, body: JSON.stringify({ nome: nome, numero_registro: numero_registro }), });
      if (!response.ok) { const erro = await response.json(); throw new Error(erro.message || "Erro ao adicionar montador."); }
      alert("Montador adicionado com sucesso!"); const modalInstance = bootstrap.Modal.getInstance(addMontadorModalEl); modalInstance.hide();
      addMontadorForm.reset(); carregarMontadores();
    } catch (error) { alert(error.message); }
  });
}
async function deletarMontador(id) {
  const token = localStorage.getItem('authToken');
  try {
    const response = await fetch(`${API_BASE_URL}/api/montadores/${id}`, { method: 'DELETE', headers: { 'Authorization': `Bearer ${token}` } });
    if (response.status === 204) { alert('Montador excluído com sucesso!'); carregarMontadores(); }
    else { const erro = await response.json(); throw new Error(erro.message || 'Erro ao excluir montador.'); }
  } catch (error) { alert(error.message); }
}
async function abrirModalEdicaoMontador(id) {
  const token = localStorage.getItem('authToken');
  try {
    const response = await fetch(`${API_BASE_URL}/api/montadores/${id}`, { headers: { 'Authorization': `Bearer ${token}` }, cache: 'no-cache' });
    if (!response.ok) throw new Error('Falha ao buscar dados do montador.');
    const montador = await response.json();
    document.getElementById('editMontadorId').value = montador.id; document.getElementById('editNomeMontador').value = montador.nome;
    document.getElementById('editNumRegistroMontador').value = montador.numero_registro;
    const editModal = new bootstrap.Modal(document.getElementById('editMontadorModal')); editModal.show();
  } catch (error) { alert(error.message); }
}
const editMontadorForm = document.getElementById('editMontadorForm');
const editMontadorModalEl = document.getElementById('editMontadorModal');
if (editMontadorForm && editMontadorModalEl) {
  editMontadorForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    const id = document.getElementById('editMontadorId').value; const nome = document.getElementById('editNomeMontador').value;
    const numero_registro = document.getElementById('editNumRegistroMontador').value; const token = localStorage.getItem('authToken');
    try {
      const response = await fetch(`${API_BASE_URL}/api/montadores/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` }, body: JSON.stringify({ nome, numero_registro }), });
      if (!response.ok) { const erro = await response.json(); throw new Error(erro.message || 'Erro ao atualizar montador.'); }
      alert('Montador atualizado com sucesso!'); bootstrap.Modal.getInstance(editMontadorModalEl).hide(); carregarMontadores();
    } catch (error) { alert(error.message); }
  });
}