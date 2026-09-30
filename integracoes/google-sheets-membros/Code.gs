/**
 * DubWorks Manager — Central de Membros via Google Planilhas
 *
 * Fonte oficial: a planilha vinculada ao Google Forms.
 * O Manager lê e escreve os dados diretamente nesta planilha.
 *
 * Esta versão acrescenta:
 * - Atendimento separado da Participação;
 * - edição de nome, telefone, datas e observação;
 * - histórico de atividades por membro;
 * - registro de alterações feitas no Manager e diretamente na planilha;
 * - validação básica de idade x faixa etária;
 * - compatibilidade com a coluna antiga "Status Comunidade".
 */

const DUBWORKS_CONFIG = {
  // GID da aba "Fichas" informado no link da planilha.
  GID_ABA: 940819695,
  NOME_ABA: '',
  TOKEN_PROPERTY: 'DUBWORKS_MEMBROS_TOKEN',
  HISTORICO_ABA: 'Historico_Membros',
};

const CAMPOS_GESTAO = {
  atendimento: 'Atendimento',
  participacao: 'Participação',
  data_entrada: 'Data de Entrada',
  data_saida: 'Data de Saída',
  observacao: 'Observação Interna',
};

const ALIASES = {
  timestamp: ['carimbo de data/hora', 'timestamp', 'data/hora', 'data de envio'],
  nome: [
    'nome', 'nome completo', 'seu nome', 'nome do membro', 'nome utilizado na comunidade',
    'nome social', 'como gostaria de ser chamado', 'como deseja ser chamado'
  ],
  telefone: [
    'telefone', 'whatsapp', 'número', 'numero', 'número de telefone', 'numero de telefone',
    'número de whatsapp', 'numero de whatsapp', 'whatsapp do membro'
  ],
  email: ['e-mail', 'email', 'gmail', 'endereço de e-mail', 'endereco de e-mail'],
  data_nascimento: [
    'data de nascimento', 'nascimento', 'data nascimento', 'aniversário', 'aniversario'
  ],
  idade: ['idade'],
  faixa_etaria: [
    'qual é a sua faixa etária', 'qual e a sua faixa etaria', 'faixa etária', 'faixa etaria'
  ],
  habilidades: [
    'habilidades', 'quais são suas habilidades', 'quais sao suas habilidades',
    'experiência', 'experiencia', 'áreas de interesse', 'areas de interesse'
  ],
  motivacao: [
    'motivação', 'motivacao', 'por que deseja participar', 'por que quer participar',
    'por que deseja entrar', 'interesse na comunidade'
  ],
  atendimento: ['atendimento', 'status do atendimento', 'mensagem enviada'],
  participacao: ['participação', 'participacao', 'status de participação', 'status de participacao'],
  movimentacao: ['movimentação', 'movimentacao'],
  status_comunidade: ['status comunidade', 'status do membro'],
  data_entrada: ['data de entrada', 'entrada'],
  data_saida: ['data de saída', 'data de saida', 'saída', 'saida'],
  observacao: ['observação interna', 'observacao interna', 'observações', 'observacoes'],
};

function doGet() {
  return responder_({
    ok: true,
    data: {
      servico: 'DubWorks Membros',
      mensagem: 'Integração ativa. Use o DubWorks Manager para acessar os membros.'
    }
  });
}

function doPost(e) {
  try {
    const corpo = JSON.parse((e && e.postData && e.postData.contents) || '{}');
    validarToken_(corpo.token);
    const acao = String(corpo.acao || '').trim();

    if (acao === 'ping') return responder_({ ok: true, data: ping_() });
    if (acao === 'listar_membros') return responder_({ ok: true, data: listarMembros_() });
    if (acao === 'historico_membro') {
      return responder_({ ok: true, data: historicoMembro_(Number(corpo.membroId)) });
    }
    if (acao === 'atualizar_membro') {
      return responder_({
        ok: true,
        data: atualizarMembro_(
          Number(corpo.membroId),
          corpo.alteracoes || {},
          corpo.ator || {}
        )
      });
    }

    throw new Error('Ação desconhecida: ' + acao);
  } catch (erro) {
    return responder_({ ok: false, error: erro && erro.message ? erro.message : String(erro) });
  }
}

/**
 * Execute UMA VEZ no editor do Apps Script depois de colar esta versão.
 * É rápido: garante colunas, cria a aba de histórico e mantém o mesmo token.
 */
function configurarIntegracaoDubWorks() {
  const props = PropertiesService.getScriptProperties();
  let token = String(props.getProperty(DUBWORKS_CONFIG.TOKEN_PROPERTY) || '').trim();

  if (!token) {
    token = 'DW-' + Utilities.getUuid().replace(/-/g, '') + Utilities.getUuid().replace(/-/g, '');
    props.setProperty(DUBWORKS_CONFIG.TOKEN_PROPERTY, token);
  }

  const info = garantirEstrutura_();

  console.log('CONFIGURAÇÃO CONCLUÍDA');
  console.log('ABA=' + info.aba);
  console.log('HISTORICO=' + info.historico);
  console.log('TOKEN_DUBWORKS=' + token);
  console.log('Se o Web App já estava implantado, crie uma nova versão da implantação.');

  SpreadsheetApp.getActiveSpreadsheet().toast(
    'Atualização concluída. A Central de Membros já pode usar Atendimento, Participação e Histórico.',
    'DubWorks',
    8
  );

  return { ok: true, aba: info.aba, historico: info.historico, token: token };
}

function mostrarTokenDubWorks() {
  const token = PropertiesService.getScriptProperties().getProperty(DUBWORKS_CONFIG.TOKEN_PROPERTY);
  if (!token) throw new Error('Execute configurarIntegracaoDubWorks() primeiro.');
  console.log('TOKEN_DUBWORKS=' + token);
  return token;
}

function ping_() {
  const planilha = SpreadsheetApp.getActiveSpreadsheet();
  const aba = obterAba_();
  return {
    planilha: planilha.getName(),
    aba: aba.getName(),
    total: Math.max(0, aba.getLastRow() - 1),
  };
}

function listarMembros_() {
  const aba = obterAba_();
  // As colunas administrativas são criadas na configuração inicial.
  // Não alteramos a estrutura da planilha em toda sincronização, o que
  // reduz bastante o tempo de leitura.

  const lastRow = aba.getLastRow();
  const lastCol = aba.getLastColumn();
  if (lastRow < 2 || lastCol < 1) return [];

  const valores = aba.getRange(1, 1, lastRow, lastCol).getValues();
  const headers = valores[0].map(v => String(v || '').trim());
  const mapa = mapearCabecalhos_(headers);
  const saida = [];

  for (let i = 1; i < valores.length; i++) {
    const linha = valores[i];
    if (linha.every(v => String(v || '').trim() === '')) continue;

    const rowNumber = i + 1;
    const nascimento = valorPorCampo_(linha, mapa, 'data_nascimento');
    // A data de nascimento é a fonte principal da idade. A coluna "Idade"
    // da planilha fica apenas como fallback quando não houver uma data válida.
    const idadeCalculadaNascimento = calcularIdade_(nascimento);
    const idadeInformada = numeroOuNulo_(valorPorCampo_(linha, mapa, 'idade'));
    const idade = idadeCalculadaNascimento !== null ? idadeCalculadaNascimento : idadeInformada;
    const faixaEtaria = texto_(valorPorCampo_(linha, mapa, 'faixa_etaria'));
    const timestamp = valorPorCampo_(linha, mapa, 'timestamp');
    const dataEntradaExplicita = valorPorCampo_(linha, mapa, 'data_entrada');
    const participacaoAtual = valorPorCampo_(linha, mapa, 'participacao');
    const statusLegado = valorPorCampo_(linha, mapa, 'status_comunidade');
    const statusBase = texto_(participacaoAtual) ? participacaoAtual : statusLegado;

    saida.push({
      id: rowNumber,
      nome: texto_(valorPorCampo_(linha, mapa, 'nome')),
      telefone: texto_(valorPorCampo_(linha, mapa, 'telefone')),
      email: texto_(valorPorCampo_(linha, mapa, 'email')),
      data_nascimento: dataISO_(nascimento),
      idade: idade,
      faixa_etaria: faixaEtaria,
      idade_inconsistente: idadeFaixaInconsistente_(idade, faixaEtaria),
      habilidades: texto_(valorPorCampo_(linha, mapa, 'habilidades')),
      motivacao: texto_(valorPorCampo_(linha, mapa, 'motivacao')),
      atendimento: normalizarAtendimento_(valorPorCampo_(linha, mapa, 'atendimento')),
      participacao: normalizarParticipacao_(statusBase),
      status_comunidade: normalizarParticipacao_(statusBase),
      movimentacao: texto_(valorPorCampo_(linha, mapa, 'movimentacao')),
      data_ficha: dataHoraISO_(timestamp),
      // Mantém compatibilidade visual com a Central antiga: se ainda não houver
      // Data de Entrada administrativa, exibe a data da ficha como referência.
      data_entrada: dataISO_(dataEntradaExplicita || timestamp),
      data_saida: dataISO_(valorPorCampo_(linha, mapa, 'data_saida')),
      observacao: texto_(valorPorCampo_(linha, mapa, 'observacao')),
      _linha_planilha: rowNumber,
    });
  }

  // Inscrições mais recentes primeiro.
  saida.sort((a, b) => String(b.data_ficha || b.data_entrada || '')
    .localeCompare(String(a.data_ficha || a.data_entrada || '')));
  return saida;
}

function atualizarMembro_(membroId, alteracoes, ator) {
  const aba = obterAba_();

  if (!Number.isInteger(membroId) || membroId < 2 || membroId > aba.getLastRow()) {
    throw new Error('Linha de membro inválida: ' + membroId);
  }

  const headers = aba.getRange(1, 1, 1, aba.getLastColumn()).getValues()[0]
    .map(v => String(v || '').trim());
  const mapa = mapearCabecalhos_(headers);
  const permitidos = [
    'nome', 'telefone', 'atendimento', 'participacao', 'status_comunidade',
    'movimentacao', 'data_entrada', 'data_saida', 'observacao'
  ];
  const historico = garantirHistorico_();
  const nomeMembro = texto_(aba.getRange(membroId, (mapa.nome || 0) + 1).getValue());
  const atorNome = texto_(ator && ator.nome) || 'DubWorks Manager';
  const atorCargo = texto_(ator && ator.cargo);
  const registrosHistorico = [];

  Object.keys(alteracoes || {}).forEach(campoRecebido => {
    if (permitidos.indexOf(campoRecebido) === -1) return;

    const campo = campoRecebido === 'status_comunidade' ? 'participacao' : campoRecebido;
    const indice = mapa[campo];
    if (indice === undefined || indice < 0) throw new Error('Coluna não encontrada para: ' + campo);

    const range = aba.getRange(membroId, indice + 1);
    const anteriorBruto = range.getValue();
    const anteriorTexto = texto_(anteriorBruto);
    let novo = alteracoes[campoRecebido];

    if (campo === 'participacao') {
      const canonico = normalizarParticipacao_(novo);
      if (canonico === 'nao_definido') {
        range.clearContent();
      } else {
        escreverOpcao_(range, canonico, 'participacao');
      }

      // Mantém a coluna legada sincronizada se ela já existir.
      const idxLegado = mapa.status_comunidade;
      if (idxLegado !== undefined && idxLegado >= 0 && idxLegado !== indice) {
        const legadoRange = aba.getRange(membroId, idxLegado + 1);
        if (canonico === 'nao_definido') legadoRange.clearContent();
        else legadoRange.setValue(labelParticipacao_(canonico));
      }
    } else if (campo === 'atendimento') {
      escreverOpcao_(range, normalizarAtendimento_(novo), 'atendimento');
    } else if ((campo === 'data_entrada' || campo === 'data_saida') && novo) {
      const data = dataObjeto_(String(novo) + (String(novo).match(/^\d{4}-\d{2}-\d{2}$/) ? 'T12:00:00' : ''));
      range.setValue(data || novo);
    } else {
      range.setValue(novo === null || novo === undefined ? '' : novo);
    }

    const novoTexto = texto_(range.getValue());
    if (normalizar_(anteriorTexto) !== normalizar_(novoTexto)) {
      registrosHistorico.push({
        membroId: membroId,
        nomeMembro: nomeMembro,
        tipo: tipoHistoricoCampo_(campo),
        titulo: tituloHistoricoCampo_(campo, anteriorTexto, novoTexto),
        anterior: anteriorTexto,
        novo: novoTexto,
        usuario: atorNome,
        cargo: atorCargo,
        detalhe: campo === 'observacao' ? 'Observação interna alterada no Manager.' : '',
      });
    }
  });

  // Grava todos os eventos desta edição em um único setValues, em vez de
  // vários appendRow consecutivos. Isso é muito mais rápido no Apps Script.
  registrarHistoricosEmLote_(historico, registrosHistorico);
  return { membroId: membroId, atualizado: true };
}

function historicoMembro_(membroId) {
  const aba = obterAba_();
  if (!Number.isInteger(membroId) || membroId < 2 || membroId > aba.getLastRow()) {
    throw new Error('Linha de membro inválida: ' + membroId);
  }

  const headers = aba.getRange(1, 1, 1, aba.getLastColumn()).getValues()[0]
    .map(v => String(v || '').trim());
  const mapa = mapearCabecalhos_(headers);
  const linha = aba.getRange(membroId, 1, 1, aba.getLastColumn()).getValues()[0];
  const eventos = [];

  const timestamp = valorPorCampo_(linha, mapa, 'timestamp');
  const dataFicha = dataHoraISO_(timestamp);
  if (dataFicha) {
    eventos.push({
      id: 'ficha-' + membroId,
      data: dataFicha,
      tipo: 'ficha',
      titulo: 'Ficha preenchida',
      detalhe: 'Cadastro recebido pelo Google Forms.',
      valor_anterior: '',
      valor_novo: '',
      usuario: 'Google Forms',
      cargo: '',
    });
  }

  // Recupera alguns registros antigos que a versão anterior gravava em Observação Interna.
  eventosLegadosObservacao_(texto_(valorPorCampo_(linha, mapa, 'observacao')), membroId)
    .forEach(ev => eventos.push(ev));

  const hist = garantirHistorico_();
  const lastRow = hist.getLastRow();
  if (lastRow >= 2) {
    const dados = hist.getRange(2, 1, lastRow - 1, 10).getValues();
    dados.forEach((r, idx) => {
      if (Number(r[1]) !== Number(membroId)) return;
      eventos.push({
        id: texto_(r[0]) || ('hist-' + (idx + 2)),
        data: dataHoraISO_(r[2]),
        tipo: texto_(r[3]) || 'movimentacao',
        titulo: texto_(r[4]) || 'Atividade registrada',
        valor_anterior: texto_(r[5]),
        valor_novo: texto_(r[6]),
        usuario: texto_(r[7]),
        cargo: texto_(r[8]),
        detalhe: texto_(r[9]),
      });
    });
  }

  // Remove duplicatas simples (por exemplo, se um registro antigo foi importado mais de uma vez).
  const vistos = {};
  const unicos = eventos.filter(ev => {
    const chave = [ev.data, ev.tipo, ev.titulo, ev.valor_novo].join('|');
    if (vistos[chave]) return false;
    vistos[chave] = true;
    return true;
  });

  unicos.sort((a, b) => String(b.data || '').localeCompare(String(a.data || '')));
  return unicos;
}

/**
 * Registra no histórico edições manuais feitas diretamente na aba Fichas.
 * Alterações feitas pelo Web App não disparam onEdit, então não há duplicação.
 */
function onEdit(e) {
  try {
    if (!e || !e.range) return;
    const range = e.range;
    const aba = range.getSheet();
    if (aba.getName() === DUBWORKS_CONFIG.HISTORICO_ABA) return;
    if (Number(aba.getSheetId()) !== Number(DUBWORKS_CONFIG.GID_ABA)) return;
    if (range.getRow() < 2 || range.getNumRows() !== 1 || range.getNumColumns() !== 1) return;

    const headers = aba.getRange(1, 1, 1, aba.getLastColumn()).getValues()[0]
      .map(v => String(v || '').trim());
    const mapa = mapearCabecalhos_(headers);
    const coluna = range.getColumn() - 1;
    const camposMonitorados = ['nome', 'telefone', 'atendimento', 'participacao', 'status_comunidade', 'movimentacao', 'data_entrada', 'data_saida', 'observacao'];
    const campo = camposMonitorados.find(c => mapa[c] === coluna);
    if (!campo) return;

    const historico = garantirHistorico_();
    const membroId = range.getRow();
    const nomeMembro = mapa.nome !== undefined
      ? texto_(aba.getRange(membroId, mapa.nome + 1).getValue())
      : '';
    const anterior = texto_(e.oldValue || '');
    const novo = texto_(e.value || range.getValue());
    const usuario = Session.getActiveUser().getEmail() || 'Edição direta na planilha';

    registrarHistorico_(historico, {
      membroId: membroId,
      nomeMembro: nomeMembro,
      tipo: tipoHistoricoCampo_(campo),
      titulo: tituloHistoricoCampo_(campo, anterior, novo),
      anterior: anterior,
      novo: novo,
      usuario: usuario,
      cargo: 'Planilha',
      detalhe: 'Alteração realizada diretamente no Google Planilhas.',
    });

    if (campo === 'participacao' || campo === 'status_comunidade') {
      const status = normalizarParticipacao_(novo);
      const hoje = new Date();

      // Mantém Participação e a coluna legada sincronizadas nos dois sentidos.
      if (campo === 'status_comunidade' && mapa.participacao !== undefined) {
        const destino = aba.getRange(membroId, mapa.participacao + 1);
        if (status === 'nao_definido') destino.clearContent();
        else escreverOpcao_(destino, status, 'participacao');
      }
      if (
        campo === 'participacao' &&
        mapa.status_comunidade !== undefined &&
        mapa.status_comunidade !== coluna
      ) {
        aba.getRange(membroId, mapa.status_comunidade + 1)
          .setValue(status === 'nao_definido' ? '' : labelParticipacao_(status));
      }

      if (status === 'na_comunidade' && mapa.data_entrada !== undefined) {
        aba.getRange(membroId, mapa.data_entrada + 1).setValue(hoje);
        if (mapa.data_saida !== undefined) aba.getRange(membroId, mapa.data_saida + 1).clearContent();
      } else if ((status === 'saiu' || status === 'banido') && mapa.data_saida !== undefined) {
        aba.getRange(membroId, mapa.data_saida + 1).setValue(hoje);
      }
    }
  } catch (erro) {
    console.log('Falha no histórico de edição: ' + (erro && erro.message ? erro.message : erro));
  }
}

function garantirEstrutura_() {
  const aba = obterAba_();
  garantirColunasGestao_(aba);
  const hist = garantirHistorico_();
  return { aba: aba.getName(), historico: hist.getName() };
}

function obterAba_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();

  if (DUBWORKS_CONFIG.GID_ABA !== null && DUBWORKS_CONFIG.GID_ABA !== undefined) {
    const porGid = ss.getSheets().find(sheet => Number(sheet.getSheetId()) === Number(DUBWORKS_CONFIG.GID_ABA));
    if (porGid) return porGid;
  }

  if (DUBWORKS_CONFIG.NOME_ABA) {
    const fixa = ss.getSheetByName(DUBWORKS_CONFIG.NOME_ABA);
    if (!fixa) throw new Error('Aba configurada não encontrada: ' + DUBWORKS_CONFIG.NOME_ABA);
    return fixa;
  }

  const sheets = ss.getSheets();
  const nomes = ALIASES.nome.map(normalizar_);
  const telefones = ALIASES.telefone.map(normalizar_);

  const candidata = sheets.find(sheet => {
    if (sheet.getLastRow() < 1 || sheet.getLastColumn() < 1) return false;
    const qtd = Math.min(100, sheet.getLastColumn());
    const headers = sheet.getRange(1, 1, 1, qtd).getDisplayValues()[0].map(normalizar_);
    const temNome = headers.some(h => nomes.includes(h) || nomes.some(n => n.length >= 4 && h.indexOf(n) >= 0));
    const temTelefone = headers.some(h => telefones.includes(h) || telefones.some(n => n.length >= 4 && h.indexOf(n) >= 0));
    return temNome && temTelefone;
  });

  if (!candidata) {
    throw new Error('Não encontrei a aba de respostas. Confira GID_ABA ou NOME_ABA no topo do Code.gs.');
  }
  return candidata;
}

function garantirColunasGestao_(aba) {
  const headers = aba.getRange(1, 1, 1, Math.max(1, aba.getLastColumn())).getValues()[0]
    .map(v => String(v || '').trim());

  Object.keys(CAMPOS_GESTAO).forEach(campo => {
    const nome = CAMPOS_GESTAO[campo];
    if (!headers.some(h => normalizar_(h) === normalizar_(nome))) {
      const col = aba.getLastColumn() + 1;
      aba.getRange(1, col).setValue(nome);
      headers.push(nome);
    }
  });
}

function garantirHistorico_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let hist = ss.getSheetByName(DUBWORKS_CONFIG.HISTORICO_ABA);
  if (!hist) hist = ss.insertSheet(DUBWORKS_CONFIG.HISTORICO_ABA);

  const cabecalhos = [
    'ID Evento', 'Linha Membro', 'Data/Hora', 'Tipo', 'Ação',
    'Valor Anterior', 'Valor Novo', 'Usuário', 'Cargo', 'Detalhe'
  ];

  if (hist.getLastRow() === 0) {
    hist.getRange(1, 1, 1, cabecalhos.length).setValues([cabecalhos]);
    hist.setFrozenRows(1);
  } else {
    const atuais = hist.getRange(1, 1, 1, cabecalhos.length).getValues()[0];
    if (!texto_(atuais[0])) hist.getRange(1, 1, 1, cabecalhos.length).setValues([cabecalhos]);
  }
  return hist;
}

function registrarHistorico_(hist, evento) {
  const agora = new Date();
  const idEvento = Utilities.getUuid();
  hist.appendRow([
    idEvento,
    Number(evento.membroId),
    agora,
    evento.tipo || 'movimentacao',
    evento.titulo || 'Atividade registrada',
    evento.anterior || '',
    evento.novo || '',
    evento.usuario || '',
    evento.cargo || '',
    evento.detalhe || '',
  ]);
}


function registrarHistoricosEmLote_(hist, eventos) {
  if (!eventos || !eventos.length) return;
  const agora = new Date();
  const linhas = eventos.map(evento => [
    Utilities.getUuid(),
    Number(evento.membroId),
    agora,
    evento.tipo || 'movimentacao',
    evento.titulo || 'Atividade registrada',
    evento.anterior || '',
    evento.novo || '',
    evento.usuario || '',
    evento.cargo || '',
    evento.detalhe || '',
  ]);
  hist.getRange(hist.getLastRow() + 1, 1, linhas.length, 10).setValues(linhas);
}

function mapearCabecalhos_(headers) {
  const normalizados = headers.map(normalizar_);
  const mapa = {};

  Object.keys(ALIASES).forEach(campo => {
    const candidatos = ALIASES[campo].map(normalizar_);
    let idx = -1;

    for (let i = 0; i < normalizados.length && idx === -1; i++) {
      if (candidatos.indexOf(normalizados[i]) >= 0) idx = i;
    }

    if (idx === -1) {
      for (let i = 0; i < normalizados.length && idx === -1; i++) {
        if (candidatos.some(c => c.length >= 4 && normalizados[i].indexOf(c) >= 0)) idx = i;
      }
    }

    if (idx >= 0) mapa[campo] = idx;
  });

  // As colunas de gestão têm prioridade sobre perguntas do Forms com nomes parecidos.
  Object.keys(CAMPOS_GESTAO).forEach(campo => {
    const alvo = normalizar_(CAMPOS_GESTAO[campo]);
    const idx = normalizados.findIndex(h => h === alvo);
    if (idx >= 0) mapa[campo] = idx;
  });

  // A coluna legada é apenas fallback; nunca substitui Participação.
  const idxLegado = normalizados.findIndex(h => h === normalizar_('Status Comunidade'));
  if (idxLegado >= 0) mapa.status_comunidade = idxLegado;

  return mapa;
}

function valorPorCampo_(linha, mapa, campo) {
  const idx = mapa[campo];
  return idx === undefined ? '' : linha[idx];
}

function validarToken_(recebido) {
  const esperado = PropertiesService.getScriptProperties().getProperty(DUBWORKS_CONFIG.TOKEN_PROPERTY);
  if (!esperado) throw new Error('Integração ainda não configurada. Execute configurarIntegracaoDubWorks().');
  if (String(recebido || '') !== String(esperado)) throw new Error('Token de integração inválido.');
}

function responder_(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

function normalizar_(valor) {
  return String(valor || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function texto_(valor) {
  if (valor === null || valor === undefined) return '';
  if (valor instanceof Date) return Utilities.formatDate(valor, Session.getScriptTimeZone(), 'dd/MM/yyyy HH:mm:ss');
  return String(valor).trim();
}

function numeroOuNulo_(valor) {
  const n = Number(String(valor || '').replace(',', '.').replace(/[^0-9.\-]/g, ''));
  return Number.isFinite(n) && n >= 0 && n < 130 ? Math.floor(n) : null;
}

function calcularIdade_(valor) {
  const d = dataObjeto_(valor);
  if (!d) return null;
  const hoje = new Date();
  let idade = hoje.getFullYear() - d.getFullYear();
  const m = hoje.getMonth() - d.getMonth();
  if (m < 0 || (m === 0 && hoje.getDate() < d.getDate())) idade--;
  return idade >= 0 && idade < 130 ? idade : null;
}

function dataObjeto_(valor) {
  if (!valor) return null;
  if (valor instanceof Date && !isNaN(valor.getTime())) return valor;
  const s = String(valor).trim();
  let m = s.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})(?:\s+(\d{1,2}):(\d{2})(?::(\d{2}))?)?$/);
  if (m) {
    const d = new Date(
      Number(m[3]), Number(m[2]) - 1, Number(m[1]),
      Number(m[4] || 12), Number(m[5] || 0), Number(m[6] || 0)
    );
    return isNaN(d.getTime()) ? null : d;
  }
  const d = new Date(s);
  return isNaN(d.getTime()) ? null : d;
}

function dataISO_(valor) {
  const d = dataObjeto_(valor);
  if (!d) return '';
  return Utilities.formatDate(d, Session.getScriptTimeZone(), 'yyyy-MM-dd');
}

function dataHoraISO_(valor) {
  const d = dataObjeto_(valor);
  if (!d) return '';
  const tz = Session.getScriptTimeZone();
  return Utilities.formatDate(d, tz, "yyyy-MM-dd'T'HH:mm:ssXXX");
}

function normalizarParticipacao_(valor) {
  const s = normalizar_(valor);
  if (!s) return 'nao_definido';
  if (s.indexOf('ban') >= 0) return 'banido';
  if (s.indexOf('paus') >= 0) return 'pausado';
  if (s.indexOf('sai') >= 0 || s.indexOf('fora') >= 0 || s.indexOf('remov') >= 0) return 'saiu';
  if (s.indexOf('canal') >= 0) return 'somente_canais';
  if (s.indexOf('comunidade') >= 0 || s.indexOf('ativo') >= 0 || s.indexOf('dentro') >= 0) return 'na_comunidade';
  return 'nao_definido';
}

function labelParticipacao_(valor) {
  const s = normalizarParticipacao_(valor);
  if (s === 'na_comunidade') return 'Na comunidade';
  if (s === 'somente_canais') return 'Só nos canais';
  if (s === 'saiu') return 'Saiu';
  if (s === 'banido') return 'Banido';
  if (s === 'pausado') return 'Pausado';
  return '';
}

function normalizarAtendimento_(valor) {
  const s = normalizar_(valor);
  if (!s || s === 'chamar' || s.indexOf('aguard') >= 0) return 'chamar';
  if (s === '1' || s === '01' || s.indexOf('mensagem 1') >= 0 || s.indexOf('mensagem 01') >= 0) return '01';
  if (s === '2' || s === '02' || s.indexOf('mensagem 2') >= 0 || s.indexOf('mensagem 02') >= 0) return '02';
  if (s.indexOf('conclu') >= 0 || s.indexOf('finaliz') >= 0) return 'concluido';
  if (s.indexOf('erro') >= 0 || s.indexOf('falha') >= 0) return 'erro';
  return 'chamar';
}

function labelAtendimento_(valor) {
  const s = normalizarAtendimento_(valor);
  if (s === '01') return '1';
  if (s === '02') return '2';
  if (s === 'concluido') return 'Concluído';
  if (s === 'erro') return 'Erro';
  return 'Chamar';
}

function escreverOpcao_(range, canonico, tipo) {
  const validacao = range.getDataValidation();
  const opcoes = opcoesValidacao_(validacao);
  const desejado = tipo === 'participacao' ? labelParticipacao_(canonico) : labelAtendimento_(canonico);

  if (opcoes.length) {
    const alvoNorm = normalizar_(desejado);
    const canonNorm = normalizar_(canonico);
    let encontrada = opcoes.find(op => normalizar_(op) === alvoNorm);

    if (!encontrada) {
      encontrada = opcoes.find(op => {
        if (tipo === 'participacao') return normalizarParticipacao_(op) === canonico;
        return normalizarAtendimento_(op) === canonico;
      });
    }

    if (encontrada !== undefined) {
      range.setValue(encontrada);
      return;
    }
  }

  range.setValue(desejado);
}

function opcoesValidacao_(validacao) {
  if (!validacao) return [];
  const criterio = validacao.getCriteriaType();
  const args = validacao.getCriteriaValues();

  if (criterio === SpreadsheetApp.DataValidationCriteria.VALUE_IN_LIST) {
    return (args[0] || []).map(String);
  }

  if (criterio === SpreadsheetApp.DataValidationCriteria.VALUE_IN_RANGE) {
    const r = args[0];
    if (r && typeof r.getDisplayValues === 'function') {
      return r.getDisplayValues().flat().map(String).filter(Boolean);
    }
  }

  return [];
}

function idadeFaixaInconsistente_(idade, faixa) {
  if (idade === null || idade === undefined || !faixa) return false;
  const s = normalizar_(faixa);
  if (!s) return false;

  if ((s.indexOf('13') >= 0 && (s.indexOf('menos') >= 0 || s.indexOf('ate') >= 0)) || s.indexOf('13 anos ou menos') >= 0) {
    return idade > 13;
  }
  if (s.indexOf('14') >= 0 && s.indexOf('17') >= 0) {
    return idade < 14 || idade > 17;
  }
  if (s.indexOf('18') >= 0 && (s.indexOf('mais') >= 0 || s.indexOf('maior') >= 0)) {
    return idade < 18;
  }
  return false;
}

function tipoHistoricoCampo_(campo) {
  if (campo === 'atendimento') return 'atendimento';
  if (campo === 'participacao' || campo === 'status_comunidade') return 'participacao';
  if (campo === 'observacao') return 'observacao';
  if (campo === 'movimentacao') return 'movimentacao';
  return 'edicao';
}

function tituloHistoricoCampo_(campo, anterior, novo) {
  if (campo === 'atendimento') {
    const atendimento = normalizarAtendimento_(novo);
    if (atendimento === '01') return 'Atendimento avançou para 1';
    if (atendimento === '02') return 'Atendimento avançou para 2';
    if (atendimento === 'concluido') return 'Atendimento concluído';
    if (atendimento === 'erro') return 'Atendimento marcado com erro';
    return 'Marcado para chamar';
  }
  if (campo === 'participacao' || campo === 'status_comunidade') {
    const statusAnterior = normalizarParticipacao_(anterior);
    const statusNovo = normalizarParticipacao_(novo);
    if (statusNovo === 'banido') return 'Foi banido da comunidade';
    if (statusNovo === 'saiu') return 'Saiu da comunidade';
    if (statusNovo === 'pausado') return 'Participação pausada';
    if (statusNovo === 'somente_canais') return 'Passou a participar apenas pelos canais';
    if (statusNovo === 'na_comunidade') {
      if (['saiu', 'banido', 'pausado', 'somente_canais'].indexOf(statusAnterior) >= 0) {
        return 'Retornou para a comunidade';
      }
      return 'Entrou na comunidade';
    }
    return 'Participação atualizada';
  }
  if (campo === 'nome') return 'Nome atualizado';
  if (campo === 'telefone') return 'Telefone atualizado';
  if (campo === 'data_entrada') return 'Data de entrada atualizada';
  if (campo === 'data_saida') return 'Data de saída atualizada';
  if (campo === 'observacao') return 'Observação interna atualizada';
  if (campo === 'movimentacao') return 'Movimentação atualizada';
  return 'Dados do membro atualizados';
}

function eventosLegadosObservacao_(texto, membroId) {
  if (!texto) return [];
  const eventos = [];
  const regras = [
    { re: /Saiu em (\d{1,2}\/\d{1,2}\/\d{4})\.?/gi, novo: 'Saiu' },
    { re: /Banido em (\d{1,2}\/\d{1,2}\/\d{4})\.?/gi, novo: 'Banido' },
    { re: /Pausado em (\d{1,2}\/\d{1,2}\/\d{4})\.?/gi, novo: 'Pausado' },
    { re: /Retornou\/permanece na comunidade em (\d{1,2}\/\d{1,2}\/\d{4})\.?/gi, novo: 'Na comunidade' },
  ];

  regras.forEach(regra => {
    let m;
    while ((m = regra.re.exec(texto)) !== null) {
      const d = dataObjeto_(m[1]);
      eventos.push({
        id: 'legado-' + membroId + '-' + eventos.length,
        data: d ? dataHoraISO_(d) : '',
        tipo: 'participacao',
        titulo: 'Registro anterior: ' + regra.novo,
        detalhe: 'Recuperado da Observação Interna criada pela versão anterior do Manager.',
        valor_anterior: '',
        valor_novo: regra.novo,
        usuario: 'Registro anterior',
        cargo: '',
      });
    }
  });

  return eventos;
}
