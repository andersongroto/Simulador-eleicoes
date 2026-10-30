/* Pré-candidatos fictícios. Os perfis lembram arquétipos da política brasileira,
 * mas nomes, biografias e números são inventados.
 * attr: carisma, oratoria (debates), gestao (credibilidade administrativa),
 *       articulacao (alianças), integridade (risco de escândalos)
 * recog: % do eleitorado que conhece o candidato
 * cred: credibilidade por tema (0-100)
 * cor: posição na paleta categórica (1-8)
 * estilo: comportamento da IA (propositivo, agressivo, regional) */
var CANDIDATOS_PRONTOS = [
  {
    id: 'ribeiro', nome: 'Antônio Carlos Ribeiro', urna: 'Ribeiro', genero: 'M', idade: 64, partido: 'FPT', uf: 'BA',
    trajetoria: 'governador',
    bio: 'Ex-governador da Bahia por dois mandatos e ex-ministro do Desenvolvimento Social. É o candidato do governo.',
    x: -50, attr: { carisma: 78, oratoria: 68, gestao: 70, articulacao: 76, integridade: 55 }, recog: 82, base: 1.0,
    cred: { economia: 50, social: 82, seguranca: 35, saude: 62, educacao: 62, corrupcao: 38, costumes: 36, ambiente: 58 },
    segAff: { popular: 0.15 }, situacao: true, coligacao: ['FPT', 'PSR', 'PEB'], cor: 1, estilo: 'propositivo',
    slogan: 'O Brasil que cuida de todos', vice: 'teresa'
  },
  {
    id: 'valente', nome: 'Ricardo Valente', urna: 'Valente', genero: 'M', idade: 57, partido: 'PCN', uf: 'SP',
    trajetoria: 'senador',
    bio: 'Senador por São Paulo e ex-ministro da Justiça. Lidera a oposição conservadora ao governo.',
    x: 60, attr: { carisma: 76, oratoria: 64, gestao: 52, articulacao: 58, integridade: 58 }, recog: 74, base: 0.95,
    cred: { economia: 58, social: 35, seguranca: 78, saude: 42, educacao: 40, corrupcao: 62, costumes: 82, ambiente: 25 },
    segAff: { evang: 0.12 }, situacao: false, coligacao: ['PCN', 'PPR', 'RNV'], cor: 2, estilo: 'agressivo',
    slogan: 'Ordem, família e liberdade', vice: 'prado'
  },
  {
    id: 'albuquerque', nome: 'Sérgio Albuquerque', urna: 'Albuquerque', genero: 'M', idade: 68, partido: 'PTD', uf: 'CE',
    trajetoria: 'governador',
    bio: 'Ex-governador do Ceará e ex-ministro da Fazenda. Disputa a Presidência pela terceira vez com um projeto nacional-desenvolvimentista.',
    x: -28, attr: { carisma: 58, oratoria: 86, gestao: 72, articulacao: 40, integridade: 74 }, recog: 52, base: 0.15,
    cred: { economia: 70, social: 62, seguranca: 50, saude: 55, educacao: 70, corrupcao: 60, costumes: 40, ambiente: 50 },
    segAff: { media: 0.05 }, situacao: false, coligacao: ['PTD'], cor: 3, estilo: 'agressivo',
    slogan: 'Um projeto para o Brasil', vice: 'anapaula'
  },
  {
    id: 'helena', nome: 'Helena Vasconcelos', urna: 'Helena', genero: 'F', idade: 55, partido: 'MDN', uf: 'MS',
    trajetoria: 'senador',
    bio: 'Senadora por Mato Grosso do Sul, ex-prefeita de Campo Grande. Aposta na terceira via e no diálogo.',
    x: 8, attr: { carisma: 60, oratoria: 76, gestao: 70, articulacao: 66, integridade: 86 }, recog: 36, base: 0.1,
    cred: { economia: 60, social: 58, seguranca: 52, saude: 66, educacao: 66, corrupcao: 70, costumes: 50, ambiente: 55 },
    segAff: { media: 0.08 }, situacao: false, coligacao: ['MDN', 'PSDN'], cor: 4, estilo: 'propositivo',
    slogan: 'Unir para reconstruir', vice: 'paiva'
  },
  {
    id: 'teixeira', nome: 'Marcos Teixeira', urna: 'Teixeira', genero: 'M', idade: 51, partido: 'UNI', uf: 'PR',
    trajetoria: 'governador',
    bio: 'Ex-governador do Paraná, bem avaliado como gestor. Tenta romper a polarização pelo centro-direita.',
    x: 32, attr: { carisma: 54, oratoria: 56, gestao: 80, articulacao: 72, integridade: 70 }, recog: 30, base: 0.1,
    cred: { economia: 72, social: 45, seguranca: 62, saude: 60, educacao: 58, corrupcao: 55, costumes: 55, ambiente: 40 },
    segAff: { agro: 0.08 }, situacao: false, coligacao: ['UNI'], cor: 5, estilo: 'regional',
    slogan: 'Gestão que funciona', vice: 'leal'
  },
  {
    id: 'fernanda', nome: 'Fernanda Lins', urna: 'Fernanda', genero: 'F', idade: 38, partido: 'PLS', uf: 'RJ',
    trajetoria: 'deputado',
    bio: 'Deputada federal pelo Rio de Janeiro, a mais votada do estado. Forte nas redes sociais e entre os jovens.',
    x: -80, attr: { carisma: 76, oratoria: 76, gestao: 40, articulacao: 44, integridade: 82 }, recog: 24, base: 0.25,
    cred: { economia: 35, social: 75, seguranca: 30, saude: 60, educacao: 68, corrupcao: 62, costumes: 25, ambiente: 85 },
    segAff: { jovem: 0.15 }, situacao: false, coligacao: ['PLS'], cor: 6, estilo: 'agressivo',
    slogan: 'Coragem para mudar', vice: 'jaqueline'
  },
  {
    id: 'castro', nome: 'Paulo Henrique Castro', urna: 'PH Castro', genero: 'M', idade: 49, partido: 'AVANÇA', uf: 'SP',
    trajetoria: 'empresario',
    bio: 'Empresário do setor de tecnologia, estreante na política. Defende Estado mínimo e privatizações.',
    x: 56, attr: { carisma: 50, oratoria: 62, gestao: 76, articulacao: 34, integridade: 80 }, recog: 14, base: 0.1,
    cred: { economia: 80, social: 30, seguranca: 55, saude: 45, educacao: 55, corrupcao: 70, costumes: 50, ambiente: 35 },
    segAff: { media: 0.1 }, situacao: false, coligacao: ['AVANÇA'], cor: 7, estilo: 'propositivo',
    slogan: 'Menos Estado, mais Brasil', vice: 'kuster'
  },
  {
    id: 'brandao', nome: 'Augusto Brandão', urna: 'Coronel Brandão', genero: 'M', idade: 60, partido: 'MPT', uf: 'GO',
    trajetoria: 'militar',
    bio: 'Coronel da reserva da Polícia Militar e deputado estadual em Goiás. Discurso linha-dura contra o crime.',
    x: 86, attr: { carisma: 64, oratoria: 44, gestao: 34, articulacao: 30, integridade: 48 }, recog: 10, base: 0.3,
    cred: { economia: 40, social: 25, seguranca: 85, saude: 30, educacao: 30, corrupcao: 66, costumes: 80, ambiente: 15 },
    segAff: { evang: 0.05 }, situacao: false, coligacao: ['MPT'], cor: 8, estilo: 'agressivo',
    slogan: 'Bandido bom é bandido preso', vice: 'gilmar'
  }
];

/* Trajetórias para quem cria o próprio candidato. */
var TRAJETORIAS = {
  governador: { nome: 'Ex-governador(a)', desc: 'Experiência de gestão e forte reduto no estado de origem.',
    attr: { gestao: 12, articulacao: 8 }, recogNac: 12, recogUF: 45, cred: { saude: 8, educacao: 8, economia: 5 } },
  senador: { nome: 'Senador(a)', desc: 'Trânsito em Brasília e facilidade para negociar alianças.',
    attr: { articulacao: 12, oratoria: 6 }, recogNac: 8, recogUF: 35, cred: { corrupcao: 4 } },
  deputado: { nome: 'Deputado(a) federal', desc: 'Bom de tribuna e conhecido pelas pautas que defende.',
    attr: { oratoria: 10, articulacao: 4 }, recogNac: 5, recogUF: 25, cred: {} },
  prefeito: { nome: 'Prefeito(a) de capital', desc: 'Gestão visível e base forte na capital do estado.',
    attr: { gestao: 10, carisma: 4 }, recogNac: 5, recogUF: 35, cred: { saude: 6, educacao: 6 } },
  empresario: { nome: 'Empresário(a)', desc: 'Discurso de eficiência e acesso a doadores. Pouca experiência política.',
    attr: { gestao: 12, articulacao: -6 }, recogNac: 4, recogUF: 10, cred: { economia: 18 }, dinheiro: 8 },
  juiz: { nome: 'Ex-juiz(a) ou procurador(a)', desc: 'Imagem de combate à corrupção, mas pouco jogo de cintura.',
    attr: { integridade: 15, articulacao: -8 }, recogNac: 10, recogUF: 15, cred: { corrupcao: 25, seguranca: 8 } },
  militar: { nome: 'Militar ou policial da reserva', desc: 'Discurso de ordem e segurança. Atrai o eleitorado conservador.',
    attr: { gestao: 4, oratoria: -4 }, recogNac: 3, recogUF: 12, cred: { seguranca: 25, costumes: 10 }, segAff: { evang: 0.05, agro: 0.05 } },
  religioso: { nome: 'Líder religioso(a)', desc: 'Grande influência entre evangélicos e na pauta de costumes.',
    attr: { carisma: 10 }, recogNac: 6, recogUF: 15, cred: { costumes: 25 }, segAff: { evang: 0.3, jovem: -0.05 } },
  sindicalista: { nome: 'Líder sindical', desc: 'Raízes no movimento operário e forte apelo popular.',
    attr: { oratoria: 8, carisma: 4 }, recogNac: 4, recogUF: 12, cred: { social: 20, economia: 4 }, segAff: { popular: 0.15 } },
  celebridade: { nome: 'Apresentador(a) de TV', desc: 'Muito conhecido(a) e carismático(a), mas sem experiência de governo.',
    attr: { carisma: 18, gestao: -10 }, recogNac: 35, recogUF: 20, cred: { economia: -5 }, segAff: { jovem: 0.05, popular: 0.05 } },
  economista: { nome: 'Economista', desc: 'Respeitado(a) pelo mercado e técnico(a) nas propostas.',
    attr: { gestao: 10, carisma: -8 }, recogNac: 3, recogUF: 8, cred: { economia: 25 }, segAff: { media: 0.08 } },
  medico: { nome: 'Médico(a)', desc: 'Credibilidade imediata na saúde, área que mais preocupa o eleitor.',
    attr: { integridade: 5 }, recogNac: 3, recogUF: 10, cred: { saude: 25 } },
  professor: { nome: 'Professor(a) universitário(a)', desc: 'Propostas consistentes para a educação e a ciência.',
    attr: { oratoria: 6 }, recogNac: 2, recogUF: 8, cred: { educacao: 25 }, segAff: { jovem: 0.05 } },
  ambientalista: { nome: 'Ativista ambiental', desc: 'Reconhecido(a) internacionalmente na pauta do clima.',
    attr: { integridade: 6 }, recogNac: 6, recogUF: 10, cred: { ambiente: 28 }, segAff: { jovem: 0.12, agro: -0.1 } }
};

/* Candidatos(as) a vice. O partido do vice entra na coligação se ainda estiver livre. */
var VICES = {
  teresa:    { nome: 'Teresa Andrade', genero: 'F', partido: 'PSR', uf: 'PE', x: -30, perfil: 'Ex-governadora de Pernambuco',
               cred: { social: 4, educacao: 4 }, segAff: { popular: 0.04 }, risco: 0.10 },
  prado:     { nome: 'Gen. Hamilton Prado', genero: 'M', partido: 'PCN', uf: 'DF', x: 72, perfil: 'General da reserva do Exército',
               cred: { seguranca: 8 }, segAff: { agro: 0.04, media: -0.03 }, risco: 0.35 },
  rute:      { nome: 'Pastora Rute Cardoso', genero: 'F', partido: 'RNV', uf: 'RJ', x: 58, perfil: 'Pastora e deputada federal',
               cred: { costumes: 8 }, segAff: { evang: 0.15, jovem: -0.04 }, risco: 0.25 },
  otavio:    { nome: 'Otávio Mendes', genero: 'M', partido: 'PSN', uf: 'SP', x: 20, perfil: 'Empresário e ex-secretário da Fazenda paulista',
               cred: { economia: 8 }, segAff: { media: 0.05 }, risco: 0.10, dinheiro: 4 },
  josue:     { nome: 'Josué Freitas', genero: 'M', partido: 'FPT', uf: 'MG', x: -55, perfil: 'Sindicalista metalúrgico',
               cred: { social: 6 }, segAff: { popular: 0.06 }, risco: 0.15 },
  laura:     { nome: 'Laura Bittencourt', genero: 'F', partido: 'PEB', uf: 'AM', x: -35, perfil: 'Ambientalista e ex-ministra do Meio Ambiente',
               cred: { ambiente: 12 }, segAff: { jovem: 0.07, agro: -0.05 }, risco: 0.10 },
  arruda:    { nome: 'Marcos Arruda', genero: 'M', partido: 'UNI', uf: 'GO', x: 40, perfil: 'Senador ligado ao agronegócio',
               cred: { economia: 4 }, segAff: { agro: 0.14 }, risco: 0.15 },
  simone:    { nome: 'Simone Duarte', genero: 'F', partido: 'MDN', uf: 'PA', x: 10, perfil: 'Senadora e ex-prefeita de Belém',
               cred: { saude: 4 }, segAff: { media: 0.03 }, risco: 0.05 },
  paiva:     { nome: 'Carlos Eduardo Paiva', genero: 'M', partido: 'PSDN', uf: 'RS', x: 15, perfil: 'Ex-prefeito de Porto Alegre',
               cred: { educacao: 4 }, segAff: { media: 0.03 }, risco: 0.05 },
  jaqueline: { nome: 'Jaqueline Santos', genero: 'F', partido: 'PLS', uf: 'BA', x: -70, perfil: 'Professora e vereadora em Salvador',
               cred: { educacao: 8 }, segAff: { jovem: 0.06 }, risco: 0.15 },
  saad:      { nome: 'Dr. Roberto Saad', genero: 'M', partido: 'PRC', uf: 'SP', x: 25, perfil: 'Médico, ex-secretário estadual de Saúde',
               cred: { saude: 12 }, segAff: {}, risco: 0.10 },
  fatima:    { nome: 'Fátima Gonçalves', genero: 'F', partido: 'SDB', uf: 'CE', x: 0, perfil: 'Ex-prefeita de Fortaleza',
               cred: { social: 4 }, segAff: { popular: 0.04 }, risco: 0.10 },
  damasceno: { nome: 'Delegado Vítor Damasceno', genero: 'M', partido: 'PPR', uf: 'PR', x: 45, perfil: 'Delegado da Polícia Federal',
               cred: { corrupcao: 12, seguranca: 6 }, segAff: {}, risco: 0.20 },
  anapaula:  { nome: 'Ana Paula Rocha', genero: 'F', partido: 'PTD', uf: 'RS', x: -25, perfil: 'Deputada federal e economista',
               cred: { economia: 4 }, segAff: {}, risco: 0.05 },
  leal:      { nome: 'Wanderley Leal', genero: 'M', partido: 'UNI', uf: 'GO', x: 38, perfil: 'Senador por Goiás',
               cred: {}, segAff: { agro: 0.06 }, risco: 0.10 },
  kuster:    { nome: 'Beatriz Kuster', genero: 'F', partido: 'AVANÇA', uf: 'SC', x: 50, perfil: 'Engenheira e empresária',
               cred: { economia: 4 }, segAff: {}, risco: 0.05 },
  gilmar:    { nome: 'Sargento Gilmar Rocha', genero: 'M', partido: 'MPT', uf: 'RJ', x: 88, perfil: 'Policial militar e youtuber',
               cred: { seguranca: 4 }, segAff: { jovem: 0.02 }, risco: 0.30 },
  amanda:    { nome: 'Amanda Ferraz', genero: 'F', partido: 'SDB', uf: 'MG', x: 5, perfil: 'Ex-reitora da universidade federal',
               cred: { educacao: 10 }, segAff: { jovem: 0.03 }, risco: 0.05 }
};

/* Agências de marketing político disponíveis na pré-campanha. */
var MARQUETEIROS = [
  { id: 'farol', nome: 'Agência Farol', chefe: 'Renato Vilas', custo: 16, tv: 1.25, digital: 1.0, debate: 6,
    desc: 'Fez três campanhas presidenciais vitoriosas. Cara, mas a melhor TV do país.' },
  { id: 'nunes', nome: 'Nunes & Prado Comunicação', chefe: 'Cecília Nunes', custo: 9, tv: 1.1, digital: 1.05, debate: 4,
    desc: 'Equilibrada, com bom histórico em campanhas para governador.' },
  { id: 'redeviva', nome: 'Coletivo Rede Viva', chefe: 'Thiago Okada', custo: 6, tv: 0.95, digital: 1.35, debate: 2,
    desc: 'Especialistas em redes sociais e conteúdo viral. TV mais modesta.' },
  { id: 'propria', nome: 'Equipe do próprio partido', chefe: 'Coordenação partidária', custo: 1.5, tv: 0.85, digital: 0.85, debate: 0,
    desc: 'Barata, mas com pouca estrutura profissional.' }
];
