# Integração Google Forms — Projetos DubWorks

Esta integração substitui a parte frágil da criação/manutenção de Forms por um **Apps Script próprio**, usando serviços nativos do Google. Ela foi feita para funcionar junto ao DubWorks Manager sem depender da Google Forms API externa para criar/copiar os formulários.

## O que ela faz

- copia um **modelo oficial de Seleção** e um **modelo oficial de Entregas**, preservando descrição e pergunta de upload;
- atualiza automaticamente os personagens **somente no formulário de Seleção**;
- o formulário de **Entregas não possui personagem**: usa Nome + Telefone + Semana/Corte;
- quando uma semana é criada/reaberta/concluída/excluída, o Manager sincroniza as opções do Forms;
- se não houver semana aberta, o formulário de Entregas fica temporariamente fechado;
- organiza uploads de Seleção por pessoa e renomeia como `[Personagem] Nome | Telefone - 01.ext`;
- aceita telefone com `+55`, DDD, hífen, espaços e outras formatações; a resolução final do personagem é feita no Manager pelo telefone + semana;
- opcionalmente move a pasta principal para a raiz **Projetos** ou **Parcerias** de acordo com o tipo do projeto;
- pode ler respostas de Seleção e Entregas diretamente pelo Apps Script, com fallback para a Edge Function antiga.

## Instalação

1. Crie um projeto novo em `script.google.com`.
2. Cole `Code.gs`.
3. Salve.
4. Execute `configurarIntegracaoDubWorks()` uma vez e copie o token exibido no log.
5. Configure os modelos executando no editor, temporariamente, uma chamada como:

```js
configurarModelosDubWorks(
  'URL_OU_ID_DO_MODELO_DE_SELECAO',
  'URL_OU_ID_DO_MODELO_DE_ENTREGAS'
);
```

Os modelos devem conter o campo **Upload de arquivo**, pois o `FormApp` não cria esse tipo de pergunta do zero.

6. A separação **Projetos / Parcerias** funciona automaticamente: o script usa a pasta-pai onde a estrutura foi criada e garante as subpastas `Projetos` e `Parcerias`. Se você quiser apontar para pastas oficiais específicas, pode configurar manualmente:

```js
configurarPastasRaizDubWorks(
  'URL_OU_ID_DA_PASTA_PROJETOS',
  'URL_OU_ID_DA_PASTA_PARCERIAS'
);
```

7. Implante como **Aplicativo da Web**:
   - executar como: você;
   - acesso: conforme a política da equipe;
   - copie a URL terminada em `/exec`.
8. No `.env.local` do Manager:

```env
VITE_DUBWORKS_FORMS_WEBAPP_URL=https://script.google.com/macros/s/SEU_DEPLOYMENT/exec
VITE_DUBWORKS_FORMS_TOKEN=SEU_TOKEN
```

9. Reinicie `npm run dev`.

## Compatibilidade

O Manager mantém fallback para a URL antiga e para a Edge Function de leitura, então a troca pode ser testada em um projeto de teste sem apagar links existentes.
