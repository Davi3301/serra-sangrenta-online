'use strict';
/* ==========================================================================
   SERRA SANGRENTA 3.0 · ALÉM DA SERRA (conteúdo)
   O Tremor abriu passagens na serra que cercava o vale. Do outro lado:
   o Planalto Gelado (leste) e a Mata Funda (sul), com os Selvagens, as
   Cavernas do Eco e o avião que caiu na noite do Tremor.
   ========================================================================== */
VERSION = '3.9';

/* ----------------------------- criaturas ----------------------------- */
Object.assign(ENEMIES, {
  selvagem: { n: 'Selvagem', hp: 78, spd: 150, dmg: 14, r: 12, xp: 26, aggro: 520, wild: 1, ai3: 'selvagem', drops: [['lanca_selvagem', .18, 1], ['osso', .5, 2], ['couro', .3, 1], ['erva', .3, 2]] },
  xama: { n: 'Xamã Selvagem', hp: 170, spd: 110, dmg: 12, r: 13, xp: 70, aggro: 560, wild: 1, ai3: 'xama', drops: [['cadernos_aldeia', .25, 1], ['tecido_vivo', .8, 2], ['erva', 1, 3], ['cristal', .3, 1]] },
  uivador: { n: 'Uivador da Neve', hp: 120, spd: 170, dmg: 18, r: 13, xp: 38, aggro: 480, wild: 1, ai3: 'uivador', drops: [['pele_branca', .85, 2], ['osso', .6, 2], ['tecido_vivo', .2, 1]] },
  pernalta: { n: 'Pernalta', hp: 280, spd: 135, dmg: 30, r: 16, xp: 95, aggro: 560, wild: 1, ai3: 'pernalta', drops: [['osso', 1, 3], ['quitina', .8, 2], ['tecido_vivo', .7, 2]] },
  tecelao: { n: 'Tecelão', hp: 95, spd: 88, dmg: 10, r: 13, xp: 34, aggro: 420, ai3: 'tecelao', drops: [['corda', .7, 2], ['glandula', .4, 1], ['tecido_vivo', .4, 1]] },
  milbracos: { n: 'O Mil-Braços', hp: 1300, spd: 60, dmg: 40, r: 34, xp: 600, aggro: 520, boss: 1, ai3: 'milbracos', drops: [['coracao_eco', 1, 1], ['cristal', 1, 5], ['quitina', 1, 6], ['tecido_vivo', 1, 6]] },
});
Object.assign(BESTIARY, {
  selvagem: 'Sobreviventes da mata funda que comeram o Tecido e não viraram monstros. Não de todo. Andam em grupo, rodeiam, provocam e só atacam quando você vira as costas. Recuam quando sangram.',
  xama: 'Pinta o rosto com cinza de cristal e fala com a mata. Os Selvagens perto dele se curam e ficam mais corajosos. Derrube o Xamã primeiro.',
  uivador: 'Fica imóvel na neve até você passar. Branco como o chão, só os olhos denunciam. Ataca em salto e foge para rodear de novo.',
  pernalta: 'Três pernas compridas demais e um tronco que não se decide para que lado olhar. Muda de direção sem aviso e alcança qualquer um em campo aberto.',
  tecelao: 'Mora nas cavernas. Cospe fios de carne que grudam e prendem as pernas. Um Tecelão sozinho é um incômodo; três são uma armadilha.',
  milbracos: 'O que os Selvagens adoram no fundo das Cavernas do Eco. Um tronco sem cabeça com braços demais. Varre tudo à volta e, quando se irrita, corre.',
});

/* ------------------------------- itens ------------------------------- */
const ITEMS3 = {
  pele_branca: { n: 'Pele Branca', ic: 'hide|#e4e8ec|#a8b0bc', w: 0.4, t: 'mat', r: 1, d: 'Pelagem grossa de Uivador. Esquenta como nada no vale.' },
  coracao_eco: { n: 'Coração do Eco', ic: 'core|#c84a7a|#ffc0d8', w: 1.0, t: 'quest', r: 3, d: 'Bate devagar. As criaturas por perto ficam quietas, como se escutassem.' },
  diario_ramires: { n: 'Cadernos de Campo de Ramires', ic: 'book|#6a5a3a|#e4dccc', w: 0.3, t: 'quest', r: 2, d: 'Desenhos da aldeia, nomes, rituais. E muitas páginas sobre "o que mora na caverna".' },
  cadernos_aldeia: { n: 'Cadernos da Aldeia', ic: 'book|#5a3a2a|#c83a3a', w: 0.3, t: 'book', use: 'read', learn: 'selvagem', r: 2, d: 'Rabiscos dos Selvagens copiados por alguém: como fazem efígies, clavas e armaduras de osso.' },
  manual_cacador: { n: 'Manual do Caçador', ic: 'book|#4a5a3a|#c4843a', w: 0.3, t: 'book', use: 'read', learn: 'cacador', r: 1, d: 'Armadilhas, iscas, flechas de fogo e de veneno, zarabatana. Cheio de anotações a lápis.' },
  // armas
  lanca_selvagem: { n: 'Lança Selvagem', ic: 'spear|#5a3a22|#d6ceb4', w: 1.1, t: 'melee', held: 'spear', kind: 'thrust', r: 1, dmg: 27, range: 94, arc: .45, cd: .46, stam: 8, kb: 180, dur: 140, toss: 1, d: 'Ponta de osso afiada na pedra e amarrada com tripa. Feita para arremessar.' },
  porrete_ossos: { n: 'Clava de Ossos', ic: 'club|#d6ceb4|#8a2a2a', w: 1.9, t: 'melee', held: 'club', r: 2, dmg: 31, range: 50, arc: 1.9, cd: .6, stam: 11, kb: 320, dur: 180, stun: .45, d: 'Pesada e cheia de pontas. Cada golpe atordoa um pouco.' },
  machado_gelo: { n: 'Piolet', ic: 'pick|#3a5a7a|#c8ced8', w: 1.0, t: 'melee', held: 'pick', iron: 1, r: 2, dmg: 28, range: 48, arc: 1.4, cd: .42, stam: 7, kb: 150, dur: 260, mine: 1.4, chop: .8, d: 'Machado de escalada. Rápido, fura gelo, rocha e o que estiver no caminho.' },
  arco_caca: { n: 'Arco Recurvo de Caça', ic: 'bow|#5a3a22|#c4a446', w: 1.0, t: 'ranged', held: 'bow', kind: 'bow', r: 3, dmg: 52, ammo: 'flecha', dur: 300, d: 'O melhor arco do vale. Puxa forte, solta limpo.' },
  besta_repeticao: { n: 'Besta de Repetição', ic: 'crossbow|#34363e|#c4a446', w: 2.6, t: 'ranged', held: 'crossbow', kind: 'gun', r: 3, dmg: 34, ammo: 'virote', mag: 5, reload: 1.6, cd: .32, spread: .03, speed: 950, noise: 0, bolt: 1, dur: 280, d: 'Cinco virotes seguidos, sem barulho. Recarregar é que demora.' },
  zarabatana: { n: 'Zarabatana', ic: 'rod|#6e5238|#86963a', w: 0.3, t: 'ranged', held: 'rod', kind: 'gun', pebble: 1, dart: 1, r: 1, dmg: 6, ammo: 'dardo', mag: 1, reload: .55, cd: .15, spread: .02, speed: 900, noise: 0, bolt: 1, dur: 200, d: 'Um sopro, um dardo. O veneno faz o resto: dano contínuo por 6 segundos.' },
  flecha_fogo: { n: 'Flecha de Fogo', ic: 'arrow|#86683f|#e08a3a', w: 0.06, t: 'ammo', stack: 40, r: 1, d: 'Acende no impacto. Use T para escolher que flecha o arco atira.' },
  flecha_veneno: { n: 'Flecha Envenenada', ic: 'arrow|#86683f|#86963a', w: 0.06, t: 'ammo', stack: 40, r: 1, d: 'Envenena o alvo por 6 segundos. Use T para escolher que flecha o arco atira.' },
  dardo: { n: 'Dardo Envenenado', ic: 'arrow|#5a7a3a|#86963a', w: 0.02, t: 'ammo', stack: 60, r: 1, d: 'Para a zarabatana.' },
  bomba_fumaca: { n: 'Bomba de Fumaça', ic: 'bomb|#8a8e96|#c8ccd0', w: 0.5, t: 'throw', r: 1, stack: 10, d: 'Uma nuvem grossa por 12 segundos. Quem está dentro perde você de vista.' },
  // roupas
  casaco_pele: { n: 'Casaco de Pele', ic: 'vest|#e4e8ec|#a8b0bc', w: 2.2, t: 'armor', def: .16, warm: 45, r: 2, d: 'Reduz o dano em 16% e segura muito bem o frio.' },
  armadura_ossos: { n: 'Armadura de Ossos', ic: 'armor|#d6ceb4|#8a7a64', w: 4.0, t: 'armor', def: .36, warm: 5, r: 2, d: 'Reduz o dano em 36%. Faz barulho de chocalho quando você corre.' },
  roupa_folhas: { n: 'Roupa de Folhas', ic: 'vest|#4a7a34|#2a4a22', w: 1.0, t: 'armor', def: .08, camo: 1, leaf: 1, r: 1, d: 'Reduz o dano em 8%. Agachado no mato, você quase some.' },
  gorro: { n: 'Gorro de Lã', ic: 'cloth|#c83a3a|#e4dccc', w: 0.1, t: 'util', warm: 20, d: 'Na mochila, ajuda a segurar o frio.' },
  mascara_osso: { n: 'Máscara de Osso', ic: 'shell|#e4dccc|#8a2a2a', w: 0.3, t: 'util', r: 2, d: 'Presente do Dr. Ramires. Na mochila, os Selvagens hesitam antes de atacar você.' },
  // comida quente
  chocolate_quente: { n: 'Chocolate Quente', ic: 'cup|#d4ccc4|#5a3a22', w: 0.5, t: 'food', thirst: 26, hunger: 10, sanity: 14, warm: 40, back: 'garrafa', r: 1, d: 'Esquenta por dentro. Perfeito no planalto.' },
  // construções
  efigie: { n: 'Efígie de Ossos', ic: 'bone|#d6ceb4|#8a2a2a', w: 3.0, t: 'place', r: 2, d: 'Ossos amarrados numa forma que as criaturas reconhecem. Queima por um dia e meio e mantém a maioria delas longe.' },
  efigie_ressonante: { n: 'Efígie Ressonante', ic: 'core|#c84a7a|#ffc0d8', w: 5.0, t: 'place', r: 3, d: 'Feita com o Coração do Eco. Nunca apaga. Nenhuma criatura comum chega perto.' },
  armadilha_laco: { n: 'Armadilha de Laço', ic: 'rope|#9c8658|#6e5238', w: 0.6, t: 'place', r: 1, d: 'Prende a primeira criatura que pisar nela por 5 segundos. Rearma sozinha.' },
  armadilha_tronco: { n: 'Armadilha de Tronco', ic: 'log|#6e5238|#c83a3a', w: 4.0, t: 'place', r: 1, d: 'Um tronco pendurado. Esmaga o que passar embaixo. Precisa ser rearmada com madeira.' },
  tambor_fogo: { n: 'Tambor de Fogo', ic: 'barrel|#8a3a2a|#e08a3a', w: 4.0, t: 'place', r: 1, d: 'Um tambor de metal com fogo dentro. Luz e calor que não apagam com a chuva.' },
};
for (const k in ITEMS3) { const it = ITEMS3[k]; it.id = k; it.r = it.r || 0; if (!it.stack) it.stack = it.dur ? 1 : (it.t === 'place' || it.t === 'armor' || it.t === 'pack' || it.t === 'book' ? 5 : 30); if (it.t === 'food') for (const f of ['hunger', 'thirst', 'hp', 'sanity', 'sleep']) if (it[f] > 0) it[f] = Math.round(it[f] * .7); ITEMS[k] = it; }
// comidas e bebidas quentes esquentam
for (const [k, w] of [['cha', 25], ['caldo', 30], ['ensopado', 35], ['sopa', 35], ['cafe', 20], ['cha_mel', 30], ['carne_assada', 10], ['peixe_assado', 8]]) if (ITEMS[k]) ITEMS[k].warm = w;
WHO.ramires = ['p_ramires', 'Dr. Ramires'];

/* ------------------------------ receitas ------------------------------ */
Object.assign(LESSONS, {
  cacador: { n: 'Caça e armadilhas', from: 'manual_cacador', hint: 'Leia o Manual do Caçador (acampamento dos caçadores, na Mata Funda).' },
  selvagem: { n: 'Costumes dos Selvagens', from: 'cadernos_aldeia', hint: 'Leia os Cadernos da Aldeia (Aldeia dos Selvagens, ou com um Xamã).' },
  frio: { n: 'Frio do planalto', ing: 'pele_branca', hint: 'Consiga uma Pele Branca (Uivadores do Planalto Gelado).' },
});
ING_LESSON.pele_branca = 'frio';
RECIPES.push(
  { out: 'flecha_fogo', n: 4, in: { flecha: 4, pano: 1, resina: 1 }, st: '', cat: 'Básico', learn: 'cacador' },
  { out: 'flecha_veneno', n: 4, in: { flecha: 4, glandula: 1 }, st: '', cat: 'Básico', learn: 'cacador' },
  { out: 'dardo', n: 6, in: { graveto: 1, glandula: 1, pena: 1 }, st: '', cat: 'Básico', learn: 'cacador' },
  { out: 'zarabatana', n: 1, in: { graveto: 2, fita: 1, corda: 1 }, st: '', cat: 'Básico', learn: 'cacador' },
  { out: 'armadilha_laco', n: 1, in: { corda: 2, graveto: 3 }, st: '', cat: 'Básico', learn: 'cacador' },
  { out: 'armadilha_tronco', n: 1, in: { madeira: 4, corda: 2 }, st: 'bancada', cat: 'Bancada', learn: 'cacador' },
  { out: 'efigie', n: 1, in: { osso: 6, tecido_vivo: 2, madeira: 2 }, st: '', cat: 'Básico', learn: 'selvagem' },
  { out: 'porrete_ossos', n: 1, in: { osso: 6, madeira: 1, corda: 1 }, st: '', cat: 'Básico', learn: 'selvagem' },
  { out: 'armadura_ossos', n: 1, in: { osso: 12, couro: 3, corda: 2 }, st: 'costura', cat: 'Costura', learn: 'selvagem' },
  { out: 'roupa_folhas', n: 1, in: { fibra: 10, corda: 2, resina: 1 }, st: 'costura', cat: 'Costura', learn: 'sobrevivencia' },
  { out: 'casaco_pele', n: 1, in: { pele_branca: 4, couro: 2, corda: 1 }, st: 'costura', cat: 'Costura', learn: 'frio' },
  { out: 'gorro', n: 1, in: { pano: 3, fibra: 2 }, st: 'costura', cat: 'Costura', learn: 'frio' },
  { out: 'chocolate_quente', n: 1, in: { chocolate: 1, agua: 1 }, st: 'fogueira', cat: 'Cozinha', learn: 'frio' },
  { out: 'tambor_fogo', n: 1, in: { sucata: 4, carvao: 2 }, st: 'bancada', cat: 'Bancada', learn: 'frio' },
  { out: 'bomba_fumaca', n: 2, in: { polvora: 1, pano: 1, enxofre: 1 }, st: 'quimica', cat: 'Química', learn: 'quimica' },
  { out: 'besta_repeticao', n: 1, in: { besta: 1, pecas_arma: 2, lingote: 2 }, st: 'armeiro', cat: 'Armeiro', learn: 'armeiro', eng: 2 },
  { out: 'efigie_ressonante', n: 1, in: { coracao_eco: 1, osso: 8, cristal: 2 }, st: '', cat: 'Básico', flag: 'receita_ressonante' },
);

/* ------------------------------- saques ------------------------------- */
addLoot('militar', [['bomba_fumaca', .2, 1, 2]]);
addLoot('policia', [['bomba_fumaca', .12, 1, 1]]);
addLoot('casa', [['gorro', .05, 1, 1]]);
Object.assign(LOOT, {
  chale: [['gorro', .3, 1, 1], ['chocolate', .5, 1, 3], ['cafe', .4, 1, 2], ['feijao', .4, 1, 2], ['pano', .4, 1, 2], ['lanterna', .08, 1, 1], ['machado_gelo', .08, 1, 1], ['corda', .4, 1, 2], ['sardinha', .3, 1, 2]],
  antena: [['eletronica', .8, 1, 3], ['pilha', .6, 1, 3], ['fio', .7, 1, 3], ['fita', .4, 1, 2], ['peca_radio', .2, 1, 1], ['sucata', .6, 1, 3]],
  pesca: [['peixe_cru', .7, 1, 3], ['vara', .3, 1, 1], ['corda', .5, 1, 2], ['gorro', .2, 1, 1], ['chocolate', .3, 1, 1], ['garrafa', .4, 1, 2]],
  mosteiro: [['calmante', .4, 1, 2], ['bandagem', .5, 1, 2], ['pao_milho', .4, 1, 2], ['mel', .4, 1, 2], ['pano', .5, 1, 2], ['cha', .3, 1, 1], ['erva', .5, 1, 3]],
  aldeia: [['osso', .8, 2, 5], ['couro', .5, 1, 2], ['erva', .5, 1, 3], ['lanca_selvagem', .25, 1, 1], ['tecido_vivo', .4, 1, 2], ['cristal', .15, 1, 1], ['corda', .4, 1, 2], ['carne_seca', .3, 1, 2]],
  mala: [['pano', .6, 1, 3], ['chocolate', .4, 1, 2], ['remedio', .2, 1, 1], ['antibiotico', .12, 1, 1], ['pilha', .3, 1, 2], ['refri', .3, 1, 1], ['biscoito', .4, 1, 2], ['mapa_regiao', .1, 1, 1], ['adrenalina', .06, 1, 1]],
  cacador: [['flecha', .7, 4, 10], ['bala_rifle', .4, 2, 6], ['couro', .6, 1, 3], ['carne_seca', .5, 1, 3], ['corda', .5, 1, 2], ['armadilha_laco', .3, 1, 1], ['flecha_fogo', .2, 2, 4], ['gorro', .15, 1, 1]],
  garimpo: [['minerio', .7, 2, 4], ['cristal', .3, 1, 2], ['carvao', .5, 1, 3], ['polvora', .3, 1, 2], ['picareta_ferro', .06, 1, 1], ['lingote', .3, 1, 2]],
  caverna: [['cristal', .6, 1, 3], ['minerio', .5, 1, 3], ['bandagem', .3, 1, 1], ['osso', .6, 1, 3], ['pilha', .3, 1, 2], ['tecido_vivo', .4, 1, 2], ['kit', .08, 1, 1]],
});

/* ------------------------------ história ------------------------------ */
const N3 = NOTES.length;
NOTES.push(
  ['Diário de bordo, voo 2207', 'Turbulência desde a decolagem. Às 23h12 o comandante disse que viu luz vermelha subindo da serra, "como uma veia". Às 23h14 os instrumentos morreram todos juntos. Se alguém ler isto, éramos 48.'],
  ['Caderno de campo de Ramires, pág. 12', 'Eles não são monstros. Comem o Tecido em pequenas doses, misturado com cinza de cristal, e o Tecido... respeita. Mas cada mês um deles para de falar. E o Xamã diz que foi "chamado para baixo".'],
  ['Aviso na Estação de Esqui', 'ESTAÇÃO FECHADA POR TEMPO INDETERMINADO. Temperatura anormal: neve em novembro. A Defesa Civil pede que ninguém suba ao planalto. "O frio vem de baixo", disse o técnico. Ninguém entendeu.'],
  ['Placa do Mosteiro das Neves', 'Aqui as irmãs rezam pelo vale desde 1888. Se você chegou até aqui, entre, coma, durma. Só não abra a porta da cripta. Ela foi fechada por dentro.'],
  ['Caderno do caçador', 'Os Selvagens rodeiam antes de atacar. Ficam no limite da luz, batendo lança com lança. Se você ficar de frente, eles hesitam. Se correr, acabou. E nunca, nunca siga um que está ferido: é isca.'],
  ['Inscrição na parede da caverna', 'Riscado fundo na pedra, à luz de cristal: braços, braços, braços, um círculo de gente ajoelhada. E embaixo, com letra de criança da escola: "ele escuta".'],
);
const QUESTS3 = {
  q3_serra: { title: 'Além da Serra', desc: 'O Tremor abriu passagens na serra que cercava o vale: uma a leste, para o planalto, e outra ao sul, para a mata. Ninguém sabe o que tem do outro lado.', obj: [{ t: 'ev', ev: 'reach3', n: 1, txt: 'Atravesse uma das passagens da serra' }], xp: 250, next: 'q3_pico', end: [['eu', 'Neve. Em novembro. E pegadas descalças, recentes, descendo para a mata.']] },
  q3_pico: { title: 'Fumaça no Planalto', desc: 'Tem fumaça de chaminé na Vila do Pico, no Planalto Gelado, a leste.', seq: 1, obj: [{ t: 'ev', ev: 'reach:vilapico', n: 1, txt: 'Chegue à Vila do Pico' }, { t: 'ev', ev: 'talk:ramires', n: 1, txt: 'Fale com quem acendeu o fogo' }], xp: 300, next: 'q3_aldeia', give: { gorro: 1, chocolate_quente: 2 }, end: [
      ['ramires', 'Não corra e não grite. Você grita, eles vêm.'],
      ['eu', 'Eles quem?'],
      ['ramires', 'O povo da mata. Os Selvagens. Eu sou Otávio Ramires, antropólogo. Vim estudar comunidades isoladas e fiquei preso do lado errado da serra.'],
      ['ramires', 'Eles comem o Tecido. Pouco, misturado com cinza de cristal. E não viraram aquelas coisas do vale. Não de todo. Mas rodeiam, testam, caçam em grupo.'],
      ['ramires', 'Meus cadernos ficaram na aldeia deles, na Mata Funda, ao sul. Se você conseguir trazer de volta, eu te conto o que eles adoram lá embaixo. E te ensino a passar por eles sem virar comida.']] },
  q3_aldeia: { title: 'O Povo da Mata', desc: 'Os cadernos do Dr. Ramires ficaram na Aldeia dos Selvagens, no meio da Mata Funda, ao sul da serra.', seq: 1, obj: [{ t: 'ev', ev: 'reach:aldeia', n: 1, txt: 'Encontre a Aldeia dos Selvagens' }, { t: 'have', id: 'diario_ramires', n: 1, txt: 'Recupere os cadernos de campo' }, { t: 'ev', ev: 'deliver:ramires', n: 1, txt: 'Leve os cadernos ao Dr. Ramires' }], xp: 500, next: 'q3_caverna', take: { diario_ramires: 1 }, give: { mascara_osso: 1, cadernos_aldeia: 1 }, end: [
      ['ramires', 'Você entrou na aldeia e voltou. Eles devem estar furiosos. Ou impressionados.'],
      ['ramires', 'Leve esta máscara. Foi um presente do Xamã, quando ainda conversávamos. Com ela na mochila, eles pensam duas vezes antes de atacar.'],
      ['ramires', 'E leia isto: copiei como eles fazem as efígies. Ossos e Tecido amarrados na forma certa. As criaturas reconhecem e mantêm distância.'],
      ['ramires', 'Agora o pior. Eles adoram uma coisa nas Cavernas do Eco, a oeste da aldeia. Chamam de "o que escuta". Eu chamo de Mil-Braços.']] },
  q3_caverna: { title: 'O que Escuta', desc: 'O Dr. Ramires acredita que o coração do Mil-Braços, no fundo das Cavernas do Eco, pode virar uma efígie que nunca apaga. Leve muita luz.', seq: 1, obj: [{ t: 'ev', ev: 'reach:cavernas', n: 1, txt: 'Entre nas Cavernas do Eco' }, { t: 'ev', ev: 'kill:milbracos', n: 1, txt: 'Derrote o Mil-Braços' }, { t: 'have', id: 'coracao_eco', n: 1, txt: 'Pegue o Coração do Eco' }, { t: 'ev', ev: 'talk:ramires', n: 1, txt: 'Volte ao Dr. Ramires' }], xp: 900, next: 'q3_efigie', flag: 'receita_ressonante', end: [
      ['ramires', 'Ele ainda bate. Na sua mão. Meu Deus.'],
      ['ramires', 'Ossos, cristal e o coração, na ordem dos desenhos. Monte a Efígie Ressonante no meio da sua base. Nenhuma criatura comum vai chegar perto. Nunca mais.'],
      ['ramires', 'E sem o Mil-Braços, os Selvagens vão precisar de outra coisa para adorar. Torço para que seja você, e não a sua carne.']] },
  q3_efigie: { title: 'A Efígie Ressonante', desc: 'Monte a Efígie Ressonante com o Coração do Eco, 8 ossos e 2 cristais.', obj: [{ t: 'ev', ev: 'place:efigie_ressonante', n: 1, txt: 'Monte a Efígie Ressonante' }], xp: 600, give: { kit: 2, chocolate_quente: 3 }, end: [['eu', 'A noite inteira, nada se aproximou do fogo. Só os olhos, lá longe, olhando a efígie como quem olha um santo.']] },
  s3_voo: { title: 'Voo 2207', desc: 'Um avião caiu na Mata Funda na noite do Tremor. As malas ainda estão espalhadas pelo mato.', obj: [{ t: 'ev', ev: 'mala', n: 6, txt: 'Vasculhe as malas do avião caído' }], xp: 300, give: { adrenalina: 1, antibiotico: 2 }, end: [['eu', 'Quarenta e oito pessoas. Nenhuma mala tinha um bilhete de volta.']] },
  s3_frio: { title: 'Inverno no Planalto', desc: 'No Planalto Gelado o frio mata devagar. Faça roupa de verdade.', obj: [{ t: 'ev', ev: 'craft:casaco_pele', n: 1, txt: 'Costure um Casaco de Pele' }], xp: 200, give: { chocolate_quente: 2 }, end: [['eu', 'Agora sim. Que venha a neve.']] },
};
for (const k in QUESTS3) { QUESTS3[k].id = k; QUESTS[k] = QUESTS3[k]; }
TIPS.push(
  'Agache com Z: você anda devagar, faz menos barulho e as criaturas demoram mais para notar.',
  'Segure o botão direito com uma arma branca para bloquear. Bloquear gasta fôlego, mas o golpe quase não entra.',
  'Aperte F para um golpe forte: dano dobrado e o inimigo voa longe, mas gasta muito fôlego.',
  'Aperte T para trocar a flecha do arco: comum, de fogo ou envenenada.',
  'No Planalto Gelado, fique perto do fogo e use roupa quente. Comida e bebida quentes também ajudam.',
  'Os Selvagens rodeiam antes de atacar. Fique de frente para eles e não corra.',
);

/* ------------------------- defesa da base (3.0) ------------------------- */
// peças novas de construção (tecla V): metal, portão e seteira (parede com fresta para atirar)
Object.assign(T, { MWALL: 24, GATE: 25, SLIT: 26 }); SOLID[T.MWALL] = SOLID[T.SLIT] = true;
BUILDS.push(
  { id: 'metal', n: 'Parede de Metal', ic: 'placa', tile: 24, hp: 1150, cost: { placa: 1, sucata: 2 }, d: 'A mais forte. Aguenta até o Brutamontes por um bom tempo.' },
  { id: 'portao', n: 'Portão de Metal', ic: 'u_lock', tile: 25, hp: 950, cost: { placa: 1, lingote: 1, sucata: 2 }, d: 'Você passa; as criaturas precisam arrombar. Bem mais duro que a porta de madeira.' },
  { id: 'seteira', n: 'Seteira', ic: 'u_target', tile: 26, hp: 650, cost: { pedra: 5, madeira: 1, sucata: 1 }, d: 'Parede de pedra com uma fresta: bloqueia as criaturas, mas tiros, flechas e torretas passam.' },
);
const WALL_TIER = { parede: 1, pedra: 2, seteira: 2, metal: 3, porta: 1, portao: 3 };
Object.assign(ITEMS, (() => { const o = {
  torreta: { n: 'Torreta Sentinela', ic: 'smg|#3a4a34|#c4a446', w: 6.0, t: 'place', r: 3, d: 'Atira sozinha nas criaturas que aparecerem no alcance. Mira na frente de quem corre, não atira se um sobrevivente estiver na linha de tiro e prioriza quem está atacando a base. Carregue com Munição 9mm (E).' },
  ninho: { n: 'Ninho de Metralhadora', ic: 'smg|#5a4a34|#86683f', w: 8.0, t: 'place', r: 3, d: 'Sacos de areia e uma metralhadora pesada. Entre (E), mire com o mouse e segure o botão para atirar. Esquenta: solte de vez em quando.' },
  kit_blindagem: { n: 'Kit de Blindagem do Exército', ic: 'armor|#4a5a3a|#c4a446', w: 9.0, t: 'util', use: 'blindar', r: 3, d: 'Chapas, torre e metralhadora para a caminhonete. Use perto dela. Blindada, ela aguenta muito mais, atira enquanto você dirige e, estacionada, vigia a base sozinha com a munição do porta-malas.' },
}; for (const k in o) { o[k].id = k; o[k].stack = o[k].t === 'place' ? 3 : 1; } return o; })());
RECIPES.push(
  { out: 'torreta', n: 1, in: { pecas_arma: 2, lingote: 3, eletronica: 2, pilha: 2 }, st: 'armeiro', cat: 'Armeiro', learn: 'armeiro', eng: 2 },
  { out: 'ninho', n: 1, in: { pecas_arma: 2, lingote: 4, madeira: 4, pano: 4 }, st: 'armeiro', cat: 'Armeiro', learn: 'armeiro', eng: 1 },
  { out: 'kit_blindagem', n: 1, in: { placa: 6, lingote: 4, pecas_arma: 3, eletronica: 2 }, st: 'armeiro', cat: 'Armeiro', learn: 'armeiro', eng: 2 },
);
addLoot('militar', [['torreta', .03, 1, 1]]);
TIPS.push('Torretas Sentinela atiram sozinhas. Coloque atrás de uma Seteira: as criaturas não chegam nelas, mas os tiros passam.', 'O Ninho de Metralhadora segura qualquer horda. Só não deixe esquentar demais.', 'Com o Kit de Blindagem, a caminhonete vira um blindado: atira enquanto você dirige e vigia a base quando estacionada.');
