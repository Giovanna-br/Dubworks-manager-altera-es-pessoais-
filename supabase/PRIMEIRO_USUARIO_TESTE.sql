-- Rode isto no SQL Editor DEPOIS de criar o mesmo e-mail em:
-- Authentication > Users > Add user
--
-- TROQUE os dois valores marcados abaixo.

insert into public.usuarios (
  nome,
  login,
  cargo,
  vinculo,
  training_status,
  acesso_projetos,
  acesso_membros,
  acesso_usuarios,
  acesso_advertencias,
  acesso_aprovacao_advertencias,
  acesso_eventos,
  acesso_aprovacao_eventos,
  acesso_projetos_finalizados,
  acesso_relatorios_projetos,
  acesso_relatorios_elenco,
  acesso_relatorios_membros,
  acesso_relatorios_entrada_saida,
  acesso_exportacoes,
  acesso_treinamentos
)
values (
  'SEU NOME',
  lower('giovanna.bribeiro0@gmail.com'),
  'diretoria',
  lower('giovanna.bribeiro0@gmail.com'),
  'nao_aplicavel',
  true, true, true, true, true, true, true, true,
  true, true, true, true, true, true
)
on conflict (login) do update set
  nome = excluded.nome,
  cargo = 'diretoria',
  vinculo = excluded.vinculo,
  acesso_projetos = true,
  acesso_membros = true,
  acesso_usuarios = true,
  acesso_advertencias = true,
  acesso_aprovacao_advertencias = true,
  acesso_eventos = true,
  acesso_aprovacao_eventos = true,
  acesso_projetos_finalizados = true,
  acesso_relatorios_projetos = true,
  acesso_relatorios_elenco = true,
  acesso_relatorios_membros = true,
  acesso_relatorios_entrada_saida = true,
  acesso_exportacoes = true,
  acesso_treinamentos = true;
