/* Eventos aleatórios. Os eventos do jogador pedem uma decisão; os demais viram notícia.
 * Cada evento pendente é salvo como { id, titulo, texto, dados } e a definição é
 * buscada em EVENTOS[id] na hora de resolver. */

function textoPorIdeologia(c, esquerda, centro, direita) {
  return c.x < -15 ? esquerda : (c.x > 15 ? direita : centro);
}

function ehSituacao(c) { return c.situacao; }

function rivalPrincipal(jogo, c) {
  var perc = jogo.percepcao || {};
  var outros = candidatosAtivos(jogo).filter(function (o) { return o.id !== c.id; });
  outros.sort(function (a, b) { return (perc[b.id] || 0) - (perc[a.id] || 0); });
  return outros[0];
}

var DESASTRES = [
  { uf: 'RS', titulo: 'Enchentes devastam cidades do Rio Grande do Sul', texto: 'Chuvas históricas deixam milhares de desabrigados no Vale do Taquari e na região metropolitana de Porto Alegre.' },
  { uf: 'PE', titulo: 'Seca severa atinge o Sertão nordestino', texto: 'Mais de 400 municípios decretam emergência. Carros-pipa não dão conta da demanda.' },
  { uf: 'AM', titulo: 'Seca extrema isola comunidades no Amazonas', texto: 'Rios em nível recorde de baixa deixam cidades sem abastecimento de alimentos e remédios.' },
  { uf: 'SP', titulo: 'Deslizamentos no litoral norte de São Paulo', texto: 'Temporal provoca deslizamentos e deixa dezenas de vítimas em São Sebastião e Ubatuba.' },
  { uf: 'BA', titulo: 'Chuvas deixam milhares de desalojados no sul da Bahia', texto: 'Rios transbordam e cidades inteiras ficam ilhadas.' },
  { uf: 'MG', titulo: 'Temporais causam mortes na Grande BH', texto: 'Defesa Civil registra dezenas de áreas de risco e famílias desalojadas.' }
];

var EVENTOS = {
  fakeNews: {
    peso: function (jogo, c) { return 1.2 + ((jogo.percepcao && jogo.percepcao[c.id]) > 15 ? 0.6 : 0); },
    criar: function (jogo, c) {
      var boato = textoPorIdeologia(c,
        'que você pretende fechar igrejas e proibir cultos',
        'que você recebeu propina de uma empreiteira',
        'que você vai acabar com o Bolsa Família e com o 13º salário');
      var seg = textoPorIdeologia(c, 'evang', 'media', 'popular');
      return { titulo: 'Notícia falsa sobre você viraliza', texto: 'Uma corrente nos aplicativos de mensagens afirma ' + boato + '. Em 24 horas, o vídeo já tem milhões de compartilhamentos.', dados: { seg: seg } };
    },
    opcoes: [
      { rotulo: 'Desmentir numa live', desc: 'Resposta rápida e direta, mas cansa e pode amplificar o boato.',
        efeito: function (jogo, c, d) {
          c.energia = Math.max(0, c.energia - 8 * escalaRitmo(jogo));
          if (chance(0.7)) { c.desgaste += 1; return 'A live alcança milhões e a checagem dos jornais confirma: o boato é falso. Dano contido.'; }
          c.desgaste += 3.5; c.segTemp[d.seg] -= 0.02;
          return 'A resposta acabou dando mais visibilidade ao boato. Parte do eleitorado continua em dúvida.';
        } },
      { rotulo: 'Acionar o TSE', desc: 'Custa R$ 300 mil em advogados. Se aceito, o conteúdo é removido.',
        disponivel: function (jogo, c) { return c.dinheiro >= 0.3; },
        efeito: function (jogo, c, d) {
          gastar(c, 0.3);
          if (chance(0.65)) { c.imagem += 0.01; return 'O TSE manda remover o conteúdo e concede direito de resposta. A imprensa destaca a decisão.'; }
          c.desgaste += 3; c.segTemp[d.seg] -= 0.02;
          return 'O TSE demora a decidir e o boato continua circulando por dias.';
        } },
      { rotulo: 'Ignorar', desc: 'Evita amplificar, mas o boato corre solto.',
        efeito: function (jogo, c, d) {
          c.desgaste += 4.5; c.segTemp[d.seg] -= 0.035;
          return 'Sem resposta, o boato se espalha entre o eleitorado ' + SEGMENTOS[d.seg].curto.toLowerCase() + '.';
        } }
    ]
  },

  operacaoPF: {
    peso: function (jogo, c) { return c.coligacao.length > 1 ? 0.8 * (1.3 - c.attr.integridade / 100) : 0; },
    criar: function (jogo, c) {
      var aliados = c.coligacao.filter(function (s) { return s !== c.partido && !(c.distanciados || []).includes(s); });
      if (!aliados.length) return null;
      var sig = escolher(aliados);
      return { titulo: 'Operação da PF atinge partido aliado', texto: 'A Polícia Federal cumpre mandados contra dirigentes do ' + sig + ', partido da sua coligação, por desvio de emendas parlamentares.', dados: { sigla: sig } };
    },
    opcoes: [
      { rotulo: 'Romper com o partido', desc: 'Mostra firmeza, mas perde a máquina do partido nos estados.',
        efeito: function (jogo, c, d) {
          c.distanciados = (c.distanciados || []).concat([d.sigla]);
          c.coligacao = c.coligacao.filter(function (s) { return s !== d.sigla; });
          jogo.partidos[d.sigla] = null;
          c.imagem += 0.04; c.cred.corrupcao = Math.min(98, c.cred.corrupcao + 5);
          for (var uf in jogo.governadores) { var g = jogo.governadores[uf]; if (g.partido === d.sigla && g.apoio === c.id && !g.fixo) g.apoio = null; }
          return 'Você anuncia o rompimento com o ' + d.sigla + '. A decisão é elogiada, mas os palanques do partido nos estados se desfazem.';
        } },
      { rotulo: 'Defender os aliados', desc: 'Mantém a aliança, mas cola o escândalo em você.',
        efeito: function (jogo, c) {
          c.desgaste += 7 + (60 - c.attr.integridade) / 10;
          return 'Ao defender os aliados, você vira alvo de reportagens e dos adversários. O desgaste é grande.';
        } },
      { rotulo: 'Ficar em silêncio', desc: 'Espera a poeira baixar.',
        efeito: function (jogo, c) { c.desgaste += 4; return 'O silêncio é cobrado nos telejornais, mas o assunto perde força em poucos dias.'; } }
    ]
  },

  desastre: {
    peso: function () { return 0.6; },
    criar: function (jogo) {
      var dz = escolher(DESASTRES);
      return { titulo: dz.titulo, texto: dz.texto + ' A tragédia domina o noticiário.', dados: { uf: dz.uf } };
    },
    opcoes: [
      { rotulo: 'Visitar a região', desc: 'R$ 300 mil e energia. Gesto forte, mas pode ser visto como uso político.',
        disponivel: function (jogo, c) { return c.dinheiro >= 0.3; },
        efeito: function (jogo, c, d) {
          gastar(c, 0.3); c.energia = Math.max(0, c.energia - 10 * escalaRitmo(jogo));
          c.presenca[d.uf] = Math.min(100, c.presenca[d.uf] + 15);
          crescerRecog(c, d.uf, 0.08);
          if (chance(0.25)) { c.desgaste += 3; return 'Sua visita é criticada como oportunista por adversários e parte da imprensa.'; }
          c.imagem += 0.05;
          return 'As imagens de você ajudando famílias atingidas comovem o país.';
        } },
      { rotulo: 'Anunciar plano emergencial', desc: 'Proposta concreta de reconstrução e prevenção.',
        efeito: function (jogo, c) {
          c.cred.saude = Math.min(98, c.cred.saude + 3); c.cred.social = Math.min(98, c.cred.social + 3);
          c.imagem += 0.025;
          return 'O plano de reconstrução é bem recebido por especialistas.';
        } },
      { rotulo: 'Nota de solidariedade', desc: 'Discreto. Evita críticas, mas não ganha nada.',
        efeito: function (jogo, c) { c.imagem += 0.005; return 'Sua nota de solidariedade passa quase despercebida.'; } }
    ]
  },

  videoAntigo: {
    peso: function (jogo, c) { return 0.7 * (1.2 - c.attr.integridade / 200); },
    criar: function (jogo, c) {
      var tema = textoPorIdeologia(c, 'elogia um ditador estrangeiro', 'faz piada sobre nordestinos', 'faz piada sobre mulheres e minorias');
      return { titulo: 'Vídeo antigo volta a circular', texto: 'Um vídeo de 2014 em que você ' + tema + ' viraliza nas redes. Adversários exploram o caso.', dados: {} };
    },
    opcoes: [
      { rotulo: 'Pedir desculpas', desc: 'Reconhece o erro. Custa pouco, mas parece fraqueza para a base.',
        efeito: function (jogo, c) { c.desgaste += 2; c.imagem -= 0.01; return 'O pedido de desculpas encerra o assunto em poucos dias.'; } },
      { rotulo: 'Dobrar a aposta', desc: 'Inflama a base, mas afasta o eleitor moderado.',
        efeito: function (jogo, c) {
          c.desgaste += 4; c.base = Math.min(1.2, (c.base || 0) + 0.05);
          return 'Sua base vibra, mas o eleitor moderado se afasta.';
        } },
      { rotulo: 'Dizer que é montagem', desc: 'Se colar, o caso morre. Se não colar, vira escândalo.',
        efeito: function (jogo, c) {
          if (chance(0.45)) return 'A tese da montagem confunde o debate e o caso perde força.';
          c.desgaste += 9;
          return 'A perícia confirma que o vídeo é autêntico. A mentira vira um escândalo maior que o vídeo.';
        } }
    ]
  },

  dolar: {
    peso: function (jogo, c) { return c.x < -20 && (jogo.percepcao && jogo.percepcao[c.id]) > 18 ? 1.1 : 0; },
    criar: function () {
      return { titulo: 'Dólar dispara e mercado reage à sua fala', texto: 'Após você criticar o Banco Central, o dólar sobe 3% e a bolsa despenca. Analistas falam em "risco eleitoral".', dados: {} };
    },
    opcoes: [
      { rotulo: 'Carta de compromisso fiscal', desc: 'Acalma o mercado e a classe média, frustra parte da base.',
        efeito: function (jogo, c) { c.cred.economia = Math.min(98, c.cred.economia + 6); c.segAff.media += 0.03; c.segAff.popular -= 0.015; return 'A carta acalma o mercado. O dólar recua e economistas elogiam o gesto.'; } },
      { rotulo: 'Bater no mercado', desc: 'Discurso popular, mas assusta a classe média.',
        efeito: function (jogo, c) { c.cred.economia = Math.max(5, c.cred.economia - 4); c.segAff.popular += 0.03; c.segAff.media -= 0.04; return '"Quem manda no país é o povo, não a Faria Lima", você responde. A base aplaude.'; } }
    ]
  },

  vicePolemica: {
    peso: function (jogo, c) { return c.vice && VICES[c.vice] ? VICES[c.vice].risco * 2.2 : 0; },
    criar: function (jogo, c) {
      var v = VICES[c.vice];
      return { titulo: 'Seu vice causa polêmica', texto: v.nome + ' diz em entrevista que, se dependesse ' + (v.genero === 'F' ? 'dela' : 'dele') + ', o 13º salário e as férias "seriam revistos". A frase domina o noticiário.', dados: {} };
    },
    opcoes: [
      { rotulo: 'Desautorizar publicamente', desc: 'Corta o mal pela raiz, mas expõe a divisão na chapa.',
        efeito: function (jogo, c) { c.desgaste += 1.5; c.imagem -= 0.01; return 'Você desautoriza a declaração. O vice pede desculpas e o assunto esfria.'; } },
      { rotulo: 'Defender o vice', desc: 'Mantém a unidade, mas assume a frase.',
        efeito: function (jogo, c) { c.desgaste += 6; c.segAff.popular -= 0.03; return 'Ao defender o vice, a frase passa a ser sua. Adversários exploram o caso na TV.'; } },
      { rotulo: 'Dizer que foi tirada de contexto', desc: 'Meio-termo.',
        efeito: function (jogo, c) { c.desgaste += 3; return 'A explicação convence só em parte.'; } }
    ]
  },

  doacaoSuspeita: {
    peso: function (jogo, c) { return c.suspeitaDoacao ? 2.5 : 0; },
    criar: function (jogo, c) {
      var v = c.suspeitaDoacao;
      return { titulo: 'Doador da campanha é investigado', texto: 'Um empresário que doou ' + fmtDinheiro(v) + ' à sua campanha é alvo de operação por fraude em licitações.', dados: { valor: v } };
    },
    opcoes: [
      { rotulo: 'Devolver a doação', desc: 'Perde o dinheiro, mas encerra o caso.',
        efeito: function (jogo, c, d) { c.dinheiro -= d.valor; c.suspeitaDoacao = 0; c.desgaste += 1; return 'Você devolve ' + fmtDinheiro(d.valor) + '. O gesto é elogiado.'; } },
      { rotulo: 'Manter e dizer que está tudo declarado', desc: 'Arriscado.',
        efeito: function (jogo, c) {
          c.suspeitaDoacao = 0;
          if (chance(0.55)) { c.desgaste += 9; c.cred.corrupcao = Math.max(5, c.cred.corrupcao - 8); return 'Novas reportagens ligam o doador a desvios. O caso vira escândalo.'; }
          return 'A doação está regular e o caso perde força.';
        } }
    ]
  },

  aliadoAmeaca: {
    peso: function (jogo, c) {
      var share = (jogo.percepcao && jogo.percepcao[c.id]) || 0;
      var fisios = c.coligacao.filter(function (s) { return s !== c.partido && PARTIDO_POR_SIGLA[s].fisio > 0.6; });
      return share < 9 && fisios.length && jogo.dia > 14 ? 1.3 : 0;
    },
    criar: function (jogo, c) {
      var fisios = c.coligacao.filter(function (s) { return s !== c.partido && PARTIDO_POR_SIGLA[s].fisio > 0.6; });
      var sig = escolher(fisios);
      return { titulo: sig + ' ameaça liberar seus filiados', texto: 'Com você estagnado nas pesquisas, dirigentes do ' + sig + ' dizem que vão liberar candidatos a governador e deputado para apoiar quem quiserem.', dados: { sigla: sig } };
    },
    opcoes: [
      { rotulo: 'Oferecer mais espaço no futuro governo', desc: 'Segura o partido, mas a imprensa fala em fisiologismo.',
        efeito: function (jogo, c) { c.desgaste += 2.5; return 'O partido recua da ameaça. Colunistas criticam a negociação de cargos.'; } },
      { rotulo: 'Deixar o partido seguir seu rumo', desc: 'Perde a capilaridade do partido nos estados.',
        efeito: function (jogo, c, d) {
          c.distanciados = (c.distanciados || []).concat([d.sigla]);
          c.coligacao = c.coligacao.filter(function (s) { return s !== d.sigla; });
          jogo.partidos[d.sigla] = null;
          for (var uf in jogo.governadores) { var g = jogo.governadores[uf]; if (g.partido === d.sigla && g.apoio === c.id && !g.fixo) g.apoio = null; }
          return 'O ' + d.sigla + ' libera seus filiados. Vários palanques estaduais se desfazem.';
        } }
    ]
  },

  celebridade: {
    peso: function (jogo, c) { return 0.6 + ((jogo.percepcao && jogo.percepcao[c.id]) > 10 ? 0.4 : 0); },
    criar: function (jogo, c) {
      var quem = c.x < 0 ? 'A cantora Ana Clara, maior fenômeno do pop nacional,' : 'O sertanejo Diego Prates, recordista de streams,';
      return { titulo: 'Celebridade declara voto em você', texto: quem + ' publica vídeo declarando voto em ' + c.urna + '.', dados: {} };
    },
    opcoes: [
      { rotulo: 'Convidar para um grande ato', desc: 'R$ 500 mil de estrutura. Grande alcance entre jovens.',
        disponivel: function (jogo, c) { return c.dinheiro >= 0.5; },
        efeito: function (jogo, c) { gastar(c, 0.5); c.segTemp.jovem += 0.06; c.segTemp.popular += 0.025; c.imagem += 0.04; return 'O ato com show reúne uma multidão e domina as redes no fim de semana.'; } },
      { rotulo: 'Agradecer nas redes', desc: 'Sem custo.',
        efeito: function (jogo, c) { c.segTemp.jovem += 0.03; return 'Seu agradecimento tem milhões de curtidas.'; } }
    ]
  },

  saude: {
    peso: function (jogo, c) { return c.energia < 18 ? 6 : 0; },
    criar: function () {
      return { titulo: 'Mal-estar durante a agenda', texto: 'Você passa mal no fim de um comício e é levado a um hospital. Os médicos recomendam repouso absoluto.', dados: {} };
    },
    opcoes: [
      { rotulo: 'Repousar por alguns dias', desc: 'Recupera a energia, mas a agenda fica mais curta.',
        efeito: function (jogo, c) { c.energia = Math.min(100, c.energia + 45); c.repouso = jogo.config.ritmo === 'diario' ? 4 : 2; c.imagem += 0.01; return 'Você cancela parte da agenda. Mensagens de apoio chegam de todo o país.'; } },
      { rotulo: 'Ignorar os médicos', desc: 'Mantém a agenda, com risco.',
        efeito: function (jogo, c) {
          c.energia = Math.min(100, c.energia + 8);
          if (chance(0.35)) { c.repouso = jogo.config.ritmo === 'diario' ? 6 : 3; c.desgaste += 2; return 'Você volta a passar mal e é internado. A campanha fica dias sem o candidato.'; }
          return 'Você segue a agenda, visivelmente cansado.';
        } }
    ]
  },

  podcast: {
    peso: function () { return 0.7; },
    criar: function () {
      return { titulo: 'Convite para o maior podcast do país', texto: 'O "Papo Sem Filtro", com 15 milhões de inscritos, convida você para uma entrevista de quatro horas ao vivo.', dados: {} };
    },
    opcoes: [
      { rotulo: 'Aceitar', desc: 'Grande alcance entre os jovens. Quatro horas ao vivo são um teste de fogo.',
        efeito: function (jogo, c) {
          c.energia = Math.max(0, c.energia - 6 * escalaRitmo(jogo));
          var rolagem = (c.attr.oratoria + c.attr.carisma) / 2 + randn() * 18;
          if (rolagem > 52) {
            c.segTemp.jovem += 0.06; c.imagem += 0.05;
            UFS.forEach(function (u) { crescerRecog(c, u, 0.03); });
            return 'A entrevista bate recorde de audiência e trechos seus viralizam positivamente.';
          }
          c.desgaste += 5;
          return 'Você se enrola em perguntas sobre economia e os cortes da entrevista viram munição para os adversários.';
        } },
      { rotulo: 'Recusar', desc: 'Evita riscos.',
        efeito: function (jogo, c) { c.segTemp.jovem -= 0.01; return 'O apresentador lamenta sua ausência ao vivo. Seus adversários aproveitam.'; } }
    ]
  },

  dossie: {
    peso: function (jogo, c) { return jogo.dia > 10 ? 0.6 : 0; },
    criar: function (jogo, c) {
      var r = rivalPrincipal(jogo, c);
      if (!r) return null;
      return { titulo: 'Dossiê contra adversário chega à campanha', texto: 'Um ex-assessor de ' + r.urna + ' oferece documentos que supostamente comprovam caixa dois na campanha adversária. A origem é duvidosa.', dados: { alvo: r.id } };
    },
    opcoes: [
      { rotulo: 'Usar o material', desc: 'Pode ferir o rival, mas a origem pode virar escândalo.',
        efeito: function (jogo, c, d) {
          var r = candPorId(jogo, d.alvo);
          if (chance(0.32)) { c.desgaste += 10; return 'A imprensa descobre que o dossiê foi obtido ilegalmente. O escândalo agora é seu.'; }
          r.desgaste += 9; c.desgaste += 2;
          return 'As denúncias contra ' + r.urna + ' dominam o noticiário.';
        } },
      { rotulo: 'Entregar à Polícia Federal', desc: 'Postura republicana.',
        efeito: function (jogo, c) { c.imagem += 0.02; c.cred.corrupcao = Math.min(98, c.cred.corrupcao + 3); return 'Você entrega o material à PF. A atitude é elogiada por editoriais.'; } }
    ]
  },

  queimadas: {
    peso: function () { return 0.5; },
    criar: function (jogo) {
      jogo.saliencia.ambiente = 1.8; jogo.salienciaAte = jogo.salienciaAte || {}; jogo.salienciaAte.ambiente = jogo.dia + 14;
      return { titulo: 'Queimadas na Amazônia batem recorde', texto: 'A fumaça chega às capitais do Sul e do Sudeste. O meio ambiente vira tema central da campanha.', dados: {} };
    },
    opcoes: [
      { rotulo: 'Anunciar plano de combate', desc: 'Ganha credibilidade ambiental, irrita parte do agro.',
        efeito: function (jogo, c) { c.cred.ambiente = Math.min(98, c.cred.ambiente + 7); c.segAff.agro -= 0.025; return 'Seu plano com brigadas e fiscalização por satélite é elogiado por cientistas.'; } },
      { rotulo: 'Visitar o Pará', desc: 'Presença forte na região Norte.',
        efeito: function (jogo, c) { c.presenca.PA = Math.min(100, c.presenca.PA + 12); c.cred.ambiente = Math.min(98, c.cred.ambiente + 4); return 'Você sobrevoa áreas queimadas e conversa com brigadistas.'; } },
      { rotulo: 'Defender os produtores rurais', desc: 'Agrada o agro, desagrada jovens e classe média.',
        efeito: function (jogo, c) { c.segAff.agro += 0.05; c.segAff.jovem -= 0.035; c.cred.ambiente = Math.max(5, c.cred.ambiente - 5); return '"O produtor não é bandido", você diz. O agro aplaude; ambientalistas reagem.'; } }
    ]
  },

  liderReligioso: {
    peso: function (jogo, c) { return c.x < -10 ? 0.9 : 0; },
    criar: function () {
      return { titulo: 'Pastor influente critica sua candidatura', texto: 'Em culto transmitido para milhões, um dos pastores mais influentes do país diz que votar em você é "votar contra a família".', dados: {} };
    },
    opcoes: [
      { rotulo: 'Carta aos evangélicos', desc: 'Compromisso com a liberdade religiosa.',
        efeito: function (jogo, c) { c.segAff.evang += 0.04; c.segAff.jovem -= 0.01; return 'A carta é lida em igrejas e reduz a resistência entre evangélicos.'; } },
      { rotulo: 'Visitar uma grande igreja', desc: 'Gesto de aproximação.',
        efeito: function (jogo, c) { c.segTemp.evang += 0.05; c.energia = Math.max(0, c.energia - 5 * escalaRitmo(jogo)); return 'Você é recebido em uma grande igreja da periferia de São Paulo.'; } },
      { rotulo: 'Denunciar intolerância', desc: 'Mobiliza progressistas, afasta religiosos.',
        efeito: function (jogo, c) { c.segAff.jovem += 0.03; c.segAff.evang -= 0.05; return 'Seu discurso contra o uso político da fé repercute entre jovens.'; } }
    ]
  },

  greve: {
    peso: function () { return 0.45; },
    criar: function (jogo) {
      jogo.aprovacao = clamp(jogo.aprovacao - 2.5, 15, 75);
      return { titulo: 'Caminhoneiros ameaçam greve nacional', texto: 'Com o diesel em alta, caminhoneiros bloqueiam rodovias em 12 estados. Postos começam a ficar sem combustível.', dados: {} };
    },
    opcoes: [
      { rotulo: 'Apoiar as reivindicações', desc: 'Agrada caminhoneiros e o interior.',
        efeito: function (jogo, c) { c.segAff.agro += 0.03; c.segAff.popular += 0.015; c.cred.economia = Math.max(5, c.cred.economia - 2); return 'Você defende redução do diesel. Lideranças da greve elogiam.'; } },
      { rotulo: 'Defender a negociação', desc: 'Postura moderada.',
        efeito: function (jogo, c) { c.imagem += 0.01; c.segAff.media += 0.015; return 'Você pede diálogo e propõe uma mesa de negociação.'; } },
      { rotulo: 'Culpar o governo', desc: 'Só faz sentido se você é oposição.',
        disponivel: function (jogo, c) { return !c.situacao; },
        efeito: function (jogo, c) { jogo.aprovacao = clamp(jogo.aprovacao - 1, 15, 75); c.imagem += 0.015; return 'Você responsabiliza o governo pela crise. A oposição ganha o debate do dia.'; } }
    ]
  },

  crime: {
    peso: function () { return 0.5; },
    criar: function (jogo) {
      jogo.saliencia.seguranca = 1.7; jogo.salienciaAte = jogo.salienciaAte || {}; jogo.salienciaAte.seguranca = jogo.dia + 12;
      return { titulo: 'Crime bárbaro choca o país', texto: 'Um ataque de facção a um ônibus no Rio deixa vítimas. Segurança pública passa a liderar as preocupações do eleitor.', dados: {} };
    },
    opcoes: [
      { rotulo: 'Defender penas mais duras', desc: 'Agrada conservadores.',
        efeito: function (jogo, c) { c.cred.seguranca = Math.min(98, c.cred.seguranca + 5); c.segAff.evang += 0.02; c.segAff.agro += 0.02; c.segAff.jovem -= 0.02; return 'Você promete endurecer o Código Penal. A proposta é bem recebida pelo eleitor conservador.'; } },
      { rotulo: 'Propor polícia integrada', desc: 'Resposta técnica.',
        efeito: function (jogo, c) { c.cred.seguranca = Math.min(98, c.cred.seguranca + 4); c.segAff.media += 0.02; return 'Especialistas elogiam sua proposta de integração das polícias.'; } },
      { rotulo: 'Pedir para não politizar', desc: 'Discreto.',
        efeito: function (jogo, c) { c.imagem += 0.01; return 'Você presta solidariedade às vítimas e evita explorar o caso.'; } }
    ]
  }
};

/* Sorteia eventos de decisão para o jogador no início de um turno. */
function sortearEventosJogador(jogo, dias) {
  var c = jogador(jogo);
  if (!c || !c.ativo) return [];
  var lambda = 0.085 * dias;
  var n = 0, L = Math.exp(-lambda), p = 1;
  do { n++; p *= rand(); } while (p > L);
  n = Math.min(2, n - 1);
  if (c.energia < 18) n = Math.max(n, 1);
  var ja = jogo.eventosUsados || (jogo.eventosUsados = {});
  var lista = [];
  for (var i = 0; i < n; i++) {
    var ids = Object.keys(EVENTOS).filter(function (id) {
      return !lista.some(function (e) { return e.id === id; }) && (ja[id] || 0) < 2;
    });
    var id = escolherPeso(ids, function (k) {
      var w = EVENTOS[k].peso(jogo, c);
      return w / (1 + 1.5 * (ja[k] || 0));
    });
    if (!id || EVENTOS[id].peso(jogo, c) <= 0) continue;
    var inst = EVENTOS[id].criar(jogo, c);
    if (!inst) continue;
    inst.id = id;
    ja[id] = (ja[id] || 0) + 1;
    lista.push(inst);
  }
  return lista;
}

function resolverEvento(jogo, inst, idx) {
  var c = jogador(jogo);
  var op = EVENTOS[inst.id].opcoes[idx];
  var txt = op.efeito(jogo, c, inst.dados || {});
  c.stats.eventos++;
  noticia(jogo, inst.titulo, txt, 'evento', c.id);
  return txt;
}

function opcoesDisponiveis(jogo, inst) {
  var c = jogador(jogo);
  return EVENTOS[inst.id].opcoes.map(function (op) {
    return { rotulo: op.rotulo, desc: op.desc, ok: !op.disponivel || op.disponivel(jogo, c) };
  });
}

/* Eventos automáticos de cada dia (adversários, economia). */
function eventosDiarios(jogo) {
  var dif = DIFICULDADES[jogo.config.dificuldade];
  // aprovação do governo oscila
  jogo.aprovacao = clamp(jogo.aprovacao + randn() * 0.25, 15, 75);
  if (chance(0.025)) {
    var bom = chance(0.5);
    var d = bom ? escolher([
      ['IBGE: desemprego cai ao menor nível em uma década', 2],
      ['Inflação desacelera e alimentos ficam mais baratos', 1.5],
      ['PIB cresce acima do esperado no trimestre', 1.5]
    ]) : escolher([
      ['Inflação dos alimentos dispara no mês', -2.5],
      ['Juros sobem e crédito fica mais caro', -1.5],
      ['Escândalo em ministério abala o governo', -3]
    ]);
    jogo.aprovacao = clamp(jogo.aprovacao + d[1], 15, 75);
    noticia(jogo, d[0], 'A avaliação positiva do governo vai a ' + Math.round(jogo.aprovacao) + '%.', bom ? 'economia-bom' : 'economia-ruim');
  }
  candidatosAtivos(jogo).forEach(function (c) {
    if (c.jogador) return;
    var pEsc = (100 - c.attr.integridade) / 3200 * (c.situacao ? 1.2 : 1);
    if (chance(pEsc)) {
      var forte = 5 + rand() * 6;
      c.desgaste += forte;
      noticia(jogo, escolher([
        'Reportagem revela contratos suspeitos ligados a ' + c.urna,
        'Ex-assessor acusa ' + c.urna + ' de caixa dois',
        'Áudio vazado compromete aliado próximo de ' + c.urna
      ]), 'A campanha de ' + c.urna + ' nega irregularidades.', 'escandalo', c.id);
    }
    if (chance((100 - c.attr.oratoria) / 4500)) {
      c.desgaste += 2.5;
      noticia(jogo, escolher([
        'Declaração de ' + c.urna + ' sobre aposentados gera revolta',
        c.urna + ' erra dado básico sobre o salário mínimo em entrevista',
        'Fala de ' + c.urna + ' sobre o Nordeste é criticada por governadores'
      ]), 'Adversários exploram a gafe nas redes.', 'gafe', c.id);
    }
  });
  // fim de efeitos temporários de saliência
  if (jogo.salienciaAte) {
    for (var t in jogo.salienciaAte) if (jogo.dia > jogo.salienciaAte[t]) { delete jogo.saliencia[t]; delete jogo.salienciaAte[t]; }
  }
}

function noticia(jogo, titulo, texto, tipo, candId) {
  jogo.noticias.push({ dia: jogo.dia, titulo: titulo, texto: texto || '', tipo: tipo || 'neutro', cand: candId || null });
  if (jogo.noticias.length > 400) jogo.noticias.splice(0, jogo.noticias.length - 400);
}
