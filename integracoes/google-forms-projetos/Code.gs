/**
 * DubWorks — Integração estável de Google Forms para Projetos
 * -----------------------------------------------------------
 * Objetivo: reduzir a dependência de APIs externas para criação/manutenção
 * de formulários. Usa apenas serviços nativos do Google Apps Script:
 * FormApp, DriveApp, SpreadsheetApp e PropertiesService.
 *
 * PRINCIPAIS AÇÕES DO WEB APP
 * - ping
 * - preparar_formularios_projeto
 * - sincronizar_form_entregas
 * - sincronizar_form_selecao
 * - ler_respostas_selecao
 * - ler_respostas_entregas
 * - diagnostico
 *
 * IMPORTANTE SOBRE UPLOAD DE ARQUIVOS
 * O FormApp não cria uma pergunta de upload de arquivos do zero. Por isso,
 * para produção, use dois formulários-modelo já existentes contendo o campo
 * de upload. O script COPIA o modelo, preservando descrição, upload e demais
 * configurações, e apenas atualiza os campos dinâmicos.
 */

const DW_FORMS_CFG = {
  PROP_TOKEN: 'DUBWORKS_FORMS_TOKEN',
  PROP_TEMPLATE_SELECTION: 'DUBWORKS_TEMPLATE_FORM_SELECTION_ID',
  PROP_TEMPLATE_DELIVERIES: 'DUBWORKS_TEMPLATE_FORM_DELIVERIES_ID',
  PROP_ROOT_PROJECTS: 'DUBWORKS_PROJECTS_ROOT_FOLDER_ID',
  PROP_ROOT_PARTNERSHIPS: 'DUBWORKS_PARTNERSHIPS_ROOT_FOLDER_ID',
  PROP_PREFIX_FORM_META: 'DUBWORKS_FORM_META_',
  PROP_PREFIX_PROJECT_FORMS: 'DUBWORKS_PROJECT_FORMS_',
  PROP_PREFIX_PERSON_FOLDER: 'DUBWORKS_PERSON_FOLDER_',
  PROP_PREFIX_DRIVE_PROJECT: 'DUBWORKS_DRIVE_PROJECT_',

  SELECTION_NAME_ALIASES: ['nome', 'nome do membro', 'seu nome', 'nome completo'],
  PHONE_ALIASES: [
    'numero de telefone', 'número de telefone', 'telefone', 'whatsapp',
    'numero de telefone / whatsapp', 'número de telefone / whatsapp',
    'seu numero', 'seu número'
  ],
  CHARACTER_ALIASES: [
    'personagem', 'personagem do teste', 'personagem escolhido',
    'qual personagem', 'personagem desta selecao', 'personagem desta seleção'
  ],
  WEEK_CUT_ALIASES: [
    'semana / corte', 'semana/corte', 'semana', 'semana da entrega',
    'semana / parte', 'semana/parte'
  ],
  LINK_ALIASES: ['link do video / arquivo', 'link do vídeo / arquivo', 'link', 'video', 'vídeo'],
  OBS_ALIASES: ['observacao', 'observação', 'comentario', 'comentário', 'observacoes', 'observações'],
};

function doGet(e) {
  const action = String((e && e.parameter && e.parameter.action) || 'ping').trim();
  if (action === 'ping' || action === 'diagnostico') {
    return respostaJson_(diagnostico_());
  }
  return respostaJson_({ ok: true, service: 'DubWorks Google Forms', action: action });
}

function doPost(e) {
  try {
    const payload = lerPayload_(e);
    validarToken_(payload.token);
    const action = String(payload.action || 'preparar_formularios_projeto').trim();

    let result;
    switch (action) {
      case 'ping':
      case 'diagnostico':
        result = diagnostico_();
        break;
      case 'criar_estrutura_drive':
        result = criarEstruturaDrive_(payload);
        break;
      case 'compartilhar_pasta':
        result = compartilharPasta_(payload);
        break;
      case 'preparar_formularios_projeto':
        result = prepararFormulariosProjeto_(payload);
        break;
      case 'sincronizar_form_entregas':
        result = sincronizarFormularioEntregas_(payload);
        break;
      case 'sincronizar_form_selecao':
        result = sincronizarFormularioSelecao_(payload);
        break;
      case 'ler_respostas_selecao':
        result = lerRespostasSelecao_(payload);
        break;
      case 'ler_respostas_entregas':
        result = lerRespostasEntregas_(payload);
        break;
      default:
        throw new Error('Ação não reconhecida: ' + action);
    }

    return respostaJson_(Object.assign({ ok: true }, result || {}));
  } catch (err) {
    console.error(err && err.stack ? err.stack : err);
    return respostaJson_({
      ok: false,
      error: String(err && err.message ? err.message : err || 'Erro desconhecido')
    });
  }
}

/** Execute UMA VEZ para gerar/mostrar o token do Web App. */
function configurarIntegracaoDubWorks() {
  const props = PropertiesService.getScriptProperties();
  let token = props.getProperty(DW_FORMS_CFG.PROP_TOKEN);
  if (!token) {
    token = Utilities.getUuid().replace(/-/g, '') + Utilities.getUuid().replace(/-/g, '');
    props.setProperty(DW_FORMS_CFG.PROP_TOKEN, token);
  }
  console.log('DUBWORKS_FORMS_TOKEN=' + token);
  console.log('Depois de implantar como Aplicativo da Web, salve a URL /exec como secret DUBWORKS_FORMS_WEBAPP_URL na Supabase.');
  return { token: token };
}

/**
 * Configure os dois formulários-modelo oficiais.
 * Aceita URL completa do Google Forms ou apenas o ID.
 */
function configurarModelosDubWorks(formSelecaoUrlOuId, formEntregasUrlOuId) {
  const selecaoId = extrairIdGoogle_(formSelecaoUrlOuId);
  const entregasId = extrairIdGoogle_(formEntregasUrlOuId);
  if (!selecaoId || !entregasId) {
    throw new Error('Informe o formulário-modelo de Seleção e o de Entregas.');
  }
  // Abre agora para validar acesso antes de salvar.
  FormApp.openById(selecaoId);
  FormApp.openById(entregasId);

  const props = PropertiesService.getScriptProperties();
  props.setProperty(DW_FORMS_CFG.PROP_TEMPLATE_SELECTION, selecaoId);
  props.setProperty(DW_FORMS_CFG.PROP_TEMPLATE_DELIVERIES, entregasId);
  return diagnostico_();
}

/**
 * Opcional, mas recomendado. Permite separar a pasta principal de cada projeto:
 * - Projeto -> pasta raiz Projetos
 * - Parceria -> pasta raiz Parcerias
 * Aceita URL da pasta ou ID.
 */
function configurarPastasRaizDubWorks(pastaProjetosUrlOuId, pastaParceriasUrlOuId) {
  const projetosId = extrairIdGoogle_(pastaProjetosUrlOuId);
  const parceriasId = extrairIdGoogle_(pastaParceriasUrlOuId);
  if (!projetosId || !parceriasId) {
    throw new Error('Informe as duas pastas raiz: Projetos e Parcerias.');
  }
  DriveApp.getFolderById(projetosId);
  DriveApp.getFolderById(parceriasId);

  const props = PropertiesService.getScriptProperties();
  props.setProperty(DW_FORMS_CFG.PROP_ROOT_PROJECTS, projetosId);
  props.setProperty(DW_FORMS_CFG.PROP_ROOT_PARTNERSHIPS, parceriasId);
  return diagnostico_();
}

/**
 * Cria automaticamente um ambiente raiz de TESTE no Drive do usuário.
 * Execute uma vez se você ainda não tiver as pastas Projetos/Parcerias.
 */
function configurarAmbienteTesteDubWorks() {
  const props = PropertiesService.getScriptProperties();
  const raiz = DriveApp.createFolder('DubWorks Manager - TESTE');
  const projetos = raiz.createFolder('Projetos');
  const parcerias = raiz.createFolder('Parcerias');

  props.setProperty(DW_FORMS_CFG.PROP_ROOT_PROJECTS, projetos.getId());
  props.setProperty(DW_FORMS_CFG.PROP_ROOT_PARTNERSHIPS, parcerias.getId());

  const resultado = {
    raiz: { id: raiz.getId(), url: raiz.getUrl() },
    projetos: { id: projetos.getId(), url: projetos.getUrl() },
    parcerias: { id: parcerias.getId(), url: parcerias.getUrl() }
  };
  console.log(JSON.stringify(resultado, null, 2));
  return resultado;
}

function mostrarConfiguracaoDubWorks() {
  const d = diagnostico_();
  console.log(JSON.stringify(d, null, 2));
  return d;
}

function diagnostico_() {
  const props = PropertiesService.getScriptProperties();
  return {
    service: 'DubWorks Google Forms',
    version: '2026-09-13.1',
    tokenConfigurado: Boolean(props.getProperty(DW_FORMS_CFG.PROP_TOKEN)),
    modeloSelecaoConfigurado: Boolean(props.getProperty(DW_FORMS_CFG.PROP_TEMPLATE_SELECTION)),
    modeloEntregasConfigurado: Boolean(props.getProperty(DW_FORMS_CFG.PROP_TEMPLATE_DELIVERIES)),
    pastaProjetosConfigurada: Boolean(props.getProperty(DW_FORMS_CFG.PROP_ROOT_PROJECTS)),
    pastaParceriasConfigurada: Boolean(props.getProperty(DW_FORMS_CFG.PROP_ROOT_PARTNERSHIPS)),
    usaApisExternasParaForms: false,
    observacao: 'Os formulários são copiados/criados com serviços nativos do Google Apps Script.'
  };
}

function criarEstruturaDrive_(payload) {
  const props = PropertiesService.getScriptProperties();
  const projectName = limparTexto_(payload.projectName || payload.projetoNome || 'Projeto');
  const leaderEmail = limparTexto_(payload.leaderEmail || payload.liderEmail || '').toLowerCase();
  const editorEmail = limparTexto_(payload.editorEmail || '').toLowerCase();
  const projectType = normalizarTipoProjeto_(
    payload.projectType || payload.tipoProjeto ||
    (/^\s*\[parceria\]/i.test(projectName) ? 'Parceria' : 'Projeto')
  );

  const registryKey = DW_FORMS_CFG.PROP_PREFIX_DRIVE_PROJECT + normalizarChave_(projectName);
  const saved = props.getProperty(registryKey);
  if (saved) {
    try {
      const cached = JSON.parse(saved);
      if (cached && cached.pastaId) {
        DriveApp.getFolderById(cached.pastaId);
        compartilharEmailsPasta_(cached.pastaId, [leaderEmail, editorEmail]);
        return cached;
      }
    } catch (_) {}
  }

  const rootProp = projectType === 'PARCERIA'
    ? DW_FORMS_CFG.PROP_ROOT_PARTNERSHIPS
    : DW_FORMS_CFG.PROP_ROOT_PROJECTS;
  const rootId = props.getProperty(rootProp);
  if (!rootId) {
    throw new Error(
      'As pastas raiz ainda não foram configuradas. Execute configurarAmbienteTesteDubWorks() ou configurarPastasRaizDubWorks(...).'
    );
  }

  const root = DriveApp.getFolderById(rootId);
  const pasta = root.createFolder(projectName);

  const selecao = pasta.createFolder('1 | Seleção');
  const falasTeste = selecao.createFolder('1.1 | Falas Teste');
  const respostasSelecao = selecao.createFolder('1.2 | Respostas Seleção');

  const projeto = pasta.createFolder('2 | Projeto');
  const cortesProjeto = projeto.createFolder('2.1 | Cortes Projeto');
  const advertencia = projeto.createFolder('2.2 | Advertência');
  const entregasProjeto = projeto.createFolder('2.3 | Entregas Projeto');

  const finalizados = pasta.createFolder('3 | Finalizado');

  compartilharEmailsPasta_(pasta.getId(), [leaderEmail, editorEmail]);

  const result = {
    pasta: pasta.getUrl(),
    selecao: selecao.getUrl(),
    projeto: projeto.getUrl(),
    finalizados: finalizados.getUrl(),
    falasTeste: falasTeste.getUrl(),
    respostasSelecao: respostasSelecao.getUrl(),
    cortesProjeto: cortesProjeto.getUrl(),
    Advertencia: advertencia.getUrl(),
    entregasProjeto: entregasProjeto.getUrl(),
    pastaId: pasta.getId(),
    selecaoId: selecao.getId(),
    projetoId: projeto.getId(),
    finalizadosId: finalizados.getId(),
    falasTesteId: falasTeste.getId(),
    respostasSelecaoId: respostasSelecao.getId(),
    cortesProjetoId: cortesProjeto.getId(),
    AdvertenciaId: advertencia.getId(),
    entregasProjetoId: entregasProjeto.getId(),
    projectType: projectType
  };

  props.setProperty(registryKey, JSON.stringify(result));
  return result;
}

function compartilharPasta_(payload) {
  const folderId = extrairIdGoogle_(payload.folderId || payload.pastaId || payload.pasta || '');
  const email = limparTexto_(payload.email || '').toLowerCase();
  const role = limparTexto_(payload.role || 'writer').toLowerCase();

  if (!folderId) throw new Error('Pasta não informada.');
  if (!email) throw new Error('E-mail não informado.');

  const folder = DriveApp.getFolderById(folderId);
  if (role === 'reader' || role === 'viewer') folder.addViewer(email);
  else folder.addEditor(email);

  return { folderId: folderId, email: email, role: role };
}

function compartilharEmailsPasta_(folderId, emails) {
  const folder = DriveApp.getFolderById(folderId);
  (emails || []).forEach(function(email) {
    const value = limparTexto_(email || '').toLowerCase();
    if (!value || value.indexOf('@') < 1) return;
    try {
      folder.addEditor(value);
    } catch (err) {
      console.warn('Não foi possível compartilhar com ' + value + ': ' + err);
    }
  });
}

function prepararFormulariosProjeto_(payload) {
  const projectName = limparTexto_(payload.projectName || payload.projetoNome || 'Projeto');
  const projectId = limparTexto_(payload.projectId || payload.projetoId || projectName);
  const projectType = normalizarTipoProjeto_(payload.projectType || payload.tipoProjeto || 'Projeto');
  const mainFolderId = extrairIdGoogle_(payload.mainFolderId || payload.pastaId || payload.pasta || '');
  const selectionFolderId = extrairIdGoogle_(
    payload.respostasSelecaoFolderId || payload.selectionFolderId || payload.selecaoFolderId || ''
  );
  const deliveriesFolderId = extrairIdGoogle_(
    payload.entregasFolderId || payload.deliveriesFolderId || payload.projetoFolderId || ''
  );

  if (!selectionFolderId || !deliveriesFolderId) {
    throw new Error('Pastas de Seleção e Entregas são obrigatórias para preparar os formulários.');
  }

  const selectionFolder = DriveApp.getFolderById(selectionFolderId);
  const deliveriesFolder = DriveApp.getFolderById(deliveriesFolderId);

  const warnings = [];
  if (mainFolderId) {
    const resultadoOrganizacao = organizarPastaPrincipal_(mainFolderId, projectType);
    if (resultadoOrganizacao.warning) warnings.push(resultadoOrganizacao.warning);
  }

  const personagens = listaUnica_(payload.personagensSelecao || payload.personagens || []);
  const semanasAbertas = listaUnica_(payload.semanasAbertas || payload.semanas || []);

  const selection = obterOuCriarFormulario_(
    'selecao',
    projectName,
    projectId,
    projectType,
    selectionFolder,
    payload.existingSelectionFormId || payload.formSelecaoId || payload.formSelecao || ''
  );
  garantirCamposSelecao_(selection.form, personagens, selection.criadoDoZero, warnings);
  const selectionSheet = garantirPlanilhaRespostas_(
    selection.form,
    '[Seleção] ' + projectName + ' — Respostas',
    selectionFolder
  );
  registrarFormulario_(selection.form, {
    kind: 'selecao', projectId: projectId, projectName: projectName, projectType: projectType,
    targetFolderId: selectionFolderId, spreadsheetId: selectionSheet.getId()
  });
  instalarTrigger_(selection.form);

  const deliveries = obterOuCriarFormulario_(
    'entregas',
    projectName,
    projectId,
    projectType,
    deliveriesFolder,
    payload.existingDeliveriesFormId || payload.formEntregasId || payload.formEntregas || ''
  );
  garantirCamposEntregas_(deliveries.form, semanasAbertas, deliveries.criadoDoZero, warnings);
  const deliveriesSheet = garantirPlanilhaRespostas_(
    deliveries.form,
    '[Entregas] ' + projectName + ' — Respostas',
    deliveriesFolder
  );
  registrarFormulario_(deliveries.form, {
    kind: 'entregas', projectId: projectId, projectName: projectName, projectType: projectType,
    targetFolderId: deliveriesFolderId, spreadsheetId: deliveriesSheet.getId()
  });
  instalarTrigger_(deliveries.form);

  return {
    formSelecao: infoFormulario_(selection.form),
    formEntregas: infoFormulario_(deliveries.form),
    planilhaSelecao: infoPlanilha_(selectionSheet),
    planilhaEntregas: infoPlanilha_(deliveriesSheet),
    warnings: warnings,
    createdFromTemplate: {
      selecao: selection.usouModelo,
      entregas: deliveries.usouModelo
    }
  };
}

function sincronizarFormularioEntregas_(payload) {
  const formId = extrairIdGoogle_(payload.formId || payload.formEntregasId || payload.formEntregas || '');
  if (!formId) throw new Error('ID/URL do formulário de Entregas não informado.');
  const form = FormApp.openById(formId);
  const semanasAbertas = listaUnica_(payload.semanasAbertas || payload.semanas || []);
  const warnings = [];
  atualizarSemanaCorte_(form, semanasAbertas, warnings);
  return { formEntregas: infoFormulario_(form), semanasAbertas: semanasAbertas, warnings: warnings };
}

function sincronizarFormularioSelecao_(payload) {
  const formId = extrairIdGoogle_(payload.formId || payload.formSelecaoId || payload.formSelecao || '');
  if (!formId) throw new Error('ID/URL do formulário de Seleção não informado.');
  const form = FormApp.openById(formId);
  const personagens = listaUnica_(payload.personagensSelecao || payload.personagens || []);
  const warnings = [];
  atualizarPersonagens_(form, personagens, warnings);
  return { formSelecao: infoFormulario_(form), personagens: personagens, warnings: warnings };
}

function obterOuCriarFormulario_(kind, projectName, projectId, projectType, targetFolder, existingIdOrUrl) {
  const props = PropertiesService.getScriptProperties();
  let existingId = extrairIdGoogle_(existingIdOrUrl);

  // Idempotência: mesmo que o Manager não tenha conseguido salvar o link
  // depois de uma tentativa anterior, o Apps Script lembra os Forms já
  // criados para este projeto e reaproveita em vez de duplicar.
  if (!existingId) {
    const registryKey = DW_FORMS_CFG.PROP_PREFIX_PROJECT_FORMS + normalizarChave_(projectId || projectName);
    const rawRegistry = props.getProperty(registryKey);
    if (rawRegistry) {
      try {
        const registry = JSON.parse(rawRegistry);
        existingId = extrairIdGoogle_(kind === 'selecao' ? registry.selecao : registry.entregas);
      } catch (_) {}
    }
  }

  if (existingId) {
    try {
      const existingForm = FormApp.openById(existingId);
      moverArquivoParaPasta_(existingId, targetFolder);
      return { form: existingForm, usouModelo: false, criadoDoZero: false };
    } catch (err) {
      console.warn('Formulário existente não pôde ser aberto; será recriado. ' + err);
    }
  }

  const templateProp = kind === 'selecao'
    ? DW_FORMS_CFG.PROP_TEMPLATE_SELECTION
    : DW_FORMS_CFG.PROP_TEMPLATE_DELIVERIES;
  const templateId = props.getProperty(templateProp);
  const titulo = (kind === 'selecao' ? '[Seleção] ' : '[Entregas] ') + projectName;

  if (templateId) {
    const templateFile = DriveApp.getFileById(templateId);
    const copy = templateFile.makeCopy(titulo, targetFolder);
    const form = FormApp.openById(copy.getId());
    form.setTitle(titulo);
    return { form: form, usouModelo: true, criadoDoZero: false };
  }

  // Fallback: cria o formulário básico. Não possui upload automático.
  const form = FormApp.create(titulo);
  moverArquivoParaPasta_(form.getId(), targetFolder);
  form.setTitle(titulo);
  form.setDescription(
    kind === 'selecao'
      ? 'Formulário de seleção do projeto ' + projectName + '.'
      : 'Formulário de entregas do projeto ' + projectName + '.'
  );
  return { form: form, usouModelo: false, criadoDoZero: true };
}

function garantirCamposSelecao_(form, personagens, criadoDoZero, warnings) {
  garantirTextItem_(form, 'Nome', DW_FORMS_CFG.SELECTION_NAME_ALIASES, true);
  garantirTextItem_(form, 'Número de telefone / WhatsApp', DW_FORMS_CFG.PHONE_ALIASES, true,
    'Informe de preferência com DDD. Ex.: (27) 99999-9999.');
  atualizarPersonagens_(form, personagens, warnings);
  garantirParagraphItem_(form, 'Observação', DW_FORMS_CFG.OBS_ALIASES, false);

  if (criadoDoZero) {
    warnings.push('Seleção criada sem modelo. O Apps Script não consegue criar pergunta de Upload de arquivo do zero; configure um formulário-modelo com upload.');
  }
}

function garantirCamposEntregas_(form, semanasAbertas, criadoDoZero, warnings) {
  // Entregas NÃO deve depender de personagem digitado/escolhido.
  removerItensPorAliases_(form, DW_FORMS_CFG.CHARACTER_ALIASES);

  garantirTextItem_(form, 'Nome', DW_FORMS_CFG.SELECTION_NAME_ALIASES, true);
  garantirTextItem_(form, 'Número de telefone / WhatsApp', DW_FORMS_CFG.PHONE_ALIASES, true,
    'Informe de preferência com DDD. Ex.: (27) 99999-9999. O sistema identifica o personagem pelo telefone + semana.');
  atualizarSemanaCorte_(form, semanasAbertas, warnings);
  garantirTextItem_(form, 'Link do vídeo / arquivo', DW_FORMS_CFG.LINK_ALIASES, false);
  garantirParagraphItem_(form, 'Observação', DW_FORMS_CFG.OBS_ALIASES, false);

  if (criadoDoZero) {
    warnings.push('Entregas criada sem modelo. O Apps Script não consegue criar pergunta de Upload de arquivo do zero; configure um formulário-modelo com upload.');
  }
}

function atualizarPersonagens_(form, personagens, warnings) {
  const valores = listaUnica_(personagens);
  const tituloPadrao = 'Personagem';
  let item = encontrarItemEscolha_(form, DW_FORMS_CFG.CHARACTER_ALIASES);
  if (!item) {
    item = form.addListItem().setTitle(tituloPadrao).setRequired(true);
  }
  const choices = valores.length ? valores : ['Nenhum personagem cadastrado'];
  aplicarChoices_(item, choices);
  if (!valores.length) warnings.push('Nenhum personagem foi recebido para o formulário de Seleção.');
}

function atualizarSemanaCorte_(form, semanasAbertas, warnings) {
  const valores = listaUnica_(semanasAbertas);
  let item = encontrarItemEscolha_(form, DW_FORMS_CFG.WEEK_CUT_ALIASES);
  if (!item) {
    item = form.addListItem().setTitle('Semana / Corte').setRequired(true);
  } else if (limparTexto_(item.getTitle()) !== 'Semana / Corte') {
    item.setTitle('Semana / Corte');
  }

  aplicarChoices_(item, valores.length ? valores : ['Nenhuma semana aberta']);

  if (valores.length) {
    form.setAcceptingResponses(true);
  } else {
    // Sem semana aberta, evita entrega vinculada à semana errada.
    form.setAcceptingResponses(false);
    warnings.push('Formulário de Entregas fechado porque não existe semana aberta. Ao criar/reabrir uma semana, o Manager sincroniza e reabre o formulário.');
  }
}

function aplicarChoices_(item, choices) {
  const type = item.getType();
  if (type === FormApp.ItemType.LIST) {
    item.asListItem().setChoiceValues(choices);
    return;
  }
  if (type === FormApp.ItemType.MULTIPLE_CHOICE) {
    item.asMultipleChoiceItem().setChoiceValues(choices);
    return;
  }
  if (type === FormApp.ItemType.CHECKBOX) {
    item.asCheckboxItem().setChoiceValues(choices);
    return;
  }
  throw new Error('Campo dinâmico precisa ser Lista, Múltipla escolha ou Caixa de seleção.');
}

function encontrarItemEscolha_(form, aliases) {
  const aliasKeys = aliases.map(normalizarChave_);
  const items = form.getItems();
  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    const type = item.getType();
    if (![FormApp.ItemType.LIST, FormApp.ItemType.MULTIPLE_CHOICE, FormApp.ItemType.CHECKBOX].includes(type)) continue;
    if (aliasKeys.indexOf(normalizarChave_(item.getTitle())) >= 0) return item;
  }
  return null;
}

function garantirTextItem_(form, titulo, aliases, required, helpText) {
  const aliasKeys = aliases.map(normalizarChave_);
  const items = form.getItems(FormApp.ItemType.TEXT);
  for (let i = 0; i < items.length; i++) {
    const item = items[i].asTextItem();
    if (aliasKeys.indexOf(normalizarChave_(item.getTitle())) >= 0) {
      item.setRequired(Boolean(required));
      if (helpText) item.setHelpText(helpText);
      return item;
    }
  }
  const item = form.addTextItem().setTitle(titulo).setRequired(Boolean(required));
  if (helpText) item.setHelpText(helpText);
  return item;
}

function garantirParagraphItem_(form, titulo, aliases, required) {
  const aliasKeys = aliases.map(normalizarChave_);
  const items = form.getItems(FormApp.ItemType.PARAGRAPH_TEXT);
  for (let i = 0; i < items.length; i++) {
    const item = items[i].asParagraphTextItem();
    if (aliasKeys.indexOf(normalizarChave_(item.getTitle())) >= 0) {
      item.setRequired(Boolean(required));
      return item;
    }
  }
  return form.addParagraphTextItem().setTitle(titulo).setRequired(Boolean(required));
}

function removerItensPorAliases_(form, aliases) {
  const keys = aliases.map(normalizarChave_);
  const items = form.getItems().slice();
  for (let i = items.length - 1; i >= 0; i--) {
    const item = items[i];
    if (keys.indexOf(normalizarChave_(item.getTitle())) >= 0) {
      form.deleteItem(item);
    }
  }
}

function garantirPlanilhaRespostas_(form, titulo, folder) {
  let destinationId = '';
  try { destinationId = form.getDestinationId() || ''; } catch (_) {}
  if (destinationId) {
    try {
      const existing = SpreadsheetApp.openById(destinationId);
      moverArquivoParaPasta_(destinationId, folder);
      return existing;
    } catch (_) {}
  }

  const ss = SpreadsheetApp.create(titulo);
  form.setDestination(FormApp.DestinationType.SPREADSHEET, ss.getId());
  moverArquivoParaPasta_(ss.getId(), folder);
  return ss;
}

function registrarFormulario_(form, meta) {
  const props = PropertiesService.getScriptProperties();
  props.setProperty(
    DW_FORMS_CFG.PROP_PREFIX_FORM_META + form.getId(),
    JSON.stringify(meta)
  );

  const projectKey = normalizarChave_(meta.projectId || meta.projectName || 'projeto');
  const registryKey = DW_FORMS_CFG.PROP_PREFIX_PROJECT_FORMS + projectKey;
  let registry = {};
  try { registry = JSON.parse(props.getProperty(registryKey) || '{}'); } catch (_) {}
  if (meta.kind === 'selecao') registry.selecao = form.getId();
  if (meta.kind === 'entregas') registry.entregas = form.getId();
  props.setProperty(registryKey, JSON.stringify(registry));
}

function instalarTrigger_(form) {
  const formId = form.getId();
  const exists = ScriptApp.getProjectTriggers().some(function(t) {
    try {
      return t.getHandlerFunction() === 'onDubWorksFormSubmit' && t.getTriggerSourceId() === formId;
    } catch (_) {
      return false;
    }
  });
  if (!exists) {
    ScriptApp.newTrigger('onDubWorksFormSubmit').forForm(form).onFormSubmit().create();
  }
}

/**
 * Organiza arquivos de SELEÇÃO automaticamente:
 * [Personagem] Nome | Telefone - 01.ext
 * e agrupa todos os arquivos da mesma pessoa em uma pasta.
 */
function onDubWorksFormSubmit(e) {
  if (!e || !e.source || !e.response) return;
  const formId = e.source.getId();
  const props = PropertiesService.getScriptProperties();
  const raw = props.getProperty(DW_FORMS_CFG.PROP_PREFIX_FORM_META + formId);
  if (!raw) return;

  let meta;
  try { meta = JSON.parse(raw); } catch (_) { return; }
  if (!meta || meta.kind !== 'selecao') return;

  const responses = e.response.getItemResponses();
  const map = mapearItemResponses_(responses);
  const nome = valorPorAliases_(map, DW_FORMS_CFG.SELECTION_NAME_ALIASES) || 'Sem nome';
  const telefoneOriginal = valorPorAliases_(map, DW_FORMS_CFG.PHONE_ALIASES) || '';
  const personagem = valorPorAliases_(map, DW_FORMS_CFG.CHARACTER_ALIASES) || 'Sem personagem';
  const phone = normalizarTelefoneBR_(telefoneOriginal);
  const fileIds = coletarIdsUpload_(responses);
  if (!fileIds.length) return;

  const targetRoot = DriveApp.getFolderById(meta.targetFolderId);
  const personFolder = obterOuCriarPastaPessoa_(
    targetRoot,
    String(meta.projectId || meta.projectName || 'projeto'),
    nome,
    phone
  );

  let index = proximoIndice_(personFolder, personagem, nome, phone.display || telefoneOriginal);
  fileIds.forEach(function(fileId) {
    try {
      const file = DriveApp.getFileById(fileId);
      const ext = extensao_(file.getName());
      const base = '[' + sanitizarNome_(personagem) + '] ' + sanitizarNome_(nome) + ' | ' +
        sanitizarNome_(phone.display || telefoneOriginal || 'SEM-TELEFONE');
      const newName = base + ' - ' + String(index).padStart(2, '0') + ext;
      index += 1;
      file.setName(newName);
      file.moveTo(personFolder);
    } catch (err) {
      console.error('Não foi possível organizar arquivo ' + fileId + ': ' + err);
    }
  });
}

function obterOuCriarPastaPessoa_(root, projectKey, nome, phone) {
  const props = PropertiesService.getScriptProperties();
  const identity = phone.normalized || (phone.local ? ('SEMDDD-' + phone.local + '-' + normalizarChave_(nome)) : ('SEMTELEFONE-' + normalizarChave_(nome)));
  const propKey = DW_FORMS_CFG.PROP_PREFIX_PERSON_FOLDER + normalizarChave_(projectKey) + '_' + identity;
  const known = props.getProperty(propKey);
  if (known) {
    try { return DriveApp.getFolderById(known); } catch (_) {}
  }

  const folderName = sanitizarNome_(nome) + ' | ' + sanitizarNome_(phone.display || phone.normalized || phone.local || 'SEM-TELEFONE');
  const existing = root.getFoldersByName(folderName);
  const folder = existing.hasNext() ? existing.next() : root.createFolder(folderName);
  props.setProperty(propKey, folder.getId());
  return folder;
}

function coletarIdsUpload_(responses) {
  const out = [];
  responses.forEach(function(ir) {
    try {
      if (ir.getItem().getType() !== FormApp.ItemType.FILE_UPLOAD) return;
      const r = ir.getResponse();
      const arr = Array.isArray(r) ? r : [r];
      arr.forEach(function(v) {
        const id = extrairIdGoogle_(v);
        if (id) out.push(id);
      });
    } catch (_) {}
  });
  return Array.from(new Set(out));
}

function lerRespostasSelecao_(payload) {
  const spreadsheetId = extrairIdGoogle_(payload.spreadsheetId || payload.planilhaSelecao || '');
  if (!spreadsheetId) throw new Error('Planilha de Seleção não informada.');
  const rows = lerRespostasPlanilha_(spreadsheetId);
  return {
    respostas: rows.map(function(row, index) {
      return {
        id: String(index + 2),
        linha: index + 2,
        timestamp: valorObjetoPorAliases_(row, ['carimbo de data/hora', 'timestamp', 'data/hora', 'data']),
        nome: valorObjetoPorAliases_(row, DW_FORMS_CFG.SELECTION_NAME_ALIASES),
        telefone: valorObjetoPorAliases_(row, DW_FORMS_CFG.PHONE_ALIASES),
        personagem: valorObjetoPorAliases_(row, DW_FORMS_CFG.CHARACTER_ALIASES),
        semana: valorObjetoPorAliases_(row, DW_FORMS_CFG.WEEK_CUT_ALIASES) || 'Semana 01',
        videoUrl: primeiroLink_(row),
        comentario: valorObjetoPorAliases_(row, DW_FORMS_CFG.OBS_ALIASES),
        status: 'pendente'
      };
    })
  };
}

function lerRespostasEntregas_(payload) {
  const spreadsheetId = extrairIdGoogle_(payload.spreadsheetId || payload.planilhaEntregas || '');
  if (!spreadsheetId) throw new Error('Planilha de Entregas não informada.');
  const rows = lerRespostasPlanilha_(spreadsheetId);
  return {
    respostas: rows.map(function(row, index) {
      return {
        id: String(index + 2),
        linha: index + 2,
        timestamp: valorObjetoPorAliases_(row, ['carimbo de data/hora', 'timestamp', 'data/hora', 'data']),
        nome: valorObjetoPorAliases_(row, DW_FORMS_CFG.SELECTION_NAME_ALIASES),
        telefone: valorObjetoPorAliases_(row, DW_FORMS_CFG.PHONE_ALIASES),
        semana: valorObjetoPorAliases_(row, DW_FORMS_CFG.WEEK_CUT_ALIASES) || 'Semana 01',
        videoUrl: primeiroLink_(row),
        comentario: valorObjetoPorAliases_(row, DW_FORMS_CFG.OBS_ALIASES),
        personagem: '',
        status: 'pendente'
      };
    })
  };
}

function lerRespostasPlanilha_(spreadsheetId) {
  const ss = SpreadsheetApp.openById(spreadsheetId);
  // O Forms normalmente cria a aba de respostas como segunda/última aba.
  const sheets = ss.getSheets();
  let sh = sheets[0];
  for (let i = 0; i < sheets.length; i++) {
    if (sheets[i].getLastRow() > 1 && sheets[i].getLastColumn() > 0) {
      sh = sheets[i];
      break;
    }
  }
  const values = sh.getDataRange().getDisplayValues();
  if (values.length < 2) return [];
  const headers = values[0].map(limparTexto_);
  return values.slice(1)
    .filter(function(r) { return r.some(function(v) { return limparTexto_(v) !== ''; }); })
    .map(function(r) {
      const obj = {};
      headers.forEach(function(h, i) { obj[h] = r[i] == null ? '' : String(r[i]); });
      return obj;
    });
}

function primeiroLink_(row) {
  const preferido = valorObjetoPorAliases_(row, DW_FORMS_CFG.LINK_ALIASES);
  if (preferido) return preferido;
  const keys = Object.keys(row || {});
  for (let i = 0; i < keys.length; i++) {
    const v = String(row[keys[i]] || '');
    const match = v.match(/https?:\/\/[^\s,]+/i);
    if (match) return match[0];
  }
  return '';
}

function organizarPastaPrincipal_(mainFolderId, projectType) {
  const props = PropertiesService.getScriptProperties();
  const main = DriveApp.getFolderById(mainFolderId);
  const targetName = projectType === 'PARCERIA' ? 'Parcerias' : 'Projetos';
  let rootId = projectType === 'PARCERIA'
    ? props.getProperty(DW_FORMS_CFG.PROP_ROOT_PARTNERSHIPS)
    : props.getProperty(DW_FORMS_CFG.PROP_ROOT_PROJECTS);

  if (rootId) {
    const rootConfigurada = DriveApp.getFolderById(rootId);
    main.moveTo(rootConfigurada);
    return { moved: true, rootId: rootId, automatic: false };
  }

  // Fallback sem configuração manual: usa a pasta-pai em que a Edge Function
  // criou o projeto e garante, ao lado, as pastas "Projetos" e "Parcerias".
  // Se a pasta já estiver dentro da raiz correta, não cria nível duplicado.
  const parents = main.getParents();
  if (!parents.hasNext()) {
    return { warning: 'Não foi possível identificar a pasta-pai para separar Projetos e Parcerias.' };
  }

  const parent = parents.next();
  if (normalizarChave_(parent.getName()) === normalizarChave_(targetName)) {
    return { moved: false, rootId: parent.getId(), automatic: true };
  }

  const siblings = parent.getFoldersByName(targetName);
  const root = siblings.hasNext() ? siblings.next() : parent.createFolder(targetName);
  main.moveTo(root);
  return { moved: true, rootId: root.getId(), automatic: true };
}

function infoFormulario_(form) {
  return {
    id: form.getId(),
    editUrl: form.getEditUrl(),
    viewUrl: form.getPublishedUrl(),
    acceptingResponses: form.isAcceptingResponses()
  };
}

function infoPlanilha_(ss) {
  return { id: ss.getId(), url: ss.getUrl() };
}

function moverArquivoParaPasta_(fileId, folder) {
  try { DriveApp.getFileById(fileId).moveTo(folder); } catch (err) {
    console.warn('Não foi possível mover arquivo ' + fileId + ': ' + err);
  }
}

function mapearItemResponses_(responses) {
  const out = {};
  responses.forEach(function(ir) {
    let value = ir.getResponse();
    if (Array.isArray(value)) value = value.join(', ');
    out[normalizarChave_(ir.getItem().getTitle())] = limparTexto_(value);
  });
  return out;
}

function valorPorAliases_(map, aliases) {
  for (let i = 0; i < aliases.length; i++) {
    const v = map[normalizarChave_(aliases[i])];
    if (v != null && limparTexto_(v)) return limparTexto_(v);
  }
  return '';
}

function valorObjetoPorAliases_(obj, aliases) {
  const keys = Object.keys(obj || {});
  const wanted = aliases.map(normalizarChave_);
  for (let i = 0; i < keys.length; i++) {
    if (wanted.indexOf(normalizarChave_(keys[i])) >= 0) return limparTexto_(obj[keys[i]]);
  }
  return '';
}

function normalizarTelefoneBR_(raw) {
  const original = limparTexto_(raw);
  let digits = original.replace(/\D/g, '');
  if (digits.startsWith('00')) digits = digits.slice(2);
  if ((digits.length === 12 || digits.length === 13) && digits.startsWith('55')) digits = digits.slice(2);
  if (digits.length === 12 && digits.startsWith('0')) digits = digits.slice(1);

  if (digits.length === 10 || digits.length === 11) {
    return {
      original: original,
      normalized: digits,
      local: digits.slice(2),
      hasDDD: true,
      display: formatarTelefone_(digits)
    };
  }
  if (digits.length === 8 || digits.length === 9) {
    return {
      original: original,
      normalized: '',
      local: digits,
      hasDDD: false,
      display: formatarTelefone_(digits)
    };
  }
  return {
    original: original,
    normalized: digits,
    local: digits.length > 9 ? digits.slice(-9) : digits,
    hasDDD: digits.length >= 10,
    display: original || digits
  };
}

function formatarTelefone_(digits) {
  const s = String(digits || '');
  if (s.length === 11) return '(' + s.slice(0, 2) + ') ' + s.slice(2, 7) + '-' + s.slice(7);
  if (s.length === 10) return '(' + s.slice(0, 2) + ') ' + s.slice(2, 6) + '-' + s.slice(6);
  if (s.length === 9) return s.slice(0, 5) + '-' + s.slice(5);
  if (s.length === 8) return s.slice(0, 4) + '-' + s.slice(4);
  return s;
}

function proximoIndice_(folder, personagem, nome, telefone) {
  const prefix = '[' + sanitizarNome_(personagem) + '] ' + sanitizarNome_(nome) + ' | ' + sanitizarNome_(telefone);
  const files = folder.getFiles();
  let max = 0;
  while (files.hasNext()) {
    const n = files.next().getName();
    if (n.indexOf(prefix) !== 0) continue;
    const m = n.match(/ - (\d+)(?:\.[^.]+)?$/);
    if (m) max = Math.max(max, Number(m[1]));
  }
  return max + 1;
}

function extensao_(name) {
  const m = String(name || '').match(/(\.[^./\\]+)$/);
  return m ? m[1] : '';
}

function sanitizarNome_(value) {
  return limparTexto_(value).replace(/[\\/:*?"<>|]/g, '-').replace(/\s+/g, ' ').slice(0, 140) || 'Sem nome';
}

function listaUnica_(input) {
  const arr = Array.isArray(input) ? input : String(input || '').split(/\r?\n|,/);
  const seen = {};
  const out = [];
  arr.forEach(function(v) {
    const text = limparTexto_(v);
    if (!text) return;
    const key = normalizarChave_(text);
    if (seen[key]) return;
    seen[key] = true;
    out.push(text);
  });
  return out;
}

function normalizarTipoProjeto_(value) {
  const key = normalizarChave_(value);
  return key.indexOf('parceria') >= 0 ? 'PARCERIA' : 'PROJETO';
}

function normalizarChave_(value) {
  return limparTexto_(value)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function limparTexto_(value) {
  return String(value == null ? '' : value).trim();
}

function extrairIdGoogle_(value) {
  const s = limparTexto_(value);
  if (!s) return '';
  let m = s.match(/\/d\/([a-zA-Z0-9_-]+)/);
  if (m && m[1]) return m[1];
  m = s.match(/[?&]id=([a-zA-Z0-9_-]+)/);
  if (m && m[1]) return m[1];
  m = s.match(/\/folders\/([a-zA-Z0-9_-]+)/);
  if (m && m[1]) return m[1];
  if (/^[a-zA-Z0-9_-]{15,}$/.test(s)) return s;
  return '';
}

function lerPayload_(e) {
  const raw = e && e.postData && e.postData.contents ? e.postData.contents : '';
  if (!raw) return {};
  try { return JSON.parse(raw); } catch (_) {
    throw new Error('JSON inválido recebido pelo Apps Script.');
  }
}

function validarToken_(received) {
  const expected = PropertiesService.getScriptProperties().getProperty(DW_FORMS_CFG.PROP_TOKEN) || '';
  if (!expected) return; // compatibilidade durante instalação inicial
  if (String(received || '') !== expected) throw new Error('Token da integração inválido.');
}

function respostaJson_(data) {
  return ContentService.createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}
