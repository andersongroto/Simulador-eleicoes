/* Gerador de nomes fictícios para candidatos a governador, senador e deputado. */

var NOMES_M = ['Antônio', 'Carlos', 'José', 'João', 'Francisco', 'Paulo', 'Pedro', 'Lucas', 'Marcos', 'Luiz', 'Gabriel', 'Rafael',
  'Daniel', 'Marcelo', 'Bruno', 'Eduardo', 'Felipe', 'Rodrigo', 'Gustavo', 'Fernando', 'André', 'Fábio', 'Leonardo', 'Ricardo',
  'Sérgio', 'Roberto', 'Márcio', 'Alexandre', 'Júlio', 'Renato', 'Wellington', 'Edson', 'Cláudio', 'Raimundo', 'Sebastião',
  'Valdir', 'Gilberto', 'Otávio', 'Hugo', 'Vinícius', 'Thiago', 'Diego', 'Murilo', 'Caio', 'Henrique', 'Joaquim', 'Severino',
  'Benedito', 'Geraldo', 'Ivan', 'Jair', 'Moacir', 'Nelson', 'Osmar', 'Wagner', 'Washington', 'Adriano', 'Davi', 'Elias', 'Samuel'];
var NOMES_F = ['Maria', 'Ana', 'Francisca', 'Antônia', 'Adriana', 'Juliana', 'Márcia', 'Fernanda', 'Patrícia', 'Aline', 'Sandra',
  'Camila', 'Amanda', 'Bruna', 'Jéssica', 'Letícia', 'Júlia', 'Luciana', 'Vanessa', 'Mariana', 'Gabriela', 'Daniela', 'Renata',
  'Simone', 'Cristina', 'Tatiana', 'Rosana', 'Raquel', 'Débora', 'Eliane', 'Lúcia', 'Beatriz', 'Carolina', 'Larissa', 'Priscila',
  'Rita', 'Sônia', 'Teresa', 'Vera', 'Helena', 'Isabel', 'Joana', 'Lívia', 'Mônica', 'Nádia', 'Regina', 'Silvana', 'Tânia',
  'Zilda', 'Kátia', 'Edna', 'Gisele', 'Heloísa', 'Iara', 'Jaqueline', 'Michele', 'Natália', 'Paula', 'Rebeca', 'Sueli'];
var SOBRENOMES = ['Silva', 'Santos', 'Oliveira', 'Souza', 'Rodrigues', 'Ferreira', 'Alves', 'Pereira', 'Lima', 'Gomes', 'Costa',
  'Ribeiro', 'Martins', 'Carvalho', 'Almeida', 'Lopes', 'Soares', 'Fernandes', 'Vieira', 'Barbosa', 'Rocha', 'Dias', 'Nascimento',
  'Andrade', 'Moreira', 'Nunes', 'Marques', 'Machado', 'Mendes', 'Freitas', 'Cardoso', 'Ramos', 'Gonçalves', 'Santana', 'Teixeira',
  'Araújo', 'Pinto', 'Cavalcanti', 'Moura', 'Correia', 'Batista', 'Campos', 'Monteiro', 'Duarte', 'Coelho', 'Medeiros', 'Brito',
  'Bezerra', 'Farias', 'Queiroz', 'Siqueira', 'Pacheco', 'Tavares', 'Macedo', 'Fonseca', 'Rezende', 'Prado', 'Leite', 'Sales',
  'Bittencourt', 'Albuquerque', 'Magalhães', 'Guimarães', 'Peixoto', 'Xavier', 'Assunção', 'Barreto', 'Lacerda', 'Viana', 'Aguiar',
  'Furtado', 'Sampaio', 'Valença', 'Holanda', 'Paiva', 'Maia', 'Bastos', 'Neves', 'Torres', 'Castro', 'Pimentel', 'Matos',
  'Arruda', 'Fontes', 'Brandão', 'Vasconcelos', 'Amaral', 'Seixas', 'Lins', 'Quintela', 'Braga', 'Galvão', 'Mesquita', 'Esteves'];

/* Prefixos usados na urna, por trajetória. */
var PREFIXOS_URNA = {
  delegado: ['Delegado', 'Delegada'], militar: ['Coronel', 'Coronel'], policial: ['Sargento', 'Sargento'], capitao: ['Capitão', 'Capitã'],
  pastor: ['Pastor', 'Pastora'], padre: ['Padre', 'Irmã'], medico: ['Dr.', 'Dra.'], professor: ['Professor', 'Professora'],
  sindicalista: ['Companheiro', 'Companheira'], radialista: ['Radialista', 'Radialista'], atleta: ['Craque', 'Atleta']
};

/* Trajetórias dos candidatos gerados (governador, senador e deputados). */
var TRAJ_ESTADUAIS = {
  exprefeito:   { nome: 'Ex-prefeito(a) da capital', cred: { saude: 6, educacao: 6 }, recog: 30, seg: {} },
  deputado:     { nome: 'Deputado(a) federal', cred: {}, recog: 15, seg: {} },
  depestadual:  { nome: 'Deputado(a) estadual', cred: {}, recog: 8, seg: {} },
  senador:      { nome: 'Senador(a)', cred: { corrupcao: 2 }, recog: 25, seg: {} },
  vicegov:      { nome: 'Vice-governador(a)', cred: { economia: 4 }, recog: 18, seg: {} },
  secretario:   { nome: 'Ex-secretário(a) estadual', cred: { saude: 4, educacao: 4 }, recog: 10, seg: {} },
  empresario:   { nome: 'Empresário(a)', cred: { economia: 12 }, recog: 8, seg: { media: 0.04 } },
  delegado:     { nome: 'Delegado(a) de polícia', cred: { seguranca: 15, corrupcao: 6 }, recog: 12, seg: { evang: 0.03 } },
  militar:      { nome: 'Militar da reserva', cred: { seguranca: 14 }, recog: 8, seg: { agro: 0.03 } },
  pastor:       { nome: 'Pastor(a) evangélico(a)', cred: { costumes: 16 }, recog: 12, seg: { evang: 0.18, jovem: -0.03 } },
  medico:       { nome: 'Médico(a)', cred: { saude: 16 }, recog: 6, seg: {} },
  professor:    { nome: 'Professor(a)', cred: { educacao: 16 }, recog: 5, seg: { jovem: 0.04 } },
  sindicalista: { nome: 'Sindicalista', cred: { social: 12 }, recog: 6, seg: { popular: 0.08 } },
  radialista:   { nome: 'Radialista e apresentador(a)', cred: {}, recog: 30, seg: { popular: 0.06 } },
  atleta:       { nome: 'Ex-atleta', cred: {}, recog: 35, seg: { jovem: 0.06 } },
  produtor:     { nome: 'Produtor(a) rural', cred: { economia: 6 }, recog: 6, seg: { agro: 0.14, jovem: -0.02 } },
  ativista:     { nome: 'Ativista ambiental', cred: { ambiente: 18 }, recog: 5, seg: { jovem: 0.08, agro: -0.06 } }
};

function sortearNome(genero) {
  var lista = genero === 'F' ? NOMES_F : NOMES_M;
  var p = escolher(lista);
  var s1 = escolher(SOBRENOMES), s2 = escolher(SOBRENOMES);
  while (s2 === s1) s2 = escolher(SOBRENOMES);
  return { primeiro: p, nome: p + ' ' + s1 + ' ' + s2, ultimo: s2 };
}

/* Nome de urna no estilo brasileiro: prefixo de profissão, apelido ou nome + sobrenome. */
function nomeDeUrna(n, genero, traj) {
  var mapa = { delegado: 'delegado', militar: 'militar', pastor: 'pastor', medico: 'medico', professor: 'professor', sindicalista: 'sindicalista', radialista: 'radialista', atleta: 'atleta' };
  if (mapa[traj] && chance(0.65)) {
    var pr = PREFIXOS_URNA[mapa[traj]];
    return pr[genero === 'F' ? 1 : 0] + ' ' + n.primeiro;
  }
  if (chance(0.1)) return n.primeiro === 'José' ? 'Zé ' + n.ultimo : n.primeiro + (genero === 'F' ? ' da ' : ' do ') + escolher(['Saúde', 'Feira', 'Comunidade', 'Ônibus']);
  return chance(0.5) ? n.primeiro + ' ' + n.ultimo : n.ultimo;
}

function gerarPessoa(traj, generoForcado) {
  var genero = generoForcado || (chance(0.34) ? 'F' : 'M');
  var n = sortearNome(genero);
  return { nome: n.nome, urna: nomeDeUrna(n, genero, traj), genero: genero, idade: randInt(36, 72) };
}
