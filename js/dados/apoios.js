/* Apoios setoriais que podem ser negociados durante a campanha.
 * req: ideoMin/ideoMax (posição do candidato), viab (% mínimo nas pesquisas)
 * efeito.seg: bônus de afinidade por perfil de eleitor (nacional)
 * efeito.cred: credibilidade em temas · efeito.dinheiro: doações (R$ mi)
 * dif: dificuldade da negociação (0 fácil … 1 difícil)
 * inicial: candidato pronto que já começa com o apoio */
var APOIOS = [
  { id: 'pastores', nome: 'Conselho Nacional de Pastores', curto: 'Pastores evangélicos', req: { ideoMin: 5 }, dif: 0.55,
    efeito: { seg: { evang: 0.28, jovem: -0.03 }, cred: { costumes: 5 } }, inicial: 'valente',
    desc: 'Reúne líderes das maiores denominações evangélicas. Decisivo entre os evangélicos.' },
  { id: 'catolicos', nome: 'Pastoral Social Católica', curto: 'Pastoral católica', req: { ideoMax: 35 }, dif: 0.45,
    efeito: { seg: { popular: 0.07, media: 0.03 }, cred: { social: 4 } }, inicial: null,
    desc: 'Rede de paróquias e pastorais sociais com presença em todo o país.' },
  { id: 'centrais', nome: 'Central Única dos Sindicatos', curto: 'Centrais sindicais', req: { ideoMax: -10 }, dif: 0.35,
    efeito: { seg: { popular: 0.14, jovem: 0.03, media: -0.02 }, cred: { social: 3 }, dinheiro: 2 }, inicial: 'ribeiro',
    desc: 'Maior central sindical do país. Mobiliza militância e carros de som.' },
  { id: 'agro', nome: 'Confederação do Agronegócio', curto: 'Agronegócio', req: { ideoMin: 0 }, dif: 0.5,
    efeito: { seg: { agro: 0.26, jovem: -0.03 }, cred: { economia: 4, ambiente: -6 }, dinheiro: 3 }, inicial: null,
    desc: 'Produtores rurais e cooperativas. Força no Centro-Oeste, Sul e Matopiba.' },
  { id: 'industria', nome: 'Federação Nacional das Indústrias', curto: 'Indústria', req: { ideoMin: -25, viab: 8 }, dif: 0.55,
    efeito: { seg: { media: 0.07 }, cred: { economia: 6 }, dinheiro: 8 }, inicial: null,
    desc: 'Empresariado industrial. Abre as portas de grandes doadores.' },
  { id: 'semterra', nome: 'Movimento dos Trabalhadores Sem Terra', curto: 'Sem Terra', req: { ideoMax: -40 }, dif: 0.3,
    efeito: { seg: { popular: 0.07, agro: -0.12 }, cred: { social: 3 } }, inicial: null,
    desc: 'Movimento social com forte militância. Assusta parte do eleitorado do interior.' },
  { id: 'artistas', nome: 'Manifesto de artistas e intelectuais', curto: 'Artistas', req: { ideoMax: 15 }, dif: 0.4,
    efeito: { seg: { jovem: 0.11, media: 0.04, evang: -0.03 } }, inicial: null,
    desc: 'Cantores, atores e escritores de grande visibilidade.' },
  { id: 'influencer', nome: 'Influenciador Lucas Vibe (32 mi de seguidores)', curto: 'Influenciador', req: { viab: 6 }, dif: 0.5,
    efeito: { seg: { jovem: 0.16, popular: 0.03 } }, custo: 1.5, inicial: null,
    desc: 'O maior influenciador digital do país. Exige estrutura de produção paga pela campanha.' },
  { id: 'policiais', nome: 'Federação das Associações de Policiais', curto: 'Policiais', req: { ideoMin: 20 }, dif: 0.4,
    efeito: { seg: { evang: 0.04, agro: 0.04, media: 0.03 }, cred: { seguranca: 10 } }, inicial: 'brandao',
    desc: 'Associações de policiais militares, civis e guardas municipais.' },
  { id: 'clima', nome: 'Coalizão Clima e Floresta', curto: 'Ambientalistas', req: { ideoMax: 15 }, dif: 0.35,
    efeito: { seg: { jovem: 0.09, agro: -0.08 }, cred: { ambiente: 12 } }, inicial: 'fernanda',
    desc: 'ONGs, cientistas e lideranças indígenas da Amazônia.' },
  { id: 'economistas', nome: 'Economistas do Plano Real', curto: 'Economistas', req: { ideoMin: -40, ideoMax: 45 }, dif: 0.6,
    efeito: { seg: { media: 0.07 }, cred: { economia: 12 } }, inicial: null,
    desc: 'Pais do Plano Real e ex-presidentes do Banco Central. Dão selo de responsabilidade.' },
  { id: 'mulheres', nome: 'Rede Nacional de Mulheres', curto: 'Movimento de mulheres', req: { ideoMax: 30 }, dif: 0.4,
    efeito: { seg: { popular: 0.04, media: 0.04, jovem: 0.05 } }, inicial: null,
    desc: 'Coletivos feministas e lideranças comunitárias de todo o país.' },
  { id: 'saude', nome: 'Frente Nacional da Saúde', curto: 'Profissionais de saúde', req: {}, dif: 0.45,
    efeito: { seg: { media: 0.03, popular: 0.03 }, cred: { saude: 10 } }, inicial: null,
    desc: 'Conselhos de medicina e enfermagem, sanitaristas e secretários de saúde.' },
  { id: 'estudantes', nome: 'União Nacional dos Estudantes', curto: 'Estudantes', req: { ideoMax: 0 }, dif: 0.35,
    efeito: { seg: { jovem: 0.11 }, cred: { educacao: 6 } }, inicial: null,
    desc: 'Entidade estudantil histórica, com grêmios em todas as universidades.' },
  { id: 'caminhoneiros', nome: 'Associação Nacional dos Caminhoneiros', curto: 'Caminhoneiros', req: { ideoMin: 10 }, dif: 0.45,
    efeito: { seg: { agro: 0.06, popular: 0.03 } }, inicial: null,
    desc: 'Categoria que já parou o país. Grande alcance em grupos de mensagens.' }
];

var APOIO_POR_ID = {};
APOIOS.forEach(function (a) { APOIO_POR_ID[a.id] = a; });
