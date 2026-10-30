/* Unidades da federação.
 * eleitores: eleitorado aproximado em milhões (base TSE 2022).
 * lean: inclinação ideológica média do eleitorado (-100 esquerda … +100 direita),
 *       derivada do 2º turno presidencial de 2022.
 * evang/popular/agro/jovem: fatia de cada perfil de eleitor (o restante é classe média urbana).
 * urb: fração urbana do eleitorado (usada na ordem da apuração).
 * gov: governador(a) fictício(a) — nome, partido e aprovação (%). */
var REGIOES = {
  N: 'Norte', NE: 'Nordeste', CO: 'Centro-Oeste', SE: 'Sudeste', S: 'Sul', EX: 'Exterior'
};

var ESTADOS_BASE = [
  { uf: 'AC', nome: 'Acre', reg: 'N', capital: 'Rio Branco', eleitores: 0.60, lula22: 29.7, evang: 0.38, popular: 0.24, agro: 0.14, jovem: 0.16, urb: 0.70, gov: ['Mauro Feitosa', 'PPR', 52] },
  { uf: 'AL', nome: 'Alagoas', reg: 'NE', capital: 'Maceió', eleitores: 2.31, lula22: 58.7, evang: 0.22, popular: 0.38, agro: 0.11, jovem: 0.16, urb: 0.70, gov: ['Rafael Tenório', 'MDN', 55] },
  { uf: 'AP', nome: 'Amapá', reg: 'N', capital: 'Macapá', eleitores: 0.55, lula22: 48.6, evang: 0.36, popular: 0.27, agro: 0.05, jovem: 0.18, urb: 0.88, gov: ['Ivan Barbosa', 'UNI', 58] },
  { uf: 'AM', nome: 'Amazonas', reg: 'N', capital: 'Manaus', eleitores: 2.65, lula22: 51.1, evang: 0.36, popular: 0.28, agro: 0.05, jovem: 0.17, urb: 0.80, gov: ['Hélio Bentes', 'UNI', 47] },
  { uf: 'BA', nome: 'Bahia', reg: 'NE', capital: 'Salvador', eleitores: 11.29, lula22: 72.1, evang: 0.22, popular: 0.36, agro: 0.12, jovem: 0.15, urb: 0.70, gov: ['Marcelo Sampaio', 'FPT', 56] },
  { uf: 'CE', nome: 'Ceará', reg: 'NE', capital: 'Fortaleza', eleitores: 6.82, lula22: 70.0, evang: 0.17, popular: 0.37, agro: 0.10, jovem: 0.16, urb: 0.75, gov: ['Camila Arruda', 'FPT', 54] },
  { uf: 'DF', nome: 'Distrito Federal', reg: 'CO', capital: 'Brasília', eleitores: 2.20, lula22: 41.2, evang: 0.29, popular: 0.15, agro: 0.02, jovem: 0.15, urb: 0.97, gov: ['Rodrigo Pires', 'MDN', 49] },
  { uf: 'ES', nome: 'Espírito Santo', reg: 'SE', capital: 'Vitória', eleitores: 2.92, lula22: 42.0, evang: 0.37, popular: 0.20, agro: 0.10, jovem: 0.14, urb: 0.84, gov: ['Fábio Lorenzoni', 'PSR', 58] },
  { uf: 'GO', nome: 'Goiás', reg: 'CO', capital: 'Goiânia', eleitores: 4.93, lula22: 41.3, evang: 0.33, popular: 0.20, agro: 0.16, jovem: 0.15, urb: 0.90, gov: ['Henrique Siqueira', 'UNI', 61] },
  { uf: 'MA', nome: 'Maranhão', reg: 'NE', capital: 'São Luís', eleitores: 5.04, lula22: 71.1, evang: 0.25, popular: 0.36, agro: 0.12, jovem: 0.16, urb: 0.63, gov: ['Flávio Moreira', 'PSR', 52] },
  { uf: 'MT', nome: 'Mato Grosso', reg: 'CO', capital: 'Cuiabá', eleitores: 2.47, lula22: 34.9, evang: 0.32, popular: 0.18, agro: 0.22, jovem: 0.16, urb: 0.82, gov: ['Eduardo Bortolini', 'UNI', 63] },
  { uf: 'MS', nome: 'Mato Grosso do Sul', reg: 'CO', capital: 'Campo Grande', eleitores: 1.98, lula22: 40.5, evang: 0.31, popular: 0.18, agro: 0.18, jovem: 0.15, urb: 0.85, gov: ['Gustavo Arantes', 'PSDN', 55] },
  { uf: 'MG', nome: 'Minas Gerais', reg: 'SE', capital: 'Belo Horizonte', eleitores: 16.29, lula22: 50.2, evang: 0.25, popular: 0.26, agro: 0.12, jovem: 0.14, urb: 0.85, gov: ['Rogério Lacerda', 'AVANÇA', 51] },
  { uf: 'PA', nome: 'Pará', reg: 'N', capital: 'Belém', eleitores: 6.08, lula22: 54.8, evang: 0.34, popular: 0.32, agro: 0.10, jovem: 0.17, urb: 0.68, gov: ['Marcos Pantoja', 'MDN', 60] },
  { uf: 'PB', nome: 'Paraíba', reg: 'NE', capital: 'João Pessoa', eleitores: 3.08, lula22: 66.6, evang: 0.20, popular: 0.37, agro: 0.10, jovem: 0.16, urb: 0.75, gov: ['Rômulo Cavalcanti', 'PSR', 53] },
  { uf: 'PR', nome: 'Paraná', reg: 'S', capital: 'Curitiba', eleitores: 8.48, lula22: 37.6, evang: 0.27, popular: 0.17, agro: 0.15, jovem: 0.14, urb: 0.86, gov: ['Fernando Kloss', 'PSN', 64] },
  { uf: 'PE', nome: 'Pernambuco', reg: 'NE', capital: 'Recife', eleitores: 7.02, lula22: 66.9, evang: 0.26, popular: 0.34, agro: 0.08, jovem: 0.15, urb: 0.80, gov: ['Luciana Barros', 'PSN', 48] },
  { uf: 'PI', nome: 'Piauí', reg: 'NE', capital: 'Teresina', eleitores: 2.57, lula22: 77.0, evang: 0.14, popular: 0.40, agro: 0.13, jovem: 0.16, urb: 0.66, gov: ['Tiago Nogueira', 'FPT', 62] },
  { uf: 'RJ', nome: 'Rio de Janeiro', reg: 'SE', capital: 'Rio de Janeiro', eleitores: 12.83, lula22: 43.5, evang: 0.35, popular: 0.22, agro: 0.02, jovem: 0.14, urb: 0.97, gov: ['Marcelo Quintella', 'PPR', 38] },
  { uf: 'RN', nome: 'Rio Grande do Norte', reg: 'NE', capital: 'Natal', eleitores: 2.55, lula22: 65.1, evang: 0.20, popular: 0.36, agro: 0.09, jovem: 0.16, urb: 0.78, gov: ['Isolda Medeiros', 'FPT', 41] },
  { uf: 'RS', nome: 'Rio Grande do Sul', reg: 'S', capital: 'Porto Alegre', eleitores: 8.59, lula22: 43.6, evang: 0.21, popular: 0.17, agro: 0.14, jovem: 0.13, urb: 0.86, gov: ['Alexandre Brum', 'PSDN', 52] },
  { uf: 'RO', nome: 'Rondônia', reg: 'N', capital: 'Porto Velho', eleitores: 1.24, lula22: 29.3, evang: 0.40, popular: 0.22, agro: 0.19, jovem: 0.16, urb: 0.74, gov: ['Valdir Coimbra', 'PCN', 55] },
  { uf: 'RR', nome: 'Roraima', reg: 'N', capital: 'Boa Vista', eleitores: 0.37, lula22: 23.9, evang: 0.40, popular: 0.24, agro: 0.12, jovem: 0.18, urb: 0.76, gov: ['Edilson Sena', 'PPR', 57] },
  { uf: 'SC', nome: 'Santa Catarina', reg: 'S', capital: 'Florianópolis', eleitores: 5.49, lula22: 30.7, evang: 0.24, popular: 0.14, agro: 0.14, jovem: 0.14, urb: 0.85, gov: ['Rogério Schmitt', 'PCN', 59] },
  { uf: 'SP', nome: 'São Paulo', reg: 'SE', capital: 'São Paulo', eleitores: 34.67, lula22: 44.8, evang: 0.27, popular: 0.20, agro: 0.06, jovem: 0.14, urb: 0.96, gov: ['Bruno Toledo', 'PSN', 56] },
  { uf: 'SE', nome: 'Sergipe', reg: 'NE', capital: 'Aracaju', eleitores: 1.68, lula22: 67.2, evang: 0.20, popular: 0.37, agro: 0.10, jovem: 0.16, urb: 0.74, gov: ['Laércio Fontes', 'PSN', 54] },
  { uf: 'TO', nome: 'Tocantins', reg: 'N', capital: 'Palmas', eleitores: 1.10, lula22: 49.0, evang: 0.32, popular: 0.28, agro: 0.17, jovem: 0.16, urb: 0.79, gov: ['Cícero Ayres', 'UNI', 50] },
  { uf: 'ZZ', nome: 'Exterior', reg: 'EX', capital: '—', eleitores: 0.70, lula22: 50.0, evang: 0.18, popular: 0.05, agro: 0.00, jovem: 0.15, urb: 1.00, gov: null }
];

/* Perfis de eleitor (segmentos). off: deslocamento ideológico relativo à média do estado.
 * pesos: importância de cada tema para o segmento (soma 1). urbano: fração urbana do segmento. */
var SEGMENTOS = {
  evang:   { nome: 'Evangélicos', curto: 'Evangélicos', off: 32, urbano: 0.70,
             pesos: { economia: .15, social: .08, seguranca: .15, saude: .10, educacao: .05, corrupcao: .15, costumes: .30, ambiente: .02 } },
  popular: { nome: 'Classe popular (baixa renda)', curto: 'Popular', off: -30, urbano: 0.55,
             pesos: { economia: .20, social: .30, seguranca: .12, saude: .20, educacao: .10, corrupcao: .05, costumes: .02, ambiente: .01 } },
  media:   { nome: 'Classe média urbana', curto: 'Classe média', off: 6, urbano: 0.92,
             pesos: { economia: .25, social: .05, seguranca: .15, saude: .12, educacao: .12, corrupcao: .20, costumes: .03, ambiente: .08 } },
  agro:    { nome: 'Interior e agronegócio', curto: 'Agro/interior', off: 30, urbano: 0.15,
             pesos: { economia: .30, social: .05, seguranca: .20, saude: .08, educacao: .05, corrupcao: .15, costumes: .15, ambiente: .02 } },
  jovem:   { nome: 'Jovens (16 a 29 anos)', curto: 'Jovens', off: -18, urbano: 0.85,
             pesos: { economia: .22, social: .10, seguranca: .08, saude: .10, educacao: .22, corrupcao: .08, costumes: .05, ambiente: .15 } }
};
var SEG_IDS = ['evang', 'popular', 'media', 'agro', 'jovem'];

var TEMAS = {
  economia:  { nome: 'Economia e emprego', curto: 'Economia' },
  social:    { nome: 'Programas sociais', curto: 'Social' },
  seguranca: { nome: 'Segurança pública', curto: 'Segurança' },
  saude:     { nome: 'Saúde', curto: 'Saúde' },
  educacao:  { nome: 'Educação', curto: 'Educação' },
  corrupcao: { nome: 'Combate à corrupção', curto: 'Corrupção' },
  costumes:  { nome: 'Família e valores', curto: 'Valores' },
  ambiente:  { nome: 'Meio ambiente', curto: 'Ambiente' }
};
var TEMA_IDS = ['economia', 'social', 'seguranca', 'saude', 'educacao', 'corrupcao', 'costumes', 'ambiente'];

/* Prepara os estados: normaliza segmentos e calcula a média ideológica de cada segmento. */
var ESTADOS = (function () {
  var lista = ESTADOS_BASE.map(function (e) {
    var soma = e.evang + e.popular + e.agro + e.jovem;
    var f = soma > 0.88 ? 0.88 / soma : 1;
    var seg = {
      evang: e.evang * f, popular: e.popular * f, agro: e.agro * f, jovem: e.jovem * f
    };
    seg.media = 1 - seg.evang - seg.popular - seg.agro - seg.jovem;
    var lean = (50 - e.lula22) * 1.5;
    var offMedio = 0;
    SEG_IDS.forEach(function (g) { offMedio += seg[g] * SEGMENTOS[g].off; });
    var media = {};
    SEG_IDS.forEach(function (g) { media[g] = lean + SEGMENTOS[g].off - offMedio; });
    return {
      uf: e.uf, nome: e.nome, reg: e.reg, capital: e.capital, eleitores: e.eleitores,
      lean: lean, seg: seg, segMedia: media, urb: e.urb,
      gov: e.gov ? { nome: e.gov[0], partido: e.gov[1], aprov: e.gov[2] } : null
    };
  });
  return lista;
})();

var ESTADO_POR_UF = {};
ESTADOS.forEach(function (e) { ESTADO_POR_UF[e.uf] = e; });
var UFS = ESTADOS.map(function (e) { return e.uf; });
var UFS_MAPA = UFS.filter(function (u) { return u !== 'ZZ'; });
var TOTAL_ELEITORES = ESTADOS.reduce(function (a, e) { return a + e.eleitores; }, 0);
