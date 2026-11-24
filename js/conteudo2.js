'use strict';
/* ==========================================================================
   SERRA SANGRENTA 2.0 · ECOS DO VALE
   Conteúdo novo: itens, armas, receitas que se descobrem explorando, saques,
   seis lugares novos no mapa, a história do Seu Dito e das crianças da escola.
   Este arquivo só acrescenta coisas: carrega depois de data.js e antes do resto.
   ========================================================================== */
let VERSION = '2.2';

/* ===================== ITENS NOVOS ===================== */
const ITEMS2 = {
  // --- materiais
  pilha: { n: 'Pilhas', ic: 'cell|#c4a446|#34363e', w: 0.05, t: 'mat', r: 1, d: 'Ainda com carga. Alimentam rádios, lanternas e coisas que dão choque.' },
  fio: { n: 'Fio de Cobre', ic: 'wire|#c8783a|#b0b4c0', w: 0.1, t: 'mat', r: 1, d: 'Arrancado de aparelhos velhos. Leva corrente de um lado a outro.' },
  cloro: { n: 'Pastilha de Cloro', ic: 'pills|#d8e4ec|#4886ac', w: 0.02, t: 'mat', r: 1, d: 'Da estação de tratamento. Uma pastilha deixa uma garrafa de água suja boa para beber, sem fogo.' },
  semente: { n: 'Sementes', ic: 'seed|#86683f|#5a7a3a', w: 0.05, t: 'mat', d: 'Milho, feijão, abóbora. Plante num canteiro e espere.' },
  // --- livros e anotações (ler ensina receitas)
  guia_escoteiro: { n: 'Guia do Escoteiro', ic: 'book|#4a6a34|#c4a446', w: 0.3, t: 'book', use: 'read', learn: 'sobrevivencia', r: 1, d: 'Nós, laços, abrigos, estilingue e comida de mato. Alguém sublinhou "nunca fique sozinho".' },
  caderno_vo: { n: 'Caderno de Receitas da Vó', ic: 'book|#8a5a3a|#e4d8b8', w: 0.3, t: 'book', use: 'read', learn: 'cozinha', r: 1, d: 'Letra redonda, manchas de gordura. Ensopado, pão de milho, torta de maçã, peixe defumado.' },
  apostila_quimica: { n: 'Apostila de Química', ic: 'book|#3a5a76|#dce4cc', w: 0.3, t: 'book', use: 'read', learn: 'quimica', r: 1, d: 'Ensino médio, Escola Estadual Alto da Serra. Alguém fez anotações bem adultas na margem.' },
  manual_armeiro: { n: 'Manual do Armeiro', ic: 'book|#34363e|#c83a3a', w: 0.4, t: 'book', use: 'read', learn: 'armeiro', r: 2, d: 'Uso restrito da Polícia Militar. Montagem, munição recarregada e manutenção.' },
  manual_obras: { n: 'Manual de Obras', ic: 'book|#c4843a|#34363e', w: 0.4, t: 'book', use: 'read', learn: 'obras', r: 1, d: 'Muros, armadilhas, chapas de aço. Capa amarela de prefeitura.' },
  revista_costura: { n: 'Revista de Moldes', ic: 'book|#a0587a|#e4dccc', w: 0.2, t: 'book', use: 'read', learn: 'costura', r: 1, d: 'Moldes de colete, mochila e jaqueta. Tem até uma página de "roupas para o fim do mundo", de brincadeira.' },
  manual_eletrica: { n: 'Manual de Eletrônica', ic: 'book|#2a5640|#c4a446', w: 0.3, t: 'book', use: 'read', learn: 'eletrica', r: 2, d: 'Circuitos simples, baterias, choque. Cheio de recortes de revista colados.' },
  // --- comida
  legume: { n: 'Legumes da Horta', ic: 'fruit|#c4843a|#58783a', w: 0.3, t: 'food', hunger: 18, thirst: 6, d: 'Abóbora, cenoura, vagem. Cresceu no seu canteiro.' },
  mel: { n: 'Mel', ic: 'honey|#e0a83a|#86683f', w: 0.3, t: 'food', hunger: 12, sanity: 8, r: 1, d: 'Mel de verdade. As abelhas do vale não ligam para o fim do mundo.' },
  chocolate: { n: 'Barra de Chocolate', ic: 'bar|#5a3a22|#c83a3a', w: 0.1, t: 'food', hunger: 14, sanity: 12, d: 'Derreteu e endureceu de novo umas dez vezes. Continua chocolate.' },
  sardinha: { n: 'Lata de Sardinha', ic: 'tin|#868a94|#4886ac', w: 0.3, t: 'food', hunger: 28, thirst: -2, d: 'O cheiro espanta até criatura.' },
  torta_maca: { n: 'Torta de Maçã', ic: 'bowl|#c4843a|#862a2a', w: 0.5, t: 'food', hunger: 55, sanity: 18, r: 1, d: 'Do caderno da vó. Por um minuto, o vale fica longe.' },
  sopa: { n: 'Sopa de Legumes', ic: 'bowl|#76583a|#c4843a', w: 0.6, t: 'food', hunger: 48, thirst: 26, hp: 10, r: 1, d: 'Quente, grossa, com gosto de domingo.' },
  peixe_defumado: { n: 'Peixe Defumado', ic: 'fish|#5a3a22|#c49c6c', w: 0.2, t: 'food', hunger: 30, thirst: -3, d: 'Dura semanas e não pesa nada.' },
  espetinho: { n: 'Espetinho', ic: 'meat|#76482a|#a8845a', w: 0.3, t: 'food', hunger: 42, sanity: 5, d: 'Carne e cogumelo num graveto. Comida de acampamento.' },
  cha_mel: { n: 'Chá com Mel', ic: 'cup|#d4ccc4|#e0a83a', w: 0.5, t: 'food', thirst: 36, hp: 14, sanity: 24, back: 'garrafa', r: 1, d: 'Erva, água quente e mel. As vozes ficam bem mais baixas.' },
  // --- medicina
  pomada: { n: 'Pomada de Ervas', ic: 'honey|#5a7a3a|#d4ccbc', w: 0.1, t: 'med', hp: 18, regen: 24, d: 'Erva amassada com resina. Arde, depois alivia.' },
  antibiotico: { n: 'Antibiótico', ic: 'pills|#e4dccc|#c83a3a', w: 0.05, t: 'med', inf: -30, r: 2, d: 'Não cura o Tecido, mas segura bem mais que o antisséptico.' },
  adrenalina: { n: 'Adrenalina', ic: 'syringe|#c4cccc|#e0c03a', w: 0.1, t: 'med', hp: 20, buff: 'adrenalina', r: 2, d: 'Fôlego infinito e pernas rápidas por 40 segundos. O coração reclama depois.' },
  // --- armas brancas
  bastao: { n: 'Taco de Beisebol', ic: 'bat|#a8845a|#3a281a', w: 1.1, t: 'melee', held: 'bat', r: 1, dmg: 19, range: 50, arc: 1.8, cd: .5, stam: 9, kb: 330, dur: 160, d: 'Do time da escola. Empurra qualquer coisa para longe.' },
  bastao_choque: { n: 'Taco de Choque', ic: 'bat|#565a64|#4ab8d8', w: 1.3, t: 'melee', held: 'bat', zap: 1, r: 2, dmg: 16, range: 50, arc: 1.8, cd: .5, stam: 8, kb: 220, dur: 170, stun: 1.1, d: 'Pilhas e fio de cobre num taco. Cada golpe paralisa por um segundo.' },
  machado_bombeiro: { n: 'Machado de Bombeiro', ic: 'axe|#c83a3a|#b0b4c0', w: 2.2, t: 'melee', held: 'axe', iron: 1, red: 1, r: 2, dmg: 34, range: 52, arc: 1.7, cd: .58, stam: 11, kb: 210, dur: 280, chop: 2.4, d: 'Feito para arrombar portas. Funciona em outras coisas também.' },
  forcado: { n: 'Forcado', ic: 'fork|#6e5238|#b0b4c0', w: 1.6, t: 'melee', held: 'fork', kind: 'thrust', r: 1, dmg: 23, range: 88, arc: .55, cd: .5, stam: 8, kb: 200, dur: 160, d: 'Três dentes de ferro. Mantém as coisas na distância certa.' },
  arpao: { n: 'Arpão do Seu Dito', ic: 'fork|#3a5a66|#c8ced8', w: 1.4, t: 'melee', held: 'fork', kind: 'thrust', iron: 1, r: 3, dmg: 36, range: 98, arc: .5, cd: .46, stam: 8, kb: 230, dur: 320, toss: 1, d: 'Cinquenta anos de rio. Botão direito arremessa.' },
  motosserra: { n: 'Motosserra', ic: 'chainsaw|#c8843a|#34363e', w: 4.5, t: 'melee', held: 'chainsaw', r: 3, dmg: 10, range: 48, arc: 1.1, cd: .1, stam: 2.5, kb: 50, dur: 520, chop: 6, d: 'Ruge, treme e não para. Corta árvore em segundos e criatura em pedaços.' },
  lanca_cristal: { n: 'Lança Abissal', ic: 'spear|#6e5238|#b088c4', w: 1.5, t: 'melee', held: 'spear', kind: 'thrust', cristal: 1, r: 3, dmg: 38, range: 90, arc: .45, cd: .45, stam: 8, kb: 210, dur: 260, toss: 1, d: 'Ponta de Cristal Abissal. O Tecido se desfaz onde ela toca: +30% de dano nas criaturas.' },
  lamina_cristal: { n: 'Lâmina Abissal', ic: 'machete|#3a281a|#b088c4', w: 1.3, t: 'melee', held: 'machete', cristal: 1, r: 3, dmg: 36, range: 56, arc: 2.1, cd: .4, stam: 8, kb: 160, dur: 280, chop: .8, d: 'Um machete com fio de cristal. +30% de dano nas criaturas.' },
  // --- armas à distância
  estilingue: { n: 'Estilingue', ic: 'sling|#6e5238|#c4ccd4', w: 0.3, t: 'ranged', held: 'sling', kind: 'gun', pebble: 1, dmg: 14, ammo: 'seixo', mag: 1, reload: .4, cd: .15, spread: .05, speed: 800, noise: 0, bolt: 1, dur: 160, d: 'Silencioso e barato. Pedrinha não acaba nunca.' },
  seixo: { n: 'Seixos', ic: 'rock|#8c898e|#b4b0b6', w: 0.05, t: 'ammo', stack: 60, d: 'Pedrinhas redondas para o estilingue.' },
  arco_composto: { n: 'Arco Composto', ic: 'bow|#34363e|#c4a446', w: 1.1, t: 'ranged', held: 'bow', kind: 'bow', r: 2, dmg: 42, ammo: 'flecha', dur: 240, d: 'Polias de ferro e corda dupla. Puxa mais forte com menos esforço.' },
  // --- arremessáveis
  granada: { n: 'Granada', ic: 'grenade|#4a5a3a|#34363e', w: 0.5, t: 'throw', r: 3, stack: 10, d: 'Do exército. Explosão bem maior que a bomba caseira.' },
  isca: { n: 'Isca Fedorenta', ic: 'bait|#983838|#86963a', w: 0.4, t: 'throw', r: 1, stack: 10, d: 'Carne e bile. As criaturas por perto largam tudo e vão atrás do cheiro por 15 segundos.' },
  // --- equipamento
  roupa_bombeiro: { n: 'Roupa de Bombeiro', ic: 'suit|#c4843a|#c4a446', w: 3.0, t: 'armor', def: .24, fireproof: 1, r: 2, d: 'Reduz o dano em 24%. O fogo não queima você.' },
  traje_hazmat: { n: 'Traje Hazmat', ic: 'suit|#d4c43a|#3a5a66', w: 2.4, t: 'armor', def: .14, hazmat: 1, r: 2, d: 'Reduz o dano em 14% e a infecção dos golpes em 60%.' },
  roupa_camuflada: { n: 'Roupa Camuflada', ic: 'vest|#4a5a34|#2a3a22', w: 1.4, t: 'armor', def: .12, camo: 1, r: 1, d: 'Reduz o dano em 12%. As criaturas demoram mais para notar você.' },
  armadura_cristal: { n: 'Armadura Abissal', ic: 'armor|#763a86|#b088c4', w: 5.5, t: 'armor', def: .52, r: 3, d: 'Reduz o dano em 52%. Placas de aço cravejadas de cristal que ainda pulsa.' },
  mochila_escoteiro: { n: 'Mochila de Escoteiro', ic: 'pack|#4a6a34|#2a4022', w: 0.8, t: 'pack', cap: 16, slots: 9, r: 1, d: '+16 kg e +9 espaços na mochila. Cheia de bottons.' },
  binoculo: { n: 'Binóculos', ic: 'binoc|#34363e|#565a64', w: 0.5, t: 'util', r: 2, d: 'Só de estar na mochila, você revela o mapa bem mais longe.' },
  mapa_regiao: { n: 'Mapa da Região', ic: 'mapa|#d4ccb4|#5a7a3a', w: 0.1, t: 'util', use: 'map', r: 1, d: 'Mapa turístico do vale. Marca todos os lugares importantes no seu mapa.' },
  // --- construção
  horta: { n: 'Canteiro', ic: 'sprout|#6e4a2c|#5a9a3a', w: 3.0, t: 'place', r: 1, d: 'Planta sozinho. Volte em um dia para colher legumes e milho. Precisa de sementes.' },
  // --- missão
  mochila_bia: { n: 'Mochila da Bia', ic: 'pack|#c84a7a|#e4b8c8', w: 0.6, t: 'quest', r: 2, d: 'Rosa, com chaveiro de peixinho. "Beatriz Rocha, 4º ano" bordado na alça.' },
  diario_vera: { n: 'Diário da Professora Vera', ic: 'book|#5a3a6a|#e4dccc', w: 0.2, t: 'quest', r: 3, d: 'As últimas páginas falam de um barco, de um rádio e de vinte e três crianças.' },
};
for (const k in ITEMS2) { const it = ITEMS2[k]; it.id = k; it.r = it.r || 0; if (!it.stack) it.stack = it.dur ? 1 : (it.t === 'place' || it.t === 'armor' || it.t === 'pack' ? 5 : it.t === 'book' ? 5 : 30); if (it.t === 'food') for (const f of ['hunger', 'thirst', 'hp', 'sanity', 'sleep']) if (it[f] > 0) it[f] = Math.round(it[f] * .7); ITEMS[k] = it; }
TYPE_NAME.book = 'Livro / Anotação';
WHO.dito = ['p_dito', 'Seu Dito'];

/* ===================== RECEITAS QUE SE DESCOBREM =====================
   Cada receita pode ter uma "lição" (learn). Sem lição, você já sabe fazer.
   Com lição, você aprende lendo um livro achado pelo vale ou ao pegar pela
   primeira vez o ingrediente que dá a ideia. */
const LESSONS = {
  // livros
  sobrevivencia: { n: 'Sobrevivência no mato', from: 'guia_escoteiro', hint: 'Leia o Guia do Escoteiro (acampamento escoteiro, no sudoeste).' },
  cozinha: { n: 'Cozinha da Vó', from: 'caderno_vo', hint: 'Leia o Caderno de Receitas da Vó (casas antigas, pesqueiro).' },
  quimica: { n: 'Química', from: 'apostila_quimica', hint: 'Leia a Apostila de Química (escola, estação sismológica, hospital).' },
  armeiro: { n: 'Armeiro', from: 'manual_armeiro', hint: 'Leia o Manual do Armeiro (delegacia, bunker, quarentena).' },
  obras: { n: 'Obras', from: 'manual_obras', hint: 'Leia o Manual de Obras (mina, quartel dos bombeiros).' },
  costura: { n: 'Moldes de costura', from: 'revista_costura', hint: 'Leia a Revista de Moldes (motel, casas).' },
  eletrica: { n: 'Eletrônica', from: 'manual_eletrica', hint: 'Leia o Manual de Eletrônica (estação de tratamento, observatório).' },
  // ingredientes que dão a ideia
  erva: { n: 'Ervas', ing: 'erva', hint: 'Colha uma Erva Medicinal.' },
  osso: { n: 'Ossos', ing: 'osso', hint: 'Consiga um Osso (caçando animais).' },
  bile: { n: 'Bile', ing: 'glandula', hint: 'Arranque uma Bolsa de Bile de um Cuspidor.' },
  tecido: { n: 'Tecido Vivo', ing: 'tecido_vivo', hint: 'Consiga um pedaço de Tecido Vivo.' },
  minerio: { n: 'Minério', ing: 'minerio', hint: 'Minere um veio de ferro.' },
  quitina: { n: 'Placa Óssea', ing: 'quitina', hint: 'Arranque uma Placa Óssea de uma criatura.' },
  cristal: { n: 'Cristal Abissal', ing: 'cristal', hint: 'Consiga um Cristal Abissal.' },
  mel: { n: 'Mel', ing: 'mel', hint: 'Ache um pote de mel.' },
  horta: { n: 'Horta', ing: 'semente', hint: 'Ache sementes (fazenda, casas, pesqueiro).' },
  cloro: { n: 'Água tratada', ing: 'cloro', hint: 'Ache uma Pastilha de Cloro.' },
};
// receitas antigas que agora precisam ser descobertas
const LEARN_OLD = [
  ['lanca_osso', 'osso'], ['bandagem', 'erva', r => !!r.in.erva], ['cha', 'erva'], ['caldo', 'osso'], ['ensopado', 'cozinha'], ['pao_milho', 'cozinha'], ['suco', 'cozinha'], ['racao', 'cozinha'],
  ['muro', 'obras'], ['armadilha_urso', 'obras'], ['placa', 'obras'], ['lingote', 'minerio', r => !!r.in.minerio],
  ['mochila_g', 'costura'], ['colete_couro', 'costura'], ['armadura_quitina', 'quitina'], ['atadura_viva', 'tecido'],
  ['kit', 'quimica'], ['calmante', 'quimica'], ['molotov', 'quimica'], ['bomba', 'quimica'], ['sinalizador', 'quimica'], ['soro', 'tecido'], ['frasco_bile', 'bile'],
  ['marreta', 'armeiro'], ['armadura_placas', 'armeiro'], ['besta', 'armeiro'], ['virote', 'armeiro'], ['pistola', 'armeiro'], ['espingarda', 'armeiro'], ['municao9', 'armeiro'], ['cartucho', 'armeiro'], ['bala_rifle', 'armeiro'],
];
for (const [out, tag, fn] of LEARN_OLD) for (const r of RECIPES) if (r.out === out && (!fn || fn(r))) r.learn = tag;
// lições que as versões antigas já davam de graça (saves antigos continuam sabendo tudo isso)
const OLD_TAGS = ['osso', 'erva', 'cozinha', 'obras', 'minerio', 'costura', 'quitina', 'tecido', 'quimica', 'bile', 'armeiro'];
RECIPES.push(
  { out: 'seixo', n: 6, in: { pedra: 1 }, st: '', cat: 'Básico', learn: 'sobrevivencia' },
  { out: 'estilingue', n: 1, in: { graveto: 2, couro: 1, corda: 1 }, st: '', cat: 'Básico', learn: 'sobrevivencia' },
  { out: 'pomada', n: 1, in: { erva: 2, resina: 1 }, st: '', cat: 'Básico', learn: 'erva' },
  { out: 'isca', n: 2, in: { carne_crua: 1, glandula: 1 }, st: '', cat: 'Básico', learn: 'bile' },
  { out: 'agua', n: 1, in: { agua_suja: 1, cloro: 1 }, st: '', cat: 'Básico', learn: 'cloro' },
  { out: 'fio', n: 2, in: { eletronica: 1 }, st: '', cat: 'Básico', learn: 'eletrica' },
  { out: 'torta_maca', n: 1, in: { maca: 2, milho: 1, mel: 1 }, st: 'fogueira', cat: 'Cozinha', learn: 'cozinha' },
  { out: 'sopa', n: 1, in: { legume: 2, agua: 1, osso: 1 }, st: 'fogueira', cat: 'Cozinha', learn: 'cozinha' },
  { out: 'peixe_defumado', n: 2, in: { peixe_cru: 2, carvao: 1 }, st: 'fogueira', cat: 'Cozinha', learn: 'cozinha' },
  { out: 'espetinho', n: 1, in: { carne_crua: 1, cogumelo: 1, graveto: 1 }, st: 'fogueira', cat: 'Cozinha', learn: 'sobrevivencia' },
  { out: 'cha_mel', n: 1, in: { agua: 1, erva: 1, mel: 1 }, st: 'fogueira', cat: 'Cozinha', learn: 'mel' },
  { out: 'horta', n: 1, in: { madeira: 4, pedra: 2, semente: 2 }, st: 'bancada', cat: 'Bancada', learn: 'horta' },
  { out: 'bastao_choque', n: 1, in: { bastao: 1, pilha: 2, fio: 2, fita: 1 }, st: 'bancada', cat: 'Bancada', learn: 'eletrica' },
  { out: 'pilha', n: 2, in: { sucata: 1, eletronica: 1, enxofre: 1 }, st: 'quimica', cat: 'Química', learn: 'eletrica' },
  { out: 'mochila_escoteiro', n: 1, in: { couro: 3, corda: 2, pano: 3 }, st: 'costura', cat: 'Costura', learn: 'sobrevivencia' },
  { out: 'roupa_camuflada', n: 1, in: { pano: 6, fibra: 6, resina: 1 }, st: 'costura', cat: 'Costura', learn: 'sobrevivencia' },
  { out: 'antibiotico', n: 1, in: { remedio: 1, cogumelo: 2, alcool: 1 }, st: 'quimica', cat: 'Química', learn: 'quimica' },
  { out: 'adrenalina', n: 1, in: { glandula: 1, alcool: 1, energetico: 1 }, st: 'quimica', cat: 'Química', learn: 'quimica' },
  { out: 'granada', n: 2, in: { polvora: 3, sucata: 2, fita: 1, lingote: 1 }, st: 'armeiro', cat: 'Armeiro', learn: 'armeiro', eng: 1 },
  { out: 'arco_composto', n: 1, in: { arco: 1, lingote: 2, corda: 2, fita: 1 }, st: 'armeiro', cat: 'Armeiro', learn: 'armeiro' },
  { out: 'lanca_cristal', n: 1, in: { lanca_ferro: 1, cristal: 3, corda: 1 }, st: 'armeiro', cat: 'Armeiro', learn: 'cristal' },
  { out: 'lamina_cristal', n: 1, in: { machete: 1, cristal: 4, couro: 1 }, st: 'armeiro', cat: 'Armeiro', learn: 'cristal' },
  { out: 'armadura_cristal', n: 1, in: { armadura_placas: 1, cristal: 6, quitina: 4 }, st: 'armeiro', cat: 'Armeiro', learn: 'cristal', eng: 2 },
);
// quais receitas cada lição ensina (para mostrar quando você aprende)
const lessonRecipes = tag => RECIPES.filter(r => r.learn === tag);
const ING_LESSON = {}; for (const k in LESSONS) if (LESSONS[k].ing) ING_LESSON[LESSONS[k].ing] = k;

/* ===================== SAQUES ===================== */
const addLoot = (t, list) => { LOOT[t] = (LOOT[t] || []).concat(list); };
addLoot('casa', [['chocolate', .15, 1, 1], ['pilha', .15, 1, 2], ['semente', .1, 1, 2], ['caderno_vo', .03, 1, 1], ['revista_costura', .04, 1, 1], ['bastao', .03, 1, 1], ['sardinha', .15, 1, 1], ['mapa_regiao', .03, 1, 1]]);
addLoot('garagem', [['pilha', .3, 1, 2], ['fio', .3, 1, 2], ['manual_obras', .04, 1, 1]]);
addLoot('oficina', [['fio', .4, 1, 3], ['pilha', .3, 1, 2], ['manual_eletrica', .05, 1, 1], ['manual_obras', .05, 1, 1]]);
addLoot('fazenda', [['semente', .55, 2, 4], ['mel', .3, 1, 2], ['forcado', .1, 1, 1], ['caderno_vo', .1, 1, 1]]);
addLoot('mercado', [['chocolate', .45, 1, 3], ['sardinha', .45, 1, 2], ['pilha', .3, 1, 2], ['semente', .15, 1, 2]]);
addLoot('hospital', [['antibiotico', .25, 1, 1], ['adrenalina', .1, 1, 1], ['apostila_quimica', .08, 1, 1]]);
addLoot('policia', [['manual_armeiro', .1, 1, 1], ['pilha', .3, 1, 2], ['binoculo', .06, 1, 1]]);
addLoot('militar', [['granada', .22, 1, 2], ['adrenalina', .2, 1, 1], ['manual_armeiro', .06, 1, 1], ['binoculo', .1, 1, 1], ['mapa_regiao', .15, 1, 1]]);
addLoot('lab', [['apostila_quimica', .05, 1, 1], ['manual_eletrica', .05, 1, 1], ['pilha', .3, 1, 2], ['fio', .3, 1, 2]]);
addLoot('mina', [['manual_obras', .06, 1, 1], ['pilha', .2, 1, 2]]);
addLoot('caixa', [['seixo', .25, 4, 8], ['semente', .12, 1, 2]]);
addLoot('trem', [['sardinha', .3, 1, 2], ['fio', .25, 1, 2]]);
Object.assign(LOOT, {
  livros: [['pano', .15, 1, 1], ['fita', .15, 1, 1]],
  escoteiro: [['corda', .7, 1, 3], ['fibra', .5, 2, 4], ['flecha', .5, 3, 8], ['barra', .5, 1, 3], ['chocolate', .4, 1, 2], ['seixo', .5, 4, 10], ['bandagem', .4, 1, 2], ['mapa_regiao', .2, 1, 1], ['mochila_escoteiro', .12, 1, 1], ['sardinha', .3, 1, 1]],
  escola: [['chocolate', .5, 1, 3], ['biscoito', .5, 1, 3], ['pano', .4, 1, 2], ['fita', .4, 1, 2], ['eletronica', .3, 1, 1], ['pilha', .4, 1, 3], ['bastao', .12, 1, 1], ['mochila_p', .12, 1, 1], ['alcool', .2, 1, 1], ['apostila_quimica', .08, 1, 1]],
  tratamento: [['cloro', .8, 2, 5], ['alcool', .5, 1, 2], ['fita', .4, 1, 2], ['sucata', .6, 1, 3], ['pilha', .4, 1, 2], ['fio', .5, 1, 3], ['antibiotico', .2, 1, 1], ['eletronica', .4, 1, 2], ['garrafa', .5, 1, 3]],
  pesqueiro: [['peixe_cru', .6, 1, 3], ['corda', .5, 1, 2], ['mel', .4, 1, 2], ['sardinha', .4, 1, 2], ['garrafa', .5, 1, 2], ['semente', .3, 1, 3], ['fita', .3, 1, 1], ['carne_seca', .3, 1, 2]],
  bombeiros: [['bandagem', .7, 1, 3], ['kit', .3, 1, 1], ['adrenalina', .3, 1, 1], ['corda', .5, 1, 2], ['fita', .5, 1, 2], ['sucata', .5, 1, 2], ['agua', .4, 1, 2], ['lanterna', .1, 1, 1]],
  gruta: [['cristal', .5, 1, 3], ['minerio', .5, 2, 4], ['enxofre', .5, 1, 3], ['bandagem', .3, 1, 1], ['pilha', .3, 1, 2], ['chocolate', .3, 1, 1]],
  onibus: [['biscoito', .5, 1, 2], ['refri', .4, 1, 2], ['pano', .3, 1, 1], ['chocolate', .4, 1, 2], ['pilha', .2, 1, 1]],
});

/* ===================== HISTÓRIA ===================== */
const N2 = NOTES.length; // índice da primeira anotação nova (os saves guardam o índice)
NOTES.push(
  ['Livro de bordo do Chefe Ramos', 'Dia 2 do acampamento Pica-Pau. O chão tremeu de madrugada. Mandei os meninos para a escola no ônibus da prefeitura e fiquei para apagar a fogueira. A fogueira não queria apagar. A fumaça descia para o chão, como se alguém lá embaixo estivesse respirando fundo.'],
  ['Diário da Professora Vera, pág. 1', 'Vinte e três alunos. O ônibus do exército não veio. O ônibus da escola veio, mas o motorista ficou sentado no volante sem piscar, e sorria. Fechamos as janelas. A Bia perguntou se o motorista estava doente. Eu disse que sim.'],
  ['Relatório da Estação de Tratamento', 'Matéria orgânica no reservatório: fora da escala. A água filtrada sai morna e com gosto de ferro. Aumentamos o cloro três vezes. Recomendação para a população: FERVA TUDO. Recomendação para mim: sair daqui antes do turno da noite.'],
  ['Ocorrência 117, Corpo de Bombeiros', 'Chamado: incêndio na mata perto da Gruta dos Ecos. Chegando lá, não era fogo. Era luz. Cristais do tamanho de um carro, pulsando. O Sargento Abreu encostou num deles e passou uma hora falando com a voz da filha. A filha dele mora em Belo Horizonte.'],
  ['Bilhete do Seu Dito', 'Bia, se você voltar e eu não estiver, estou no rio. Deixei feijão na lata azul e a vara pequena atrás da porta. Não abre para ninguém que bater chamando, nem se for eu. Te amo. Vô.'],
  ['Lista de chamada do ônibus', 'Escola Estadual Alto da Serra, 4º ano. Ana Luiza, Arthur, Beatriz Rocha, Caio, Davi, Eduarda, Enzo, Gabriel, Helena, Isadora, João Pedro, Kauã, Laura, Lorena, Lucas, Maria Clara, Miguel, Nicolas, Pedro Henrique, Rafaela, Samuel, Valentina, Yasmin. Vinte e três. Todos marcados como presentes.'],
  ['Caderno de desenho', 'Um desenho de giz de cera: um ônibus amarelo, uma montanha com uma boca, vinte e três bonequinhos e um barco no rio. Embaixo, escrito com letra torta: "o rio leva a gente pra casa".'],
);
TAPES.push(['Boletim 09 · Escolas', 'Os alunos da Escola Estadual Alto da Serra foram levados para um abrigo seguro.\nPais e responsáveis: NÃO PROCUREM AS CRIANÇAS.\nRepetimos: não procurem as crianças.\nAguardem o contato pelo rádio da estação de água.']);
TIPS.push(
  'Livros espalhados pelo vale ensinam receitas novas. Leia tudo o que achar.',
  'Pegar um material novo pela primeira vez às vezes dá uma ideia de receita.',
  'Na chuva, as criaturas ouvem menos e o coletor enche mais rápido. Na neblina, enxergam você só de perto.',
  'Um canteiro com sementes dá comida sozinho. Volte no dia seguinte para colher.',
  'A Isca Fedorenta distrai as criaturas por 15 segundos. Boa para fugir ou para juntar todas num lugar só.',
  'A Gruta dos Ecos, no meio do vale, é cheia de cristais. E do que mora perto deles.',
);

const QUESTS2 = {
  s_dito1: { title: 'O Velho do Rio', desc: 'Tem fumaça de fogueira perto do rio, ao sul, depois da ferrovia. Alguém vive lá.', seq: 1, obj: [
      { t: 'ev', ev: 'reach:pesqueiro', n: 1, txt: 'Chegue ao Pesqueiro do Seu Dito' }, { t: 'ev', ev: 'talk:dito', n: 1, txt: 'Fale com o pescador' }],
    xp: 150, next: 's_dito2', give: { peixe_defumado: 3, semente: 3 }, end: [
      ['dito', 'Para aí. Fala o nome da sua mãe.'],
      ['eu', 'O quê?'],
      ['dito', 'O nome. As coisas que imitam não sabem o nome das mães. Sabem o seu, sabem o meu, mas não sabem o das mães.'],
      ['eu', 'Ela se chamava... É sério isso?'],
      ['dito', 'Tá bom, tá bom. Gente não pensa tanto para responder. Senta. Sou Benedito, mas é Seu Dito. Pesco nesse rio faz cinquenta anos.'],
      ['dito', 'Minha neta, a Bia, estava na escola lá em cima, no norte, quando a terra abriu. O exército disse que levou as crianças. Não disse para onde.'],
      ['dito', 'Eu sou velho e o joelho não sobe morro. Você sobe. A escola fica a oeste da igreja de Alto Ferro. Se achar qualquer coisa dela... qualquer coisa.']] },
  s_dito2: { title: 'A Mochila da Bia', desc: 'Seu Dito quer notícias da neta, Beatriz. A Escola Estadual Alto da Serra fica no norte, a oeste da igreja de Alto Ferro.', seq: 1, obj: [
      { t: 'ev', ev: 'reach:escola', n: 1, txt: 'Chegue à Escola Estadual Alto da Serra' }, { t: 'have', id: 'mochila_bia', n: 1, txt: 'Ache algo da Bia na escola' }, { t: 'ev', ev: 'deliver:bia', n: 1, txt: 'Leve para o Seu Dito' }],
    xp: 350, next: 's_dito3', take: { mochila_bia: 1 }, give: { forcado: 1, caderno_vo: 1, mel: 2 }, end: [
      ['dito', '...Essa é a mochila dela. O chaveiro de peixinho fui eu que dei.'],
      ['dito', 'Tem um desenho aqui dentro. Um ônibus, uma montanha com boca e um barco no rio. "O rio leva a gente pra casa".'],
      ['dito', 'Montanha com boca... A Gruta dos Ecos, no meio do vale, a leste da fazenda. Os bombeiros fecharam a estrada de lá antes de tudo.'],
      ['dito', 'Leva o forcado, que o rio não precisa mais dele. E o caderno da minha falecida. Ela cozinhava melhor que eu pesco.']] },
  s_dito3: { title: 'Os Ecos da Gruta', desc: 'O desenho da Bia aponta para a Gruta dos Ecos, no meio do vale, a leste da Fazenda Albuquerque. O ônibus da escola pode estar lá.', seq: 1, obj: [
      { t: 'ev', ev: 'reach:gruta', n: 1, txt: 'Chegue à Gruta dos Ecos' }, { t: 'have', id: 'diario_vera', n: 1, txt: 'Descubra o que aconteceu com as crianças' }, { t: 'ev', ev: 'talk:dito', n: 1, txt: 'Conte tudo ao Seu Dito' }],
    xp: 500, next: 's_dito4', give: { arpao: 1, antibiotico: 2 }, end: [
      ['eu', 'A professora levou as crianças para a gruta. Os cristais confundem as criaturas. Depois ela ouviu no rádio da estação de água que um barco da Defesa Civil ia descer o rio.'],
      ['dito', 'Um barco. No meu rio. E eu aqui pescando lambari.'],
      ['dito', 'A estação de tratamento fica no leste, depois de Alto Ferro, subindo a estrada de terra para o observatório. Se aquele rádio ainda liga, dá para chamar o barco. Ou o que tiver sobrado dele.'],
      ['dito', 'Leva meu arpão. Não erro um peixe desde 1979. Você vai precisar mais do que eu.']] },
  s_dito4: { title: 'Sinal na Água', desc: 'O rádio da Estação de Tratamento de Água, no leste, falava com o barco da Defesa Civil. Conserte-o: ele precisa de pilhas e fio de cobre.', seq: 1, obj: [
      { t: 'ev', ev: 'reach:tratamento', n: 1, txt: 'Chegue à Estação de Tratamento de Água' }, { t: 'have', id: 'pilha', n: 3, txt: 'Junte 3 Pilhas' }, { t: 'have', id: 'fio', n: 2, txt: 'Junte 2 Fios de Cobre' }, { t: 'ev', ev: 'radio2', n: 1, txt: 'Conserte e ligue o rádio da estação' }, { t: 'ev', ev: 'talk:dito', n: 1, txt: 'Volte ao Seu Dito' }],
    xp: 900, give: { adrenalina: 2, kit: 2, granada: 2 }, flag: 'criancas', end: [
      ['dito', 'E aí? Fala logo, que o coração não aguenta.'],
      ['eu', 'Elas estão vivas. As vinte e três. O barco levou todas pelo rio até o Abrigo São Bento, do outro lado da serra. A professora Vera também.'],
      ['eu', 'Uma menina pediu o rádio. Disse que o avô dela pesca no rio e que é para ele não esquecer de trocar a linha da vara pequena.'],
      ['dito', '...'],
      ['dito', 'A vara pequena. Atrás da porta.'],
      ['dito', 'Quando você abrir aquela estrada, eu vou junto. Vou a pé, de joelho ruim e tudo. Obrigado, criatura. Obrigado.']] },
  s_mestre: { title: 'Mestre Artesão', desc: 'Livros e materiais espalhados pelo vale ensinam receitas novas. Aprenda todas as lições.', obj: [{ t: 'ev', ev: 'lesson', n: Object.keys(LESSONS).length, txt: 'Aprenda todas as lições de receitas' }], xp: 700, give: { kit_reparo: 3, manual_eletrica: 0 }, end: [['eu', 'Não tem mais nada nesse vale que eu não saiba montar. Só falta um jeito de sair dele.']] },
  s_horta: { title: 'Mão na Terra', desc: 'Com sementes e um canteiro, a comida cresce sozinha. Monte um e colha.', obj: [{ t: 'ev', ev: 'place:horta', n: 1, txt: 'Monte um Canteiro (Bancada)' }, { t: 'ev', ev: 'harvest', n: 1, txt: 'Colha a primeira safra' }], xp: 200, give: { semente: 4 }, end: [['eu', 'Abóbora. Uma abóbora de verdade. Tem coisa nesse vale que ainda nasce do jeito certo.']] },
  s_explora: { title: 'Ecos do Vale', desc: 'O vale tem lugares que ninguém marcou no mapa: um acampamento escoteiro, uma escola, um quartel de bombeiros, uma estação de água, um pesqueiro e uma gruta.', obj: [{ t: 'ev', ev: 'reach2', n: 6, txt: 'Descubra os 6 lugares novos do vale' }], xp: 400, give: { binoculo: 1 }, end: [['eu', 'Seis lugares, seis histórias, e todas terminam do mesmo jeito: alguém deixou um bilhete esperando que outra pessoa lesse.']] },
};
QUESTS2.s_mestre.give = { kit_reparo: 3 };
for (const k in QUESTS2) { QUESTS2[k].id = k; QUESTS[k] = QUESTS2[k]; }

/* ===================== LUGARES NOVOS DO MAPA =====================
   Gerados no fim do genWorld, com o próprio gerador do mundo, depois de tudo.
   Assim os objetos antigos mantêm o mesmo número e os saves continuam valendo. */
const POIS2 = {
  escoteiros: { x: 39, y: 205, n: 'Acampamento Escoteiro Pica-Pau', ic: 'm_tent', rad: 8 },
  escola: { x: 171, y: 44, n: 'Escola Estadual Alto da Serra', ic: 'u_book', rad: 9 },
  tratamento: { x: 255, y: 71, n: 'Estação de Tratamento de Água', ic: 'm_dam', rad: 8 },
  pesqueiro: { x: 90, y: 208, n: 'Pesqueiro do Seu Dito', ic: 'fish', rad: 7 },
  bombeiros: { x: 250, y: 117, n: 'Quartel dos Bombeiros', ic: 'fire', rad: 7 },
  gruta: { x: 141, y: 138, n: 'Gruta dos Ecos', ic: 'crystal', rad: 9 },
};
const OBJ2 = { estante: { r: 14, solid: 1 }, onibus: { r: 34, solid: 1 }, barraca: { r: 18, solid: 1 }, tanque: { r: 30, solid: 1 }, caminhao: { r: 34, solid: 1 }, radio2: { r: 14, solid: 1 }, horta: { r: 18 } };
const NATURAL = { tree: 1, bush: 1, rock: 1, stone: 1, flint: 1, grass: 1, stick: 1, herb: 1, mushroom: 1, iron: 1, coal: 1, sulfur: 1, crystal: 1 };
function genExtra(H) {
  Object.assign(POIS, POIS2); Object.assign(OBJ, OBJ2);
  const { set, get, building, lair, clearing, road } = H, rng = mulberry32((H.S || 1) * 7 + 2020), base = W.objs.length;
  // tira árvores e pedras de onde vai entrar construção nova
  const clearArea = (x0, y0, x1, y1) => { for (let i = 0; i < base; i++) { const o = W.objs[i]; if (!NATURAL[o.type] || o.dead) continue; const tx = o.x / TILE, ty = o.y / TILE; if (tx >= x0 && tx <= x1 && ty >= y0 && ty <= y1) { gridRemove(o); o.dead = true; o.gone = 1; } } };
  const shelf = (x, y, items, note) => mkObj('estante', x * TILE, y * TILE, { loot: 'livros', extra: items, note });

  // --- acampamento escoteiro (sudoeste)
  clearArea(29, 196, 49, 214); clearing(39, 205, 9);
  building(31, 199, 7, 5, 's', [['escoteiro', [['guia_escoteiro', 1]], N2], ['escoteiro']]);
  building(41, 200, 6, 5, 's', [['escoteiro', [['estilingue', 1], ['seixo', 12]]], ['escoteiro']]);
  for (const [x, y] of [[33, 208], [38, 210], [44, 208]]) mkObj('barraca', x * TILE, y * TILE);
  mkObj('fogueira', 39 * TILE, 206.5 * TILE, { fixed: 1 }); mkObj('crate', 46.5 * TILE, 205 * TILE, { loot: 'escoteiro' });
  road([[57, 174], [50, 186], [42, 198]], 1, T.DIRT);
  lair(39, 211, [['rastejante', 2], ['cao', 2]], { r: 140, night: 1 });

  // --- escola (norte, a oeste da igreja)
  clearArea(160, 34, 183, 55); clearing(171, 45, 10);
  building(163, 38, 15, 9, 's', [['escola', [['apostila_quimica', 1]], N2 + 1], ['escola'], ['escola', [['mochila_bia', 1]], N2 + 6], ['escola'], ['tv', 5], ['escola', [['bastao', 1]]], ['escola'], ['escola']], T.TILED);
  mkObj('onibus', 168 * TILE, 50.5 * TILE, { loot: 'onibus', rot: .05 });
  for (const [x, y] of [[176, 50], [161, 49]]) mkObj('poste', x * TILE, y * TILE);
  road([[196, 64], [184, 52], [174, 48]], 1, T.DIRT);
  lair(170, 42, [['hospedeiro', 3]], { r: 120 }); lair(171, 50, [['imitador', 1]], { r: 60, night: 1 });

  // --- estação de tratamento de água (leste)
  clearArea(244, 62, 266, 82); clearing(255, 72, 9, T.CONC);
  building(248, 66, 12, 7, 's', [['tratamento', [['manual_eletrica', 1]], N2 + 2], ['tratamento'], ['tratamento', [['traje_hazmat', 1]]], ['quimica'], ['tratamento'], ['tratamento', [['cloro', 4]]]], T.TILED);
  W.radio2 = mkObj('radio2', 253.5 * TILE, 67.6 * TILE);
  for (const [x, y] of [[248, 77], [255, 78.5], [262, 77]]) mkObj('tanque', x * TILE, y * TILE);
  road([[259, 65], [256, 73]], 1, T.DIRT);
  lair(255, 77, [['cuspidor', 2], ['verme', 2]], { r: 130 }); lair(253, 69, [['rasteira', 1]], { r: 20 });

  // --- pesqueiro do Seu Dito (sul, na beira do rio)
  clearArea(83, 201, 97, 214); clearing(90, 207, 7);
  building(86, 203, 7, 5, 's', [['pesqueiro', [['caderno_vo', 0], ['vara', 1]], N2 + 4], ['pesqueiro', [['forcado', 0]]]]);
  W.npcs.dito = mkObj('npc', 89.5 * TILE, 209.6 * TILE, { npc: 'dito' });
  mkObj('fogueira', 91.6 * TILE, 210 * TILE, { fixed: 1 }); mkObj('crate', 94 * TILE, 207 * TILE, { loot: 'pesqueiro' }); mkObj('logpile', 85 * TILE, 210 * TILE);
  road([[92, 180], [91, 202]], 1, T.DIRT);

  // --- quartel dos bombeiros (leste de Alto Ferro)
  clearArea(241, 108, 260, 126); clearing(250, 117, 8);
  building(244, 112, 12, 7, 'n', [['bombeiros', [['machado_bombeiro', 1]]], ['bombeiros', [['roupa_bombeiro', 1]], N2 + 3], ['bombeiros'], ['bombeiros', [['manual_obras', 1]]], ['armeiro'], ['bombeiros']]);
  mkObj('caminhao', 249 * TILE, 122 * TILE, { loot: 'bombeiros', rot: .02 });
  road([[250, 93], [250, 110]], 2, T.ROAD);
  lair(250, 121, [['bruto', 1], ['hospedeiro', 2]], { r: 140 });

  // --- gruta dos ecos (meio do vale)
  const GX = 141, GY = 138; clearArea(GX - 12, GY - 12, GX + 12, GY + 12);
  for (let y = GY - 12; y <= GY + 12; y++) for (let x = GX - 12; x <= GX + 12; x++) {
    const d = Math.hypot(x - GX, (y - GY) * 1.1) + (fbm(x * .3, y * .3, 909) - .5) * 2.5; if (x < 2 || y < 2 || x >= MW - 2 || y >= MH - 2) continue;
    const open = x < GX && Math.abs(y - GY) < 2.5; // entrada pelo oeste
    if (d < 6) set(x, y, d < 2.6 ? T.ASH : T.ROCK); else if (d < 9.5) set(x, y, open ? T.ROCK : T.MOUNT); else if (d < 11) set(x, y, T.DIRT);
  }
  for (let k = 0; k < 16; k++) { const a = rng() * 6.28, d = (1.5 + rng() * 3.8) * TILE, x = (GX + .5) * TILE + Math.cos(a) * d, y = (GY + .5) * TILE + Math.sin(a) * d; mkObj(k < 7 ? 'crystal' : k < 12 ? 'iron' : 'coal', x, y); }
  mkObj('onibus', (GX - 10) * TILE, (GY + 4.6) * TILE, { loot: 'onibus', rot: -.35, note: N2 + 5 });
  mkObj('crate', (GX - 3.6) * TILE, (GY - 2.6) * TILE, { loot: 'gruta', extra: [['diario_vera', 1]] }); mkObj('crate', (GX + 2.8) * TILE, (GY + 3.4) * TILE, { loot: 'gruta' });
  road([[110, 152], [124, 145], [GX - 12, GY + 1]], 1, T.DIRT);
  lair(GX, GY, [['imitador', 1], ['verme', 2], ['rastejante', 2]], { r: 150 }); lair(GX + 2, GY - 3, [['gritador', 1]], { r: 60, night: 1 });

  // --- livros guardados em lugares que já existiam
  shelf(48.5, 89.5, [['caderno_vo', 1]]);            // casa da vila
  shelf(185.5, 84.5, [['manual_armeiro', 1]]);       // delegacia
  shelf(51.6, 18.5, [['apostila_quimica', 1]]);      // estação sismológica
  shelf(165.5, 86.5, [['revista_costura', 1]]);      // motel
  shelf(105.5, 50.5, [['manual_obras', 1]]);         // mina
  shelf(266.6, 205.5, [['manual_armeiro', 1], ['granada', 2]]); // bunker
  shelf(278.5, 31.5, [['manual_eletrica', 1]]);      // observatório
  mkObj('crate', 57 * TILE, 167.5 * TILE, { loot: 'serraria', extra: [['motosserra', 1]] }); // serraria
  for (const o of W.objs.slice(base)) if (o.extra) o.extra = o.extra.filter(x => x[1] > 0);
}
