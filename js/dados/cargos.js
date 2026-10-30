/* Cargos em disputa, vagas, zonas eleitorais dos estados, tetos de gastos e
 * listas específicas das campanhas estaduais (propostas e apoios). */

var CARGOS = {
  presidente: { nome: 'Presidente da República', curto: 'Presidente', digitos: 2, abrangencia: 'nacional', majoritario: true, idadeMin: 35 },
  governador: { nome: 'Governador(a)', curto: 'Governador', digitos: 2, abrangencia: 'estadual', majoritario: true, idadeMin: 30 },
  senador:    { nome: 'Senador(a)', curto: 'Senador', digitos: 3, abrangencia: 'estadual', majoritario: true, idadeMin: 35 },
  depfed:     { nome: 'Deputado(a) federal', curto: 'Dep. federal', digitos: 4, abrangencia: 'estadual', proporcional: true, casa: 'Câmara dos Deputados', idadeMin: 21 },
  depest:     { nome: 'Deputado(a) estadual', curto: 'Dep. estadual', digitos: 5, abrangencia: 'estadual', proporcional: true, casa: 'Assembleia Legislativa', idadeMin: 21 }
};
var CARGO_IDS = ['presidente', 'governador', 'senador', 'depfed', 'depest'];

function nomeCargo(cargo, genero) {
  var n = {
    presidente: ['Presidente da República', 'Presidente da República'],
    governador: ['Governador', 'Governadora'],
    senador: ['Senador', 'Senadora'],
    depfed: ['Deputado federal', 'Deputada federal'],
    depest: ['Deputado estadual', 'Deputada estadual']
  }[cargo];
  return n[genero === 'F' ? 1 : 0];
}

/* Cadeiras da Câmara por UF (513 no total) e regra das assembleias:
 * três vezes a bancada federal até 36; acima disso, uma vaga a mais por deputado federal acima de 12. */
var VAGAS_FED = { SP: 70, MG: 53, RJ: 46, BA: 39, RS: 31, PR: 30, PE: 25, CE: 22, MA: 18, GO: 17, PA: 17, SC: 16, PB: 12, ES: 10, PI: 10,
  AL: 9, AC: 8, AM: 8, AP: 8, DF: 8, MS: 8, MT: 8, RN: 8, RO: 8, RR: 8, SE: 8, TO: 8 };
function vagasEstaduais(uf) { var f = VAGAS_FED[uf]; return f <= 12 ? 3 * f : 36 + (f - 12); }

/* Senado: em 2026 renova 2/3 (duas vagas por UF); em 2030, 1/3 (uma vaga). */
function vagasSenado(ano) { return ((ano - 2026) / 4) % 2 === 0 ? 2 : 1; }

/* Fração do eleitorado na capital e região metropolitana (aproximada). */
var FRACAO_METRO = { AC: 0.48, AL: 0.42, AP: 0.70, AM: 0.58, BA: 0.27, CE: 0.45, DF: 0.40, ES: 0.48, GO: 0.38, MA: 0.25, MT: 0.30,
  MS: 0.35, MG: 0.26, PA: 0.30, PB: 0.30, PR: 0.32, PE: 0.42, PI: 0.28, RJ: 0.74, RN: 0.38, RS: 0.38, RO: 0.30, RR: 0.65,
  SC: 0.22, SP: 0.47, SE: 0.42, TO: 0.20 };

function nomesZonas(uf) {
  if (uf === 'DF') return { metro: 'Plano Piloto e região central', interior: 'Demais regiões administrativas' };
  var e = ESTADO_POR_UF[uf];
  return { metro: (FRACAO_METRO[uf] > 0.55 ? 'Capital e Grande ' : 'Grande ') + e.capital, interior: 'Interior' };
}
var ZONAS = ['metro', 'interior'];

/* Teto de gastos estimado (R$ milhões) por cargo. */
function tetoCargo(cargo, uf, turno) {
  var el = uf ? ESTADO_POR_UF[uf].eleitores : 0;
  if (cargo === 'governador') return (2.8 + 0.7 * el) * (turno === 2 ? 1.5 : 1);
  if (cargo === 'senador') return 1.6 + 0.2 * el;
  if (cargo === 'depfed') return 3.2;
  if (cargo === 'depest') return 1.3;
  return TETO_1T + (turno === 2 ? TETO_2T : 0);
}

/* Escala de custos das ações em relação à campanha presidencial. */
function escalaCustoCargo(cargo, uf) {
  if (cargo === 'presidente') return 1;
  return tetoCargo(cargo, uf, 1) / 115 * 1.6;
}

/* Emissoras locais dos debates estaduais. */
function emissoraLocal(uf, i) {
  var nome = ESTADO_POR_UF[uf].nome;
  return ['TV Horizonte ' + nome, 'Rede Aurora ' + nome, 'TV Nacional ' + nome][i % 3];
}

/* Propostas das campanhas estaduais. cargos: quem pode lançar. zona: efeito extra por região do estado. */
var PROPOSTAS_EST = [
  { id: 'policia', nome: 'Mais policiais nas ruas e câmeras nas fardas', tema: 'seguranca', ideo: 10, cargos: ['governador'],
    seg: { media: 0.05, popular: 0.04 }, cred: { seguranca: 8 }, texto: 'Concurso para 10 mil policiais e câmeras corporais em todas as viaturas.' },
  { id: 'presidios', nome: 'Presídios de segurança máxima contra as facções', tema: 'seguranca', ideo: 50, cargos: ['governador'],
    seg: { evang: 0.05, agro: 0.04, jovem: -0.03 }, cred: { seguranca: 9 }, texto: 'Isolar os chefes das facções e retomar o controle das cadeias.' },
  { id: 'hospitais', nome: 'Hospitais regionais no interior', tema: 'saude', ideo: -5, cargos: ['governador', 'senador'], zona: { interior: 0.07 },
    seg: { popular: 0.04 }, cred: { saude: 9 }, texto: 'Ninguém vai precisar viajar 300 km para fazer uma cirurgia.' },
  { id: 'policlinicas', nome: 'Policlínicas e mutirão de cirurgias', tema: 'saude', ideo: -10, cargos: ['governador'],
    seg: { popular: 0.05, media: 0.02 }, cred: { saude: 8 }, texto: 'Especialistas e exames perto de casa, com fila zerada em dois anos.' },
  { id: 'escolaintegral', nome: 'Escola em tempo integral em todo o estado', tema: 'educacao', ideo: -5, cargos: ['governador'],
    seg: { jovem: 0.05, popular: 0.03, media: 0.02 }, cred: { educacao: 10 }, texto: 'Todas as escolas estaduais em tempo integral até o fim do mandato.' },
  { id: 'transporte', nome: 'Tarifa zero e novas linhas de metrô e BRT', tema: 'social', ideo: -25, cargos: ['governador'], zona: { metro: 0.08 },
    seg: { jovem: 0.04, popular: 0.04 }, cred: { social: 5 }, texto: 'Transporte público de qualidade e de graça para estudantes e desempregados.' },
  { id: 'estradas', nome: 'Duplicação de rodovias e estradas vicinais', tema: 'economia', ideo: 15, cargos: ['governador', 'senador'], zona: { interior: 0.07 },
    seg: { agro: 0.06 }, cred: { economia: 5 }, texto: 'Estrada boa para escoar a safra e para o povo do interior chegar à capital.' },
  { id: 'incentivos', nome: 'Incentivos fiscais para atrair indústrias', tema: 'economia', ideo: 30, cargos: ['governador'],
    seg: { media: 0.05, popular: 0.02 }, cred: { economia: 8 }, texto: 'Menos ICMS para quem gerar emprego no estado.' },
  { id: 'rendaest', nome: 'Programa estadual de renda mínima', tema: 'social', ideo: -45, cargos: ['governador'],
    seg: { popular: 0.08, media: -0.02 }, cred: { social: 8 }, texto: 'Complemento estadual para as famílias mais pobres.' },
  { id: 'agua', nome: 'Água e saneamento em todos os municípios', tema: 'saude', ideo: -10, cargos: ['governador', 'senador'], zona: { interior: 0.05 },
    seg: { popular: 0.04 }, cred: { saude: 5, social: 3 }, texto: 'Água tratada e esgoto em todas as cidades do estado.' },
  { id: 'transparencia', nome: 'Corte de cargos comissionados e transparência total', tema: 'corrupcao', ideo: 20, cargos: ['governador', 'senador'],
    seg: { media: 0.05 }, cred: { corrupcao: 8 }, texto: 'Menos indicações políticas e cada centavo na internet.' },
  { id: 'produtor', nome: 'Crédito e assistência ao pequeno produtor rural', tema: 'economia', ideo: 5, cargos: ['governador', 'senador'], zona: { interior: 0.04 },
    seg: { agro: 0.07 }, cred: { economia: 3 }, texto: 'Assistência técnica e crédito barato para quem produz alimento.' },
  { id: 'queimadas', nome: 'Combate ao desmatamento e às queimadas', tema: 'ambiente', ideo: -30, cargos: ['governador', 'senador'],
    seg: { jovem: 0.05, agro: -0.04 }, cred: { ambiente: 10 }, texto: 'Brigadas e fiscalização por satélite em todo o estado.' },
  { id: 'servidores', nome: 'Reajuste para professores e policiais', tema: 'educacao', ideo: -15, cargos: ['governador'],
    seg: { media: 0.04, popular: 0.03 }, cred: { educacao: 4, seguranca: 3 }, texto: 'Valorizar quem cuida da segurança e da educação.' },
  // bandeiras de mandato para deputados
  { id: 'emendas', nome: 'Emendas para a saúde do interior', tema: 'saude', ideo: 0, cargos: ['depfed', 'depest'], zona: { interior: 0.06 },
    seg: { popular: 0.04 }, cred: { saude: 6 }, texto: 'Ambulâncias, postos de saúde e equipamentos para os municípios.' },
  { id: 'animais', nome: 'Defesa da causa animal', tema: 'ambiente', ideo: -10, cargos: ['depfed', 'depest'],
    seg: { jovem: 0.06, media: 0.04 }, cred: { ambiente: 4 }, texto: 'Castração gratuita, hospitais veterinários públicos e fim dos maus-tratos.' },
  { id: 'bala', nome: 'Bancada da segurança: armas e polícia forte', tema: 'seguranca', ideo: 65, cargos: ['depfed', 'depest', 'senador'],
    seg: { evang: 0.05, agro: 0.06, jovem: -0.03, media: -0.02 }, cred: { seguranca: 8 }, texto: 'Direito à legítima defesa e respaldo jurídico para o policial.' },
  { id: 'familiaDep', nome: 'Defesa da família e da liberdade religiosa', tema: 'costumes', ideo: 60, cargos: ['depfed', 'depest', 'senador'],
    seg: { evang: 0.12, jovem: -0.04 }, cred: { costumes: 10 }, texto: 'Nenhuma igreja será calada e a família vem em primeiro lugar.' },
  { id: 'agroDep', nome: 'Frente parlamentar do agronegócio', tema: 'economia', ideo: 35, cargos: ['depfed', 'depest', 'senador'], zona: { interior: 0.04 },
    seg: { agro: 0.12, jovem: -0.02 }, cred: { economia: 4 }, texto: 'Segurança jurídica, crédito e infraestrutura para o campo.' },
  { id: 'educDep', nome: 'Mais verbas para escolas e universidades', tema: 'educacao', ideo: -25, cargos: ['depfed', 'depest', 'senador'],
    seg: { jovem: 0.07, media: 0.03 }, cred: { educacao: 8 }, texto: 'Educação é investimento, não gasto.' },
  { id: 'servDep', nome: 'Valorização dos servidores públicos', tema: 'economia', ideo: -20, cargos: ['depfed', 'depest'], zona: { metro: 0.03 },
    seg: { media: 0.05 }, cred: {}, texto: 'Concursos, carreira e salário digno para o funcionalismo.' },
  { id: 'comercio', nome: 'Menos impostos e burocracia para o pequeno negócio', tema: 'economia', ideo: 30, cargos: ['depfed', 'depest', 'senador'],
    seg: { media: 0.06 }, cred: { economia: 5 }, texto: 'Quem empreende não pode ser tratado como inimigo.' },
  { id: 'esporte', nome: 'Esporte e cultura nas periferias', tema: 'social', ideo: -15, cargos: ['depfed', 'depest'], zona: { metro: 0.04 },
    seg: { jovem: 0.07, popular: 0.03 }, cred: { social: 3 }, texto: 'Quadra, escolinha e oficina de cultura em cada bairro.' },
  { id: 'mulheresDep', nome: 'Combate à violência contra a mulher', tema: 'seguranca', ideo: -25, cargos: ['depfed', 'depest', 'senador'],
    seg: { jovem: 0.04, media: 0.03, popular: 0.03 }, cred: { seguranca: 3, social: 3 }, texto: 'Delegacias da mulher 24 horas e medidas protetivas que funcionam.' },
  { id: 'remedios', nome: 'Farmácia popular e remédios gratuitos', tema: 'saude', ideo: -20, cargos: ['depfed', 'depest', 'senador'],
    seg: { popular: 0.07 }, cred: { saude: 5 }, texto: 'Nenhum aposentado vai escolher entre comer e comprar remédio.' },
  { id: 'anticorrupcao', nome: 'Fim do foro privilegiado e das emendas secretas', tema: 'corrupcao', ideo: 20, cargos: ['depfed', 'depest', 'senador'],
    seg: { media: 0.06 }, cred: { corrupcao: 8 }, texto: 'Político tem que ser julgado como qualquer cidadão.' }
];
var PROPOSTA_EST_POR_ID = {};
PROPOSTAS_EST.forEach(function (p) { PROPOSTA_EST_POR_ID[p.id] = p; });

/* Apoios locais negociáveis nas campanhas estaduais.
 * efeito.zona: bônus em uma região do estado; efeito.seg: bônus por perfil de eleitor. */
var APOIOS_EST = [
  { id: 'prefCapital', nome: 'Prefeito(a) da capital', curto: 'Prefeito da capital', dif: 0.5, efeito: { zona: { metro: 0.22 } },
    desc: 'A máquina da prefeitura e o prestígio do prefeito na região metropolitana.' },
  { id: 'prefInterior', nome: 'Associação dos Municípios', curto: 'Prefeitos do interior', dif: 0.45, efeito: { zona: { interior: 0.2 } },
    desc: 'Dezenas de prefeitos do interior, com vereadores e cabos eleitorais.' },
  { id: 'vereadores', nome: 'Bancada de vereadores da capital', curto: 'Vereadores', dif: 0.35, efeito: { zona: { metro: 0.1 } }, cargos: ['depfed', 'depest', 'senador'],
    desc: 'Vereadores com base nos bairros pedem voto casa a casa.' },
  { id: 'governadorAtual', nome: 'Governador(a) do estado', curto: 'Governador', dif: 0.6, efeito: { zona: { metro: 0.12, interior: 0.15 } }, cargos: ['senador', 'depfed', 'depest', 'governador'],
    desc: 'O apoio de quem comanda o estado vale palanque, estrutura e aliados.' },
  { id: 'igrejasEst', nome: 'Conselho de Pastores do estado', curto: 'Pastores', dif: 0.5, req: { ideoMin: 0 }, efeito: { seg: { evang: 0.18, jovem: -0.02 } },
    desc: 'Líderes das maiores igrejas evangélicas do estado.' },
  { id: 'sindicatosEst', nome: 'Federação dos sindicatos de trabalhadores', curto: 'Sindicatos', dif: 0.35, req: { ideoMax: 0 }, efeito: { seg: { popular: 0.12 } },
    desc: 'Sindicatos de metalúrgicos, comerciários e servidores.' },
  { id: 'agroEst', nome: 'Federação da Agricultura do estado', curto: 'Agro', dif: 0.45, req: { ideoMin: -10 }, efeito: { seg: { agro: 0.18 }, zona: { interior: 0.04 } },
    desc: 'Produtores rurais, cooperativas e sindicatos rurais patronais.' },
  { id: 'comercioEst', nome: 'Associação Comercial e lojistas', curto: 'Comércio', dif: 0.45, efeito: { seg: { media: 0.07 }, dinheiro: 0.06 },
    desc: 'Empresários do comércio e serviços. Abre portas para doações.' },
  { id: 'policiaisEst', nome: 'Associações de policiais e bombeiros', curto: 'Policiais', dif: 0.4, req: { ideoMin: 10 }, efeito: { cred: { seguranca: 8 }, seg: { evang: 0.03 } },
    desc: 'Policiais militares, civis e bombeiros, com grande rede de famílias.' },
  { id: 'professoresEst', nome: 'Sindicato dos professores', curto: 'Professores', dif: 0.4, req: { ideoMax: 20 }, efeito: { cred: { educacao: 8 }, seg: { jovem: 0.04 } },
    desc: 'Professores das redes estadual e municipais.' },
  { id: 'idolo', nome: 'Ídolo do futebol local', curto: 'Ídolo do futebol', dif: 0.55, efeito: { seg: { jovem: 0.07, popular: 0.05 } },
    desc: 'Ex-jogador campeão e adorado pela torcida.' },
  { id: 'radialistaEst', nome: 'Radialista mais ouvido do estado', curto: 'Radialista', dif: 0.45, efeito: { seg: { popular: 0.07 }, zona: { interior: 0.05 } },
    desc: 'O programa de rádio da manhã que todo o interior escuta.' }
];
var APOIO_EST_POR_ID = {};
APOIOS_EST.forEach(function (a) { APOIO_EST_POR_ID[a.id] = a; });

/* Marqueteiros locais (campanhas estaduais). Custos proporcionais ao porte do estado. */
var MARQUETEIROS_EST = [
  { id: 'farolEst', nome: 'Agência Farol (filial)', fator: 0.14, tv: 1.2, digital: 1.0, debate: 5, desc: 'A grife nacional, com equipe dedicada ao estado.' },
  { id: 'local', nome: 'Agência local de prestígio', fator: 0.08, tv: 1.08, digital: 1.05, debate: 3, desc: 'Fez as últimas campanhas vitoriosas do estado.' },
  { id: 'digitalEst', nome: 'Coletivo digital', fator: 0.05, tv: 0.95, digital: 1.3, debate: 1, desc: 'Forte nas redes e no WhatsApp. TV modesta.' },
  { id: 'proprio', nome: 'Equipe própria', fator: 0.015, tv: 0.85, digital: 0.85, debate: 0, desc: 'Amigos e militância. Quase de graça.' }
];
