'use strict';
/* ===================== CONSTANTES ===================== */
// 3.0: o mundo cresceu para 400x320. O vale antigo (300x240) continua igual, cercado pela mesma serra.
const TILE = 40, MW = 400, MH = 320, OW = 300, OH = 240, WORLD_W = MW * TILE, WORLD_H = MH * TILE;
const T = { GRASS: 0, FOREST: 1, DIRT: 2, SAND: 3, WATER: 4, DEEP: 5, ROCK: 6, MOUNT: 7, ROAD: 8, FLOOR: 9, WALL: 10, MUD: 11, ASH: 12, BRIDGE: 13, CONC: 14, RAIL: 15, TILED: 16, FENCE: 17, DOOR: 18, WWALL: 19, SWALL: 20, SNOW: 21, ICE: 22, CAVE: 23 };
const SOLID = []; SOLID[T.WATER] = SOLID[T.DEEP] = SOLID[T.MOUNT] = SOLID[T.WALL] = SOLID[T.FENCE] = SOLID[T.WWALL] = SOLID[T.SWALL] = true;
const INDOOR = []; INDOOR[T.FLOOR] = INDOOR[T.TILED] = INDOOR[T.CAVE] = true;
const HOUR_SEC = 30;
const BUILDS = [
  { id: 'piso', n: 'Piso de Madeira', ic: 'b_piso', tile: 9, cost: { madeira: 2 }, d: 'Conta como abrigo: dormir sobre ele evita emboscadas de quem nasce perto.' },
  { id: 'parede', n: 'Parede de Madeira', ic: 'b_pmad', tile: 19, hp: 220, cost: { madeira: 4 }, d: 'Bloqueia criaturas até ser derrubada.' },
  { id: 'pedra', n: 'Parede de Pedra', ic: 'b_pped', tile: 20, hp: 560, cost: { pedra: 6, madeira: 1 }, d: 'Bem mais resistente que a de madeira.' },
  { id: 'porta', n: 'Porta de Madeira', ic: 'b_porta', tile: 18, hp: 260, cost: { madeira: 5, sucata: 1 }, d: 'Você passa; as criaturas precisam arrombar.' },
];
const SAVE_KEY = 'serra_oca_save_v3';
const UNLOCK_KEY = 'serra_unlocks';
const LOOK = {
  skin: ['#e8c4a8', '#c8a288', '#a87858', '#86583a', '#5e3e28'],
  hair: ['#1e1a1a', '#3a2a22', '#6e4a2c', '#a8783a', '#c8b490', '#8a2a22', '#6a6a74'],
  style: [['curto', 'Curto'], ['longo', 'Longo'], ['raspado', 'Raspado'], ['bone', 'Boné']],
  shirt: ['#3a4250', '#5a3a34', '#3a4a34', '#6a5a3a', '#4a3a5a', '#7a2a2a', '#2a2a30', '#8a8478'],
  pants: ['#2a2c34', '#3a3026', '#26302a', '#4a4a52', '#1e1e22'],
};
const ORIGINS = {
  lenhador: { n: 'Lenhador', ic: 'machado_pedra', d: 'Viveu da mata. Começa com um machado de pedra e Lenhador e Mineiro no nível 1.', skill: 'lenhador', items: { machado_pedra: 1 } },
  socorrista: { n: 'Socorrista', ic: 'bandagem', d: 'Trabalhava no posto de saúde. Começa com 3 bandagens e Herbalista no nível 1.', skill: 'herbalista', items: { bandagem: 3 } },
  cacador: { n: 'Caçador', ic: 'arco', d: 'Conhece cada trilha. Começa com arco, 10 flechas e Arqueiro no nível 1.', skill: 'arqueiro', items: { arco: 1, flecha: 10 } },
  mecanico: { n: 'Mecânico', ic: 'kit_reparo', d: 'Consertava tudo na oficina. Começa com kit de reparo, 3 sucatas e Mecânico no nível 1.', skill: 'mecanico', items: { kit_reparo: 1, sucata: 3 } },
};
const NAMES = ['Ana', 'Bruno', 'Clara', 'Diego', 'Elisa', 'Felipe', 'Gabriela', 'Heitor', 'Isabel', 'João', 'Lara', 'Marcos', 'Nina', 'Otávio', 'Paula', 'Rafael', 'Sofia', 'Tiago', 'Vera', 'Yuri'];
const DIFFS = {
  facil: { n: 'Tranquilo', d: 'Para aprender o vale. Ainda assim, a comida acaba e as noites pesam.', dmg: .85, hp: .95, spawn: .85, needs: .85, loot: 1.1, keep: .8 },
  normal: { n: 'Sobrevivente', d: 'Criaturas duras, recursos contados e fome que não espera. A experiência pensada para o jogo.', dmg: 1.25, hp: 1.25, spawn: 1.2, needs: 1.1, loot: 1, keep: .6 },
  aventura: { n: 'Aventura', d: 'Sem história: o vale inteiro aberto, mais recursos, equipamento inicial e os guardiões esperando na pedreira e na cratera. Para se divertir.', dmg: .7, hp: .9, spawn: 1.15, needs: .4, loot: 1.6, keep: 1 },
  dificil: { n: 'Pesadelo', d: 'Criaturas letais e numerosas, quase nada para saquear e um corpo que definha depressa. Morrer custa quase tudo.', dmg: 2.1, hp: 2.0, spawn: 2.1, needs: 1.5, loot: .55, keep: .2 },
};

/* ===================== ITENS ===================== */
// ic: 'forma|cor1|cor2' (desenhado em icons.js)
const ITEMS = {
  // --- materiais
  madeira: { n: 'Madeira', ic: 'log|#6e5238|#a8845a', w: 1.0, t: 'mat', d: 'Tronco cortado. A base de quase tudo.' },
  graveto: { n: 'Graveto', ic: 'sticks|#86683f', w: 0.2, t: 'mat', d: 'Galhos finos. Cabos, flechas e fogo.' },
  pedra: { n: 'Pedra', ic: 'rock|#77747a|#9c999e', w: 1.2, t: 'mat', d: 'Pesada, mas útil.' },
  silex: { n: 'Sílex', ic: 'flint|#383c48|#687084', w: 0.3, t: 'mat', d: 'Lasca afiada. Vira ponta de lança e flecha.' },
  fibra: { n: 'Fibra', ic: 'fiber|#76843f', w: 0.1, t: 'mat', d: 'Capim resistente. Trance para fazer corda.' },
  corda: { n: 'Corda', ic: 'rope|#9c8658', w: 0.3, t: 'mat', d: 'Amarra tudo no lugar.' },
  pano: { n: 'Pano', ic: 'cloth|#aaa294|#7e786c', w: 0.1, t: 'mat', d: 'Retalhos limpos o bastante.' },
  couro: { n: 'Couro', ic: 'hide|#765030|#553820', w: 0.5, t: 'mat', d: 'Pele curtida de animal.' },
  pena: { n: 'Pena', ic: 'feather|#c4c0b2|#86806e', w: 0.02, t: 'mat', d: 'Estabiliza flechas e virotes.' },
  osso: { n: 'Osso', ic: 'bone|#d6ceb4', w: 0.3, t: 'mat', d: 'Sobra de caça. Dá caldo e ferramentas.' },
  resina: { n: 'Resina', ic: 'drop|#b4742a|#e0a850', w: 0.1, t: 'mat', d: 'Seiva de pinheiro. Cola e combustível.' },
  sucata: { n: 'Sucata', ic: 'gear|#767a84', w: 0.8, t: 'mat', d: 'Metal velho. Sempre serve para algo.' },
  minerio: { n: 'Minério de Ferro', ic: 'ore|#66646a|#ac683a', w: 1.5, t: 'mat', d: 'Derreta numa fornalha.' },
  lingote: { n: 'Lingote de Ferro', ic: 'ingot|#7e828e|#b0b4c0', w: 1.0, t: 'mat', r: 1, d: 'Ferro puro para ferramentas de verdade.' },
  placa: { n: 'Placa de Aço', ic: 'plate|#666a76|#989ca8', w: 1.6, t: 'mat', r: 1, d: 'Chapa batida. Blinda armaduras.' },
  carvao: { n: 'Carvão', ic: 'rock|#24242a|#42424c', w: 0.3, t: 'mat', d: 'Combustível e ingrediente de pólvora.' },
  enxofre: { n: 'Enxofre', ic: 'pile|#b09a36|#dcc85c', w: 0.3, t: 'mat', d: 'Cristaliza perto das fendas. Cheira a ovo podre.' },
  polvora: { n: 'Pólvora', ic: 'pile|#2a2a2e|#4c4c54', w: 0.1, t: 'mat', r: 1, d: 'Cuidado com faíscas.' },
  gasolina: { n: 'Gasolina', ic: 'jerry|#963628|#641e14', w: 0.8, t: 'mat', r: 1, d: 'Abastece a caminhonete e os molotovs.' },
  alcool: { n: 'Álcool', ic: 'bottle|#c4d0d4|#e4ecec', w: 0.4, t: 'mat', r: 1, d: 'Desinfeta. Base de remédios.' },
  eletronica: { n: 'Peça Eletrônica', ic: 'chip|#2a5640|#c4a446', w: 0.2, t: 'mat', r: 1, d: 'Circuitos e fios aproveitáveis.' },
  fita: { n: 'Fita Adesiva', ic: 'tape|#868a94|#42444c', w: 0.1, t: 'mat', d: 'Conserta qualquer coisa. Quase.' },
  pecas_arma: { n: 'Peças de Arma', ic: 'parts|#565a64|#868a94', w: 0.4, t: 'mat', r: 2, d: 'Molas, gatilhos e canos. Para a Bancada de Armeiro.' },
  quitina: { n: 'Placa Óssea', ic: 'shell|#c4b89c|#867a64', w: 0.4, t: 'mat', r: 1, d: 'Osso que cresceu onde não devia. Leve e duro.' },
  glandula: { n: 'Bolsa de Bile', ic: 'gland|#86963a|#5a2828', w: 0.2, t: 'mat', r: 1, d: 'Arrancada de um Cuspidor. Não aperte.' },
  tecido_vivo: { n: 'Tecido Vivo', ic: 'flesh|#862a32|#c45656', w: 0.3, t: 'mat', r: 1, d: 'Ainda se contrai na sua mão. Regenera sozinho.' },
  cristal: { n: 'Cristal Abissal', ic: 'crystal|#763a86|#b088c4', w: 0.3, t: 'mat', r: 2, d: 'Pulsa com uma luz que vem de baixo.' },
  // --- comida e bebida
  frutas: { n: 'Frutas Silvestres', ic: 'berries|#3a3a76|#486838', w: 0.1, t: 'food', hunger: 8, thirst: 4, d: 'Doces e seguras.' },
  maca: { n: 'Maçã', ic: 'fruit|#862a2a|#486838', w: 0.2, t: 'food', hunger: 13, thirst: 5, d: 'Caiu de uma árvore.' },
  milho: { n: 'Milho', ic: 'corn|#c4a43a|#58783a', w: 0.3, t: 'food', hunger: 14, d: 'Da plantação abandonada.' },
  cogumelo: { n: 'Cogumelo', ic: 'mush|#863a2a|#d4ccb4', w: 0.1, t: 'food', hunger: 9, d: 'Do tipo comestível. Provavelmente.' },
  carne_crua: { n: 'Carne Crua', ic: 'meat|#983838|#dcc4b4', w: 0.5, t: 'food', hunger: 14, hp: -8, d: 'Comer assim faz mal. Asse na fogueira.' },
  carne_assada: { n: 'Carne Assada', ic: 'meat|#76482a|#c49c6c', w: 0.4, t: 'food', hunger: 38, d: 'Quente e reconfortante.' },
  carne_seca: { n: 'Carne Seca', ic: 'jerky|#5a2a1e|#86482e', w: 0.15, t: 'food', hunger: 22, thirst: -4, d: 'Leve e dura para viagem. Dá sede.' },
  peixe_cru: { n: 'Peixe Cru', ic: 'fish|#66869a|#c4cccc', w: 0.4, t: 'food', hunger: 10, hp: -5, d: 'Melhor assar.' },
  peixe_assado: { n: 'Peixe Assado', ic: 'fish|#96663a|#d4ac7c', w: 0.3, t: 'food', hunger: 32, thirst: 3, d: 'Crocante por fora.' },
  caldo: { n: 'Caldo de Osso', ic: 'bowl|#76583a|#c4ac6c', w: 0.5, t: 'food', hunger: 20, thirst: 26, sanity: 6, d: 'Simples, quente, humano.' },
  ensopado: { n: 'Ensopado', ic: 'bowl|#76583a|#9c5c2a', w: 0.6, t: 'food', hunger: 60, thirst: 18, hp: 10, sanity: 10, r: 1, d: 'A melhor refeição do vale.' },
  feijao: { n: 'Lata de Feijão', ic: 'tin|#868a94|#863a2a', w: 0.4, t: 'food', hunger: 30, thirst: 5, d: 'Validade: ignorar.' },
  pessego: { n: 'Pêssego em Calda', ic: 'tin|#868a94|#c4843a', w: 0.4, t: 'food', hunger: 18, thirst: 20, sanity: 4, d: 'Doce demais. Perfeito.' },
  barra: { n: 'Barra de Cereal', ic: 'bar|#583a22|#c4a446', w: 0.1, t: 'food', hunger: 16, d: 'Energia rápida.' },
  biscoito: { n: 'Biscoito', ic: 'bar|#ac864a|#dccc9c', w: 0.1, t: 'food', hunger: 12, d: 'Meio murcho.' },
  refri: { n: 'Refrigerante', ic: 'can|#862a2a|#d4ccc4', w: 0.4, t: 'food', thirst: 28, sleep: 6, d: 'Morno, mas é açúcar.' },
  energetico: { n: 'Energético', ic: 'can|#2a2a34|#76c43a', w: 0.3, t: 'food', thirst: 15, sleep: 36, sanity: -6, d: 'Segura o sono. Deixa você tremendo.' },
  cafe: { n: 'Café', ic: 'cup|#d4ccc4|#3a281a', w: 0.3, t: 'food', thirst: 10, sleep: 28, sanity: 4, d: 'Empurra o sono por mais algumas horas.' },
  garrafa: { n: 'Garrafa Vazia', ic: 'bottle|#869c9c|', w: 0.1, t: 'util', d: 'Encha em um lago, rio ou poço.' },
  agua_suja: { n: 'Água Suja', ic: 'bottle|#869c9c|#66663a', w: 0.5, t: 'food', thirst: 28, hp: -6, back: 'garrafa', d: 'Ferva na fogueira antes de beber.' },
  agua: { n: 'Água Limpa', ic: 'bottle|#869c9c|#4886ac', w: 0.5, t: 'food', thirst: 42, back: 'garrafa', d: 'Fresca e segura.' },
  cha: { n: 'Chá de Ervas', ic: 'cup|#d4ccc4|#66863a', w: 0.5, t: 'food', thirst: 34, hp: 12, sleep: 5, sanity: 14, back: 'garrafa', r: 1, d: 'Acalma o corpo e a cabeça.' },
  // --- medicina
  erva: { n: 'Erva Medicinal', ic: 'leaf|#487838|#2a4822', w: 0.05, t: 'med', hp: 8, d: 'Mastigue para aliviar a dor.' },
  bandagem: { n: 'Bandagem', ic: 'bandage|#d4ccbc|#982a2a', w: 0.1, t: 'med', hp: 28, d: 'Estanca ferimentos.' },
  kit: { n: 'Kit Médico', ic: 'medkit|#982a2a|#e4dccc', w: 0.5, t: 'med', hp: 75, r: 2, d: 'Tratamento completo.' },
  soro: { n: 'Soro Regenerativo', ic: 'syringe|#c4cccc|#982a56', w: 0.2, t: 'med', hp: 45, regen: 40, sanity: -8, r: 2, d: 'Feito de Tecido Vivo. Cura na hora e continua curando. Você prefere não pensar no porquê.' },
  remedio: { n: 'Remédio Antisséptico', ic: 'pills|#4e7a34|#dce4cc', w: 0.05, t: 'med', inf: -15, r: 1, d: 'Segura o avanço do Tecido no sangue. Tira um pouco da infecção, mas não cura.' },
  antidoto: { n: 'Antídoto do Tecido', ic: 'syringe|#c4cccc|#5aa83a', w: 0.2, t: 'med', inf: -100, r: 2, d: 'A fórmula do exército. Limpa o Tecido do sangue por completo.' },
  calmante: { n: 'Calmante', ic: 'pills|#c4843a|#e4dccc', w: 0.05, t: 'med', sanity: 45, r: 1, d: 'Devolve a sanidade. As vozes se calam.' },
  // --- armas brancas e ferramentas
  faca: { n: 'Faca de Sílex', ic: 'knife|#687084|#6e5238', w: 0.4, t: 'melee', held: 'knife', dmg: 12, range: 40, arc: 1.3, cd: .3, stam: 5, kb: 90, dur: 90, d: 'Rápida e leve.' },
  porrete: { n: 'Porrete', ic: 'club|#6e5238|#a8845a', w: 1.4, t: 'melee', held: 'club', dmg: 17, range: 48, arc: 1.9, cd: .58, stam: 10, kb: 260, dur: 90, d: 'Golpe largo que empurra longe.' },
  taco_pregos: { n: 'Porrete com Pregos', ic: 'club|#6e5238|#b0b4c0|1', w: 1.7, t: 'melee', held: 'club', iron: 1, r: 1, dmg: 26, range: 48, arc: 1.9, cd: .58, stam: 11, kb: 260, dur: 130, d: 'O mesmo porrete, com más intenções.' },
  machado_pedra: { n: 'Machado de Pedra', ic: 'axe|#6e5238|#8c898e', w: 1.5, t: 'melee', held: 'axe', dmg: 13, range: 46, arc: 1.6, cd: .55, stam: 8, kb: 140, dur: 80, chop: 1.4, d: 'Derruba árvores. Serve de arma.' },
  picareta_pedra: { n: 'Picareta de Pedra', ic: 'pick|#6e5238|#8c898e', w: 1.6, t: 'melee', held: 'pick', dmg: 10, range: 46, arc: 1.3, cd: .6, stam: 9, kb: 120, dur: 80, mine: 1, chop: .3, d: 'Quebra rochas e veios de minério.' },
  lanca_madeira: { n: 'Lança de Madeira', ic: 'spear|#6e5238|#687084', w: 1.0, t: 'melee', held: 'spear', kind: 'thrust', dmg: 17, range: 82, arc: .42, cd: .5, stam: 8, kb: 160, dur: 60, toss: 1, d: 'Longo alcance. Botão direito arremessa.' },
  tocha: { n: 'Tocha', ic: 'torch|#6e5238|#e08a3a', w: 0.5, t: 'melee', held: 'torch', dmg: 8, range: 42, arc: 1.4, cd: .45, stam: 5, kb: 100, dur: 140, light: 250, d: 'Ilumina a noite e segura a sanidade enquanto estiver na mão.' },
  foice: { n: 'Foice', ic: 'sickle|#6e5238|#b0b4c0', w: 0.9, t: 'melee', held: 'sickle', r: 1, dmg: 20, range: 46, arc: 2.3, cd: .42, stam: 7, kb: 110, dur: 150, d: 'Arco enorme. Achada na fazenda.' },
  pe_cabra: { n: 'Pé de Cabra', ic: 'crowbar|#862a2a|#5a1c1c', w: 1.6, t: 'melee', held: 'club', iron: 1, r: 1, dmg: 22, range: 50, arc: 1.5, cd: .5, stam: 9, kb: 220, dur: 320, mine: .5, d: 'Quase indestrutível.' },
  machado_ferro: { n: 'Machado de Ferro', ic: 'axe|#6e5238|#b0b4c0', w: 2.0, t: 'melee', held: 'axe', iron: 1, r: 1, dmg: 23, range: 48, arc: 1.7, cd: .5, stam: 9, kb: 180, dur: 220, chop: 2.6, d: 'Corta madeira como manteiga.' },
  picareta_ferro: { n: 'Picareta de Ferro', ic: 'pick|#6e5238|#b0b4c0', w: 2.0, t: 'melee', held: 'pick', iron: 1, r: 1, dmg: 17, range: 48, arc: 1.3, cd: .52, stam: 9, kb: 140, dur: 220, mine: 2.2, chop: .4, d: 'Minera duas vezes mais rápido.' },
  lanca_ferro: { n: 'Lança de Ferro', ic: 'spear|#6e5238|#b0b4c0', w: 1.6, t: 'melee', held: 'spear', iron: 1, kind: 'thrust', r: 1, dmg: 31, range: 88, arc: .45, cd: .46, stam: 9, kb: 200, dur: 170, toss: 1, d: 'Perfura osso. Botão direito arremessa.' },
  machete: { n: 'Machete', ic: 'machete|#3a281a|#c8ced8', w: 1.2, t: 'melee', held: 'machete', r: 2, dmg: 29, range: 54, arc: 2.1, cd: .4, stam: 8, kb: 150, dur: 200, chop: .8, d: 'Lâmina larga para abrir caminho.' },
  marreta: { n: 'Marreta', ic: 'sledge|#6e5238|#7e828e', w: 4.0, t: 'melee', held: 'sledge', iron: 1, r: 2, dmg: 46, range: 54, arc: 1.5, cd: .95, stam: 18, kb: 460, dur: 260, mine: 1.4, d: 'Lenta e definitiva. Esmaga placas ósseas.' },
  vara: { n: 'Vara de Pesca', ic: 'rod|#6e5238', w: 0.6, t: 'melee', held: 'rod', dmg: 4, range: 40, arc: 1, cd: .5, stam: 4, kb: 40, dur: 40, fish: 1, d: 'Clique perto da água para pescar.' },
  // --- armas à distância
  arco: { n: 'Arco', ic: 'bow|#6e5238|#d4ccb4', w: 0.8, t: 'ranged', held: 'bow', kind: 'bow', dmg: 27, ammo: 'flecha', dur: 130, d: 'Segure para puxar, solte para atirar. Silencioso.' },
  besta: { n: 'Besta', ic: 'crossbow|#6e5238|#7e828e', w: 2.2, t: 'ranged', held: 'crossbow', kind: 'gun', r: 2, dmg: 52, ammo: 'virote', mag: 1, reload: 1.1, cd: .2, spread: .01, speed: 950, noise: 0, bolt: 1, dur: 200, d: 'Um tiro forte e silencioso por vez.' },
  pistola: { n: 'Pistola 9mm', ic: 'pistol|#34363e|#583a22', w: 1.0, t: 'ranged', held: 'pistol', kind: 'gun', r: 2, dmg: 25, ammo: 'municao9', mag: 8, reload: 1.3, cd: .26, spread: .05, speed: 1050, noise: 520, dur: 260, d: 'Confiável. O barulho atrai o que estiver por perto.' },
  revolver: { n: 'Revólver', ic: 'revolver|#565a64|#583a22', w: 1.2, t: 'ranged', held: 'pistol', kind: 'gun', r: 2, dmg: 44, ammo: 'municao9', mag: 6, reload: 2.0, cd: .45, spread: .03, speed: 1150, noise: 600, dur: 300, d: 'Seis tiros pesados. Recarga lenta.' },
  smg: { n: 'Submetralhadora', ic: 'smg|#34363e|#565a64', w: 2.4, t: 'ranged', held: 'smg', kind: 'gun', r: 3, dmg: 15, ammo: 'municao9', mag: 25, reload: 1.8, cd: .085, spread: .1, speed: 1000, noise: 560, dur: 420, d: 'Do arsenal militar. Devora munição.' },
  espingarda: { n: 'Espingarda', ic: 'shotgun|#583a22|#565a64', w: 3.2, t: 'ranged', held: 'shotgun', kind: 'gun', r: 2, dmg: 13, pellets: 7, ammo: 'cartucho', mag: 2, reload: 1.8, cd: .65, spread: .24, speed: 900, noise: 720, dur: 160, d: 'Devastadora de perto.' },
  rifle: { n: 'Rifle de Caça', ic: 'rifle|#583a22|#34363e', w: 3.6, t: 'ranged', held: 'rifle', kind: 'gun', r: 3, dmg: 72, ammo: 'bala_rifle', mag: 5, reload: 2.1, cd: .9, spread: .012, speed: 1500, pierce: 2, noise: 820, dur: 180, d: 'Atravessa mais de um alvo.' },
  flecha: { n: 'Flecha', ic: 'arrow|#86683f|#687084', w: 0.05, t: 'ammo', stack: 40, d: 'Pode ser recuperada às vezes.' },
  virote: { n: 'Virote', ic: 'arrow|#565a64|#b0b4c0', w: 0.06, t: 'ammo', stack: 40, r: 1, d: 'Para a besta.' },
  municao9: { n: 'Munição 9mm', ic: 'bullets|#c4a446|#86683f', w: 0.02, t: 'ammo', stack: 80, r: 1, d: 'Pistola, revólver e submetralhadora.' },
  cartucho: { n: 'Cartucho', ic: 'shells|#983838|#c4a446', w: 0.05, t: 'ammo', stack: 40, r: 1, d: 'Para a espingarda.' },
  bala_rifle: { n: 'Bala de Rifle', ic: 'bullets|#c88a4a|#86583a|1', w: 0.04, t: 'ammo', stack: 40, r: 2, d: 'Para o rifle de caça.' },
  molotov: { n: 'Coquetel Molotov', ic: 'molotov|#66863a|#e08a3a', w: 0.6, t: 'throw', r: 1, stack: 10, d: 'Cria uma poça de fogo. A carne odeia fogo.' },
  bomba: { n: 'Bomba Caseira', ic: 'bomb|#565a64|#c4a446', w: 0.8, t: 'throw', r: 2, stack: 10, d: 'Explode ao cair. Fique longe.' },
  sinalizador: { n: 'Sinalizador', ic: 'flare|#983838|#ffb0a0', w: 0.2, t: 'throw', r: 1, stack: 10, d: 'Luz vermelha por um minuto. Devolve a coragem e paralisa Imitadores.' },
  // --- equipamento
  jaqueta: { n: 'Jaqueta Reforçada', ic: 'vest|#4a4e5c|#34363e', w: 1.2, t: 'armor', def: .1, d: 'Reduz o dano em 10%.' },
  colete_couro: { n: 'Colete de Couro', ic: 'vest|#765030|#553820', w: 2.0, t: 'armor', def: .17, r: 1, d: 'Reduz o dano em 17%.' },
  armadura_quitina: { n: 'Couraça Óssea', ic: 'armor|#c4b89c|#867a64', w: 3.0, t: 'armor', def: .3, r: 2, d: 'Reduz o dano em 30%.' },
  armadura_placas: { n: 'Armadura de Placas', ic: 'armor|#7e828e|#565a64', w: 5.0, t: 'armor', def: .4, r: 2, d: 'Reduz o dano em 40%. Pesa.' },
  colete_balistico: { n: 'Colete Balístico', ic: 'vest|#3a4a34|#26301f', w: 3.0, t: 'armor', def: .44, r: 3, d: 'Reduz o dano em 44%. Padrão militar.' },
  mochila_p: { n: 'Mochila Pequena', ic: 'pack|#765030|#553820', w: 0.5, t: 'pack', cap: 10, slots: 6, r: 1, d: '+10 kg e +6 espaços na mochila.' },
  mochila_g: { n: 'Mochila de Trilha', ic: 'pack|#3a5a66|#26404a', w: 1.0, t: 'pack', cap: 22, slots: 12, r: 2, d: '+22 kg e +12 espaços na mochila.' },
  mochila_m: { n: 'Mochila Militar', ic: 'pack|#3a4a34|#26301f', w: 1.2, t: 'pack', cap: 32, slots: 20, r: 3, d: '+32 kg e +20 espaços na mochila.' },
  lanterna: { n: 'Lanterna', ic: 'flashlight|#34363e|#e8dc9c', w: 0.3, t: 'util', r: 2, d: 'Ilumina a noite só de estar na mochila.' },
  kit_reparo: { n: 'Kit de Reparo', ic: 'wrench|#868a94|#983838', w: 0.5, t: 'util', r: 1, use: 'repair', d: 'Restaura por completo a durabilidade do item que está na sua mão.' },
  // --- construções
  fogueira: { n: 'Fogueira', ic: 'fire|#6e5238|#e08a3a', w: 3.0, t: 'place', d: 'Luz, calor e cozinha. Afasta emboscadas durante o sono.' },
  cama: { n: 'Cama de Palha', ic: 'bed|#a89858|#d4ccbc', w: 2.0, t: 'place', d: 'Durma para recuperar o sono. Define o ponto de retorno.' },
  bancada: { n: 'Bancada', ic: 'bench|#86683f|#868a94', w: 5.0, t: 'place', d: 'Ferramentas e construções.' },
  fornalha: { n: 'Fornalha', ic: 'furnace|#77747a|#e08a3a', w: 6.0, t: 'place', d: 'Funde minério em lingotes e placas.' },
  costura: { n: 'Mesa de Costura', ic: 'bench|#86683f|#aaa294|1', w: 4.0, t: 'place', r: 1, d: 'Roupas, armaduras e mochilas.' },
  quimica: { n: 'Mesa de Química', ic: 'bench|#565a64|#66863a|2', w: 4.0, t: 'place', r: 1, d: 'Pólvora, remédios e explosivos.' },
  armeiro: { n: 'Bancada de Armeiro', ic: 'bench|#34363e|#c4a446|3', w: 7.0, t: 'place', r: 2, d: 'Armas de fogo, munição e armas brancas aprimoradas.' },
  bau: { n: 'Baú', ic: 'chest|#86583a|#c4a446', w: 3.0, t: 'place', d: 'Guarde o que pesa na mochila.' },
  lampiao: { n: 'Lampião', ic: 'lamp|#565a64|#e8c86c', w: 1.0, t: 'place', r: 1, d: 'Luz fixa. Mantém a sanidade e afasta emboscadas.' },
  coletor: { n: 'Coletor de Chuva', ic: 'barrel|#3a5a66|#4886ac', w: 3.0, t: 'place', r: 1, d: 'Junta água limpa com o tempo. Encha suas garrafas.' },
  espinhos: { n: 'Armadilha de Espinhos', ic: 'spikes|#86683f', w: 1.5, t: 'place', d: 'Fere tudo que pisar nela.' },
  armadilha_urso: { n: 'Armadilha de Urso', ic: 'beartrap|#7e828e|#565a64', w: 2.0, t: 'place', r: 1, d: 'Fecha uma vez, com força, e prende a presa.' },
  barricada: { n: 'Barricada', ic: 'barricade|#86683f', w: 3.0, t: 'place', d: 'Bloqueia a passagem das criaturas.' },
  // --- extras de criação
  lanca_osso: { n: 'Lança de Osso', ic: 'spear|#6e5238|#d6ceb4', w: 1.1, t: 'melee', held: 'spear', kind: 'thrust', dmg: 23, range: 84, arc: .42, cd: .5, stam: 8, kb: 170, dur: 95, toss: 1, d: 'Ponta de osso lascado. Mais forte que a de sílex, sem precisar de forja.' },
  tocha_resina: { n: 'Tocha de Resina', ic: 'torch|#4a3626|#f0b050', w: 0.6, t: 'melee', held: 'torch', r: 1, dmg: 10, range: 42, arc: 1.4, cd: .45, stam: 5, kb: 100, dur: 340, light: 330, d: 'Queima por muito mais tempo e ilumina mais longe.' },
  racao: { n: 'Ração de Viagem', ic: 'bar|#5a3a22|#86963a', w: 0.2, t: 'food', hunger: 46, thirst: -3, r: 1, d: 'Carne seca, fruta e milho prensados. Leve e sustenta.' },
  pao_milho: { n: 'Pão de Milho', ic: 'bar|#c4a43a|#e4d08a', w: 0.3, t: 'food', hunger: 30, sanity: 5, d: 'Assado na pedra quente. Tem gosto de casa.' },
  suco: { n: 'Suco de Frutas', ic: 'bottle|#869c9c|#6a3a7a', w: 0.5, t: 'food', thirst: 40, hunger: 6, sanity: 6, back: 'garrafa', d: 'Doce e fresco.' },
  atadura_viva: { n: 'Atadura Viva', ic: 'bandage|#c45656|#4a141e', w: 0.2, t: 'med', hp: 34, regen: 26, sanity: -5, r: 1, d: 'Pano costurado com Tecido Vivo. Ela aperta sozinha. Funciona.' },
  frasco_bile: { n: 'Frasco de Bile', ic: 'molotov|#86963a|#c8d85a', w: 0.5, t: 'throw', r: 1, stack: 10, d: 'Abre uma poça corrosiva silenciosa, que dura mais que o fogo.' },
  muro: { n: 'Muro de Pedra', ic: 'wall|#77747a|#9c999e', w: 6.0, t: 'place', r: 1, d: 'Bem mais resistente que a barricada. As criaturas precisam derrubá-lo.' },
  // --- missão
  bateria: { n: 'Bateria de Carro', ic: 'battery|#2a2c34|#c4a446', w: 3.0, t: 'quest', r: 1, d: 'Ainda segura carga.' },
  peca_radio: { n: 'Peça de Rádio', ic: 'radio|#565a64|#c4a446', w: 0.3, t: 'quest', r: 2, d: 'Componente para a torre de transmissão.' },
  carga: { n: 'Carga Sísmica', ic: 'dynamite|#983838|#c4a446', w: 1.5, t: 'quest', r: 2, stack: 5, d: 'Use numa fenda para selá-la. Depois, corra.' },
  amostra: { n: 'Amostra do Paciente Zero', ic: 'sample|#c4cccc|#862a32', w: 0.2, t: 'quest', r: 3, d: 'Um frasco lacrado. O conteúdo bate contra o vidro.' },
  medalhao: { n: 'Medalhão de Marta', ic: 'locket|#c4a446|#86683f', w: 0.05, t: 'quest', r: 2, d: 'Uma foto antiga dentro. Tomé, bem mais novo, sorrindo.' },
  cartao: { n: 'Cartão de Acesso', ic: 'card|#d4ccbc|#3a4a34', w: 0.01, t: 'quest', r: 2, d: 'Exército. Abre o arsenal da Zona de Quarentena.' },
  registro: { n: 'Registros de Perfuração', ic: 'card|#b0a078|#4a3a34', w: 0.3, t: 'quest', r: 3, d: 'As leituras originais da Ferro Fundo: profundidade, frequência, tudo.' },
  detonador: { n: 'Detonador Militar', ic: 'radio|#3a4a34|#c83a3a', w: 0.6, t: 'quest', r: 3, d: 'Gatilho de demolição do exército. O mesmo que fechou os túneis.' },
  nucleo: { n: 'Núcleo Ressonante', ic: 'core|#4ab8d8|#aef4ff', w: 0.5, t: 'quest', r: 3, d: 'O coração cristalino do Alfa. Vibra na sua mão.' },
  carga_omega: { n: 'Carga Ômega', ic: 'dynamite|#763a86|#aef4ff|1', w: 2.0, t: 'quest', r: 3, d: 'Forte o bastante para fechar a Grande Fenda.' },
};
for (const k in ITEMS) { const it = ITEMS[k]; it.id = k; it.r = it.r || 0; if (!it.stack) it.stack = it.dur ? 1 : (it.t === 'place' || it.t === 'armor' || it.t === 'pack' ? 5 : 30); }
for (const k in ITEMS) { const it = ITEMS[k]; if (it.t !== 'food') continue; for (const f of ['hunger', 'thirst', 'hp', 'sanity', 'sleep']) if (it[f] > 0) it[f] = Math.round(it[f] * .7); }
const FIST = { id: 'punho', n: 'Punhos', t: 'melee', dmg: 5, range: 34, arc: 1.2, cd: .36, stam: 3, kb: 80, chop: .4 };
const RARITY = ['#7c8494', '#6fae72', '#5c9cd0', '#b07cd0'];
const TYPE_NAME = { mat: 'Material', food: 'Comida / Bebida', med: 'Medicina', melee: 'Arma branca / Ferramenta', ranged: 'Arma à distância', ammo: 'Munição', armor: 'Armadura', pack: 'Mochila', place: 'Construção', throw: 'Arremessável', quest: 'Item de missão', util: 'Utilidade' };
const STATIONS = ['fogueira', 'bancada', 'fornalha', 'costura', 'quimica', 'armeiro'];

/* ===================== RECEITAS ===================== */
const RECIPES = [
  { out: 'corda', n: 1, in: { fibra: 3 }, st: '', cat: 'Básico' },
  { out: 'machado_pedra', n: 1, in: { graveto: 2, pedra: 2, fibra: 2 }, st: '', cat: 'Básico' },
  { out: 'picareta_pedra', n: 1, in: { graveto: 2, pedra: 3, fibra: 2 }, st: '', cat: 'Básico' },
  { out: 'faca', n: 1, in: { graveto: 1, silex: 1, fibra: 1 }, st: '', cat: 'Básico' },
  { out: 'lanca_madeira', n: 1, in: { graveto: 3, silex: 1, fibra: 2 }, st: '', cat: 'Básico' },
  { out: 'porrete', n: 1, in: { madeira: 2 }, st: '', cat: 'Básico' },
  { out: 'tocha', n: 1, in: { graveto: 2, fibra: 2 }, st: '', cat: 'Básico' },
  { out: 'fogueira', n: 1, in: { madeira: 3, pedra: 3 }, st: '', cat: 'Básico' },
  { out: 'cama', n: 1, in: { fibra: 8, graveto: 4 }, st: '', cat: 'Básico' },
  { out: 'bancada', n: 1, in: { madeira: 6, pedra: 4, corda: 2 }, st: '', cat: 'Básico' },
  { out: 'bandagem', n: 1, in: { pano: 2 }, st: '', cat: 'Básico' },
  { out: 'bandagem', n: 1, in: { fibra: 3, erva: 1 }, st: '', cat: 'Básico' },
  { out: 'arco', n: 1, in: { graveto: 3, corda: 2 }, st: '', cat: 'Básico' },
  { out: 'flecha', n: 4, in: { graveto: 2, silex: 1, pena: 1 }, st: '', cat: 'Básico' },
  { out: 'carne_assada', n: 1, in: { carne_crua: 1 }, st: 'fogueira', cat: 'Cozinha' },
  { out: 'carne_seca', n: 2, in: { carne_crua: 2, carvao: 1 }, st: 'fogueira', cat: 'Cozinha' },
  { out: 'peixe_assado', n: 1, in: { peixe_cru: 1 }, st: 'fogueira', cat: 'Cozinha' },
  { out: 'agua', n: 1, in: { agua_suja: 1 }, st: 'fogueira', cat: 'Cozinha' },
  { out: 'cha', n: 1, in: { agua: 1, erva: 2 }, st: 'fogueira', cat: 'Cozinha' },
  { out: 'caldo', n: 1, in: { osso: 2, agua: 1 }, st: 'fogueira', cat: 'Cozinha' },
  { out: 'ensopado', n: 1, in: { carne_crua: 1, cogumelo: 1, agua: 1 }, st: 'fogueira', cat: 'Cozinha' },
  { out: 'carvao', n: 2, in: { madeira: 2 }, st: 'fogueira', cat: 'Cozinha' },
  { out: 'bau', n: 1, in: { madeira: 6, sucata: 1 }, st: 'bancada', cat: 'Bancada' },
  { out: 'fornalha', n: 1, in: { pedra: 10, carvao: 3 }, st: 'bancada', cat: 'Bancada' },
  { out: 'costura', n: 1, in: { madeira: 5, corda: 3, pano: 2, osso: 1 }, st: 'bancada', cat: 'Bancada' },
  { out: 'quimica', n: 1, in: { madeira: 4, garrafa: 3, sucata: 2, eletronica: 1 }, st: 'bancada', cat: 'Bancada' },
  { out: 'armeiro', n: 1, in: { madeira: 6, lingote: 4, sucata: 4, fita: 1 }, st: 'bancada', cat: 'Bancada' },
  { out: 'espinhos', n: 1, in: { graveto: 5, madeira: 1, corda: 1 }, st: 'bancada', cat: 'Bancada' },
  { out: 'barricada', n: 1, in: { madeira: 5, corda: 1 }, st: 'bancada', cat: 'Bancada' },
  { out: 'lampiao', n: 1, in: { sucata: 2, garrafa: 1, resina: 2 }, st: 'bancada', cat: 'Bancada' },
  { out: 'coletor', n: 1, in: { madeira: 4, pano: 2, sucata: 1 }, st: 'bancada', cat: 'Bancada' },
  { out: 'vara', n: 1, in: { graveto: 2, corda: 1, sucata: 1 }, st: 'bancada', cat: 'Bancada' },
  { out: 'taco_pregos', n: 1, in: { porrete: 1, sucata: 2 }, st: 'bancada', cat: 'Bancada' },
  { out: 'kit_reparo', n: 1, in: { sucata: 2, fita: 1, resina: 1 }, st: 'bancada', cat: 'Bancada' },
  { out: 'lingote', n: 1, in: { minerio: 2, carvao: 1 }, st: 'fornalha', cat: 'Fornalha' },
  { out: 'placa', n: 1, in: { lingote: 2, carvao: 1 }, st: 'fornalha', cat: 'Fornalha' },
  { out: 'lingote', n: 1, in: { sucata: 4, carvao: 1 }, st: 'fornalha', cat: 'Fornalha' },
  { out: 'jaqueta', n: 1, in: { pano: 6, corda: 1 }, st: 'costura', cat: 'Costura' },
  { out: 'mochila_p', n: 1, in: { couro: 2, corda: 2, pano: 2 }, st: 'costura', cat: 'Costura' },
  { out: 'mochila_g', n: 1, in: { couro: 6, corda: 3, sucata: 2 }, st: 'costura', cat: 'Costura' },
  { out: 'colete_couro', n: 1, in: { couro: 5, corda: 2 }, st: 'costura', cat: 'Costura' },
  { out: 'armadura_quitina', n: 1, in: { quitina: 8, couro: 3, corda: 2 }, st: 'costura', cat: 'Costura' },
  { out: 'pano', n: 2, in: { fibra: 6 }, st: 'costura', cat: 'Costura' },
  { out: 'polvora', n: 2, in: { enxofre: 1, carvao: 1 }, st: 'quimica', cat: 'Química' },
  { out: 'alcool', n: 1, in: { frutas: 4, agua: 1 }, st: 'quimica', cat: 'Química' },
  { out: 'kit', n: 1, in: { bandagem: 2, erva: 2, alcool: 1 }, st: 'quimica', cat: 'Química' },
  { out: 'soro', n: 1, in: { tecido_vivo: 2, alcool: 1, glandula: 1 }, st: 'quimica', cat: 'Química' },
  { out: 'calmante', n: 2, in: { erva: 3, cogumelo: 2, alcool: 1 }, st: 'quimica', cat: 'Química' },
  { out: 'remedio', n: 1, in: { erva: 3, alcool: 1 }, st: 'quimica', cat: 'Química' },
  { out: 'antidoto', n: 1, in: { glandula: 2, cristal: 1, alcool: 2, remedio: 1 }, st: 'quimica', cat: 'Química', flag: 'receita_antidoto' },
  { out: 'molotov', n: 1, in: { garrafa: 1, pano: 1, gasolina: 1 }, st: 'quimica', cat: 'Química' },
  { out: 'molotov', n: 1, in: { garrafa: 1, pano: 1, alcool: 1, resina: 1 }, st: 'quimica', cat: 'Química' },
  { out: 'bomba', n: 1, in: { polvora: 2, sucata: 1, fita: 1 }, st: 'quimica', cat: 'Química' },
  { out: 'sinalizador', n: 2, in: { polvora: 1, enxofre: 1, pano: 1 }, st: 'quimica', cat: 'Química' },
  { out: 'carga', n: 1, in: { polvora: 3, sucata: 2, eletronica: 1, fita: 1 }, st: 'quimica', cat: 'Química', flag: 'receita_carga' },
  { out: 'machado_ferro', n: 1, in: { graveto: 2, lingote: 3, corda: 1 }, st: 'armeiro', cat: 'Armeiro' },
  { out: 'picareta_ferro', n: 1, in: { graveto: 2, lingote: 3, corda: 1 }, st: 'armeiro', cat: 'Armeiro' },
  { out: 'lanca_ferro', n: 1, in: { lanca_madeira: 1, lingote: 2, corda: 1 }, st: 'armeiro', cat: 'Armeiro' },
  { out: 'machete', n: 1, in: { lingote: 3, couro: 1, graveto: 1 }, st: 'armeiro', cat: 'Armeiro' },
  { out: 'marreta', n: 1, in: { lingote: 5, madeira: 2, corda: 1 }, st: 'armeiro', cat: 'Armeiro' },
  { out: 'armadilha_urso', n: 1, in: { lingote: 2, sucata: 1 }, st: 'armeiro', cat: 'Armeiro' },
  { out: 'armadura_placas', n: 1, in: { placa: 3, couro: 4, corda: 2 }, st: 'armeiro', cat: 'Armeiro' },
  { out: 'besta', n: 1, in: { madeira: 3, corda: 2, lingote: 1, pecas_arma: 1 }, st: 'armeiro', cat: 'Armeiro' },
  { out: 'virote', n: 4, in: { graveto: 2, lingote: 1, pena: 1 }, st: 'armeiro', cat: 'Armeiro' },
  { out: 'pistola', n: 1, in: { pecas_arma: 2, lingote: 2, fita: 1 }, st: 'armeiro', cat: 'Armeiro', eng: 1 },
  { out: 'espingarda', n: 1, in: { pecas_arma: 3, lingote: 3, madeira: 2 }, st: 'armeiro', cat: 'Armeiro', eng: 2 },
  { out: 'municao9', n: 8, in: { sucata: 1, polvora: 1 }, st: 'armeiro', cat: 'Armeiro', eng: 1 },
  { out: 'cartucho', n: 4, in: { sucata: 1, polvora: 2 }, st: 'armeiro', cat: 'Armeiro', eng: 1 },
  { out: 'bala_rifle', n: 4, in: { lingote: 1, polvora: 2 }, st: 'armeiro', cat: 'Armeiro', eng: 2 },
  { out: 'lanca_osso', n: 1, in: { graveto: 3, osso: 2, corda: 1 }, st: '', cat: 'Básico' },
  { out: 'tocha_resina', n: 1, in: { graveto: 2, pano: 1, resina: 2 }, st: '', cat: 'Básico' },
  { out: 'pao_milho', n: 1, in: { milho: 2, agua: 1 }, st: 'fogueira', cat: 'Cozinha' },
  { out: 'suco', n: 1, in: { frutas: 3, agua: 1 }, st: 'fogueira', cat: 'Cozinha' },
  { out: 'racao', n: 2, in: { carne_seca: 1, frutas: 2, milho: 1 }, st: 'fogueira', cat: 'Cozinha' },
  { out: 'muro', n: 1, in: { pedra: 8, madeira: 2 }, st: 'bancada', cat: 'Bancada' },
  { out: 'atadura_viva', n: 1, in: { pano: 1, tecido_vivo: 1 }, st: 'costura', cat: 'Costura' },
  { out: 'frasco_bile', n: 1, in: { garrafa: 1, glandula: 2 }, st: 'quimica', cat: 'Química' },
];

/* ===================== HABILIDADES ===================== */
const SKILLS = [
  { id: 'combate', n: 'Combate', ic: 'u_sword', c: '#c8584e', s: [
    { id: 'golpe', n: 'Golpe Firme', ic: 'u_fist', d: r => `+${r * 12}% de dano corpo a corpo.` },
    { id: 'folego', n: 'Fôlego de Luta', ic: 'u_wind', d: r => `Ataques custam ${r * 14}% menos estamina.` },
    { id: 'lanceiro', n: 'Lanceiro', ic: 'lanca_ferro', d: r => `Lanças: +${r * 12}% de dano e +${r * 6}% de alcance. Arremessos mais fortes.` },
    { id: 'critico', n: 'Ponto Fraco', ic: 'u_target', d: r => `${r * 7}% de chance de acerto crítico (dano x2) corpo a corpo.` },
    { id: 'varredura', n: 'Varredura', ic: 'u_swirl', d: r => `Golpes em arco ficam ${r * 15}% mais largos e empurram ${r * 20}% mais.` },
  ] },
  { id: 'pontaria', n: 'Pontaria', ic: 'u_target', c: '#c8a04e', s: [
    { id: 'arqueiro', n: 'Arqueiro', ic: 'arco', d: r => `Arco: +${r * 12}% de dano e puxada ${r * 12}% mais rápida.` },
    { id: 'mao_firme', n: 'Mão Firme', ic: 'u_hand', d: r => `Armas de fogo espalham ${r * 22}% menos.` },
    { id: 'recarga', n: 'Recarga Rápida', ic: 'municao9', d: r => `Recarrega ${r * 15}% mais rápido.` },
    { id: 'certeiro', n: 'Tiro Certeiro', ic: 'u_cross', d: r => `${r * 7}% de chance de crítico (dano x2) à distância.` },
    { id: 'economia_m', n: 'Catador de Flechas', ic: 'flecha', d: r => `+${r * 15}% de chance de recuperar flechas e virotes; ${r * 6}% de chance de não gastar munição.` },
  ] },
  { id: 'sobrev', n: 'Sobrevivência', ic: 'fogueira', c: '#6fae72', s: [
    { id: 'estomago', n: 'Estômago de Ferro', ic: 'carne_assada', d: r => `Fome cai ${r * 10}% mais devagar. Comida crua faz menos mal.` },
    { id: 'camelo', n: 'Camelo', ic: 'u_drop', d: r => `Sede cai ${r * 10}% mais devagar.` },
    { id: 'coletor', n: 'Coletor', ic: 'fibra', d: r => `${r * 22}% de chance de recurso extra ao coletar.` },
    { id: 'sono_leve', n: 'Sono Leve', ic: 'u_moon', d: r => `Cansa ${r * 10}% mais devagar e descansa ${r * 15}% mais rápido.` },
    { id: 'herbalista', n: 'Herbalista', ic: 'erva', d: r => `Itens de cura recuperam ${r * 18}% a mais.` },
  ] },
  { id: 'oficio', n: 'Ofício', ic: 'bancada', c: '#5c9cd0', s: [
    { id: 'lenhador', n: 'Lenhador e Mineiro', ic: 'machado_ferro', d: r => `+${r * 25}% de eficiência em árvores e rochas.` },
    { id: 'maos', n: 'Mãos Hábeis', ic: 'kit_reparo', d: r => `Ferramentas e armas duram ${r * 25}% a mais.` },
    { id: 'engenharia', n: 'Engenharia', ic: 'sucata', d: r => ['', 'Libera pistola, munição 9mm e cartuchos no Armeiro.', 'Libera espingarda e balas de rifle.', 'Armadilhas e explosões causam +40% de dano.'][r] },
    { id: 'poupador', n: 'Poupador', ic: 'u_coin', d: r => `${r * 10}% de chance de não gastar materiais ao criar.` },
    { id: 'mecanico', n: 'Mecânico', ic: 'u_car', d: r => `A caminhonete gasta ${r * 15}% menos gasolina e sofre ${r * 15}% menos dano.` },
  ] },
  { id: 'corpo', n: 'Corpo', ic: 'u_heart', c: '#c87ca4', s: [
    { id: 'vigor', n: 'Vigor', ic: 'u_heart', d: r => `+${r * 15} de vida máxima.` },
    { id: 'atleta', n: 'Atleta', ic: 'u_bolt', d: r => `+${r * 15} de estamina máxima e regeneração ${r * 12}% maior.` },
    { id: 'mula', n: 'Mula de Carga', ic: 'mochila_p', d: r => `+${r * 5} kg de capacidade.` },
    { id: 'pele', n: 'Pele Grossa', ic: 'u_shield', d: r => `Recebe ${r * 7}% menos dano.` },
    { id: 'pes', n: 'Pés Leves', ic: 'u_boot', d: r => `+${r * 5}% de velocidade; rolamento custa ${r * 15}% menos.` },
  ] },
  { id: 'mente', n: 'Mente', ic: 'u_eye', c: '#9c84d0', s: [
    { id: 'nervos', n: 'Nervos de Aço', ic: 'u_eye', d: r => `Sanidade cai ${r * 15}% mais devagar.` },
    { id: 'vigilia', n: 'Vigília', ic: 'tocha', d: r => `Luzes que você carrega alcançam ${r * 12}% mais longe.` },
    { id: 'esfolador', n: 'Esfolador', ic: 'faca', d: r => `${r * 25}% de chance de carne, couro, osso ou tecido extra.` },
    { id: 'frieza', n: 'Sangue Frio', ic: 'u_skull', d: r => `Matar uma criatura devolve ${r * 2} de sanidade. Você deixa de ouvir os chamados com ${r * 20}% menos frequência.` },
    { id: 'instinto', n: 'Instinto', ic: 'u_warn', d: r => `Criaturas notam você de ${r * 10}% mais perto. No nível 3, o minimapa mostra criaturas mesmo no escuro.` },
  ] },
];
const SKILL_MAX = 3;

/* ===================== CRIATURAS ===================== */
const ENEMIES = {
  larva: { n: 'Retalho', hp: 12, spd: 118, dmg: 4, r: 8, xp: 3, aggro: 300, drops: [['tecido_vivo', .12, 1]] },
  rastejante: { n: 'Rastejante', hp: 32, spd: 96, dmg: 8, r: 12, xp: 9, aggro: 330, drops: [['quitina', .4, 1], ['osso', .3, 1]] },
  cuspidor: { n: 'Cuspidor', hp: 42, spd: 64, dmg: 10, r: 13, xp: 15, aggro: 380, ranged: 1, drops: [['glandula', .55, 1], ['tecido_vivo', .3, 1]] },
  escavador: { n: 'Escavador', hp: 64, spd: 82, dmg: 14, r: 14, xp: 22, aggro: 420, burrow: 1, drops: [['quitina', .7, 2], ['cristal', .08, 1]] },
  verme: { n: 'Corda de Carne', hp: 46, spd: 138, dmg: 11, r: 10, xp: 18, aggro: 400, snake: 1, drops: [['tecido_vivo', .6, 1], ['osso', .4, 2]] },
  hospedeiro: { n: 'Hospedeiro', hp: 58, spd: 48, dmg: 13, r: 12, xp: 16, aggro: 300, host: 1, drops: [['pano', .25, 1], ['tecido_vivo', .3, 1], ['municao9', .08, 3], ['bandagem', .06, 1]] },
  rasteira: { n: 'Carne Rasteira', hp: 90, spd: 0, dmg: 7, r: 38, xp: 20, aggro: 0, patch: 1, drops: [['tecido_vivo', 1, 2], ['tecido_vivo', .5, 1]] },
  imitador: { n: 'Imitador', hp: 150, spd: 215, dmg: 30, r: 13, xp: 60, aggro: 700, mimic: 1, drops: [['tecido_vivo', 1, 2], ['cristal', .35, 1], ['osso', 1, 2]] },
  saltador: { n: 'Saltador', hp: 70, spd: 104, dmg: 20, r: 12, xp: 28, aggro: 420, leap: 1, drops: [['osso', .4, 1], ['tecido_vivo', .3, 1]] },
  aglomerado: { n: 'Aglomerado', hp: 200, spd: 58, dmg: 22, r: 21, xp: 55, aggro: 380, split: 1, drops: [['tecido_vivo', .6, 2], ['osso', .5, 2], ['quitina', .4, 1]] },
  gritador: { n: 'Gritador', hp: 95, spd: 72, dmg: 6, r: 14, xp: 40, aggro: 460, scream: 1, drops: [['glandula', .4, 1], ['tecido_vivo', .4, 1]] },
  costurado: { n: 'Costurado', hp: 340, spd: 64, dmg: 36, r: 16, xp: 80, aggro: 360, armor: 1, drops: [['sucata', .4, 1], ['tecido_vivo', .6, 2], ['pecas_arma', .1, 1]] },
  lebre: { n: 'Lebre Esfolada', hp: 16, spd: 165, dmg: 6, r: 8, xp: 5, aggro: 340, wild: 1, zig: 1, drops: [['couro', .25, 1], ['osso', .3, 1]] },
  cao: { n: 'Cão do Tecido', hp: 44, spd: 150, dmg: 11, r: 11, xp: 14, aggro: 460, wild: 1, pack: 1, leap: 1, lp: [.28, 560, .3, 50, 190], drops: [['osso', .4, 1], ['couro', .3, 1], ['tecido_vivo', .2, 1]] },
  corvo: { n: 'Corvo Oco', hp: 14, spd: 175, dmg: 7, r: 9, xp: 7, aggro: 420, wild: 1, fly: 1, drops: [['pena', .6, 2], ['tecido_vivo', .1, 1]] },
  cervo_oco: { n: 'Cervo Oco', hp: 150, spd: 92, dmg: 22, r: 15, xp: 34, aggro: 380, wild: 1, charge: 1, drops: [['osso', .7, 2], ['couro', .5, 1], ['tecido_vivo', .4, 1]] },
  urso: { n: 'Urso Aberto', hp: 420, spd: 78, dmg: 38, r: 22, xp: 90, aggro: 400, wild: 1, maul: 1, drops: [['couro', 1, 3], ['osso', 1, 3], ['tecido_vivo', .6, 2]] },
  bruto: { n: 'Brutamontes', hp: 230, spd: 54, dmg: 27, r: 23, xp: 65, aggro: 400, charge: 1, drops: [['quitina', 1, 3], ['cristal', .5, 1], ['tecido_vivo', .6, 2]] },
  colhedor: { n: 'Colhedor', hp: 560, spd: 44, dmg: 42, r: 20, xp: 180, aggro: 230, reaper: 1, drops: [['cristal', 1, 2], ['quitina', 1, 4], ['tecido_vivo', 1, 4], ['osso', 1, 4]] },
  alfa: { n: 'Alfa da Pedreira', hp: 620, spd: 60, dmg: 34, r: 30, xp: 300, aggro: 520, charge: 1, boss: 1, drops: [['nucleo', 1, 1], ['quitina', 1, 6], ['cristal', 1, 3]] },
  mae: { n: 'A Mãe das Profundezas', hp: 1900, spd: 26, dmg: 30, r: 50, xp: 1000, aggro: 900, boss: 1, drops: [['cristal', 1, 8], ['quitina', 1, 10], ['tecido_vivo', 1, 8]] },
};
const ANIMALS = {
  coelho: { n: 'Coelho', hp: 8, spd: 150, r: 8, xp: 4, drops: [['carne_crua', 1, 1], ['couro', .5, 1], ['osso', .4, 1]] },
  cervo: { n: 'Cervo', hp: 34, spd: 170, r: 13, xp: 10, drops: [['carne_crua', 1, 3], ['couro', 1, 2], ['osso', 1, 2]] },
  galinha: { n: 'Galinha', hp: 6, spd: 90, r: 7, xp: 3, drops: [['carne_crua', 1, 1], ['pena', 1, 3]] },
  cachorro: { n: 'Cachorro', hp: 22, spd: 175, r: 10, xp: 6, drops: [['carne_crua', 1, 1], ['couro', .6, 1], ['osso', .5, 1]] },
  corvo: { n: 'Corvo', hp: 4, spd: 210, r: 7, xp: 2, drops: [['pena', 1, 2], ['carne_crua', .3, 1]] },
  urso: { n: 'Urso', hp: 190, spd: 160, r: 20, xp: 30, dmg: 18, brave: 1, drops: [['carne_crua', 1, 4], ['couro', 1, 3], ['osso', 1, 2]] },
};
// Arquivo: boletins no estilo defesa civil, liberados ao encontrar cada criatura
const BESTIARY = {
  larva: 'ORGANISMO CLASSE 1. Fragmentos móveis de tecido. Procuram calor. Não deixe que subam em você. Sozinhos, incomodam. Em grupo, sinalizam algo maior por perto.',
  rastejante: 'ORGANISMO CLASSE 2. Quadrúpede sem pele. Caça pelo som dos passos. Não corra em linha reta. Não se tranque em cômodos sem saída.',
  cuspidor: 'ORGANISMO CLASSE 2. Acumula bile sob pressão. Mantém distância da vítima. Aproxime-se em zigue-zague ou não se aproxime.',
  escavador: 'ORGANISMO CLASSE 3. Desloca-se sob o solo. Se a terra aos seus pés se mexer, ROLE. Não durma ao relento.',
  verme: 'ORGANISMO CLASSE 2. Corpo longo, muscular, extremamente veloz. Morde e recua. Comum em áreas alagadas e na mata fechada.',
  hospedeiro: 'ATENÇÃO. Estes indivíduos NÃO SÃO MAIS SEUS VIZINHOS. Andam devagar até notarem você. Depois, não andam mais devagar. Não tente conversar.',
  rasteira: 'ORGANISMO CLASSE 1 (ESTÁTICO). Tapete de tecido vivo. Agarra o que pisa nele. Cresce no escuro e dentro de casas vazias. O FOGO É EFICAZ.',
  imitador: 'ORGANISMO CLASSE 4. Tem a altura e o contorno de uma pessoa. NÃO É UMA PESSOA. Só se move quando você não está olhando. Mantenha contato visual. Recue devagar. Se ele chamar seu nome, NÃO RESPONDA.',
  saltador: 'ORGANISMO CLASSE 3. Pernas traseiras longas demais, dobradas para trás. Fica imóvel, abaixa o corpo e salta de uma distância que você não esperava. Quando ele se abaixar, ROLE.',
  aglomerado: 'ORGANISMO CLASSE 4. Vários corpos menores fundidos numa massa só, que rola e se arrasta ao mesmo tempo. Quando cai, não morre: se desfaz no que era antes. Tenha munição sobrando.',
  gritador: 'ORGANISMO CLASSE 3. Uma boca vertical do tamanho do tronco. Não ataca: grita. O grito desorienta, chama tudo o que estiver perto e faz o chão parir mais Retalhos. Elimine primeiro.',
  costurado: 'ORGANISMO CLASSE 5. Alto, montado com pedaços de vários moradores presos por fios de tecido. A pele virou couro grosso: projéteis fazem metade do efeito. Se você o ferir, ele corre.',
  lebre: 'ORGANISMO CLASSE 1 (FAUNA). Uma lebre sem pele, com o Tecido costurando os músculos por fora. Anda em grupo e corre em zigue-zague. É pequena, mas não sente dor e não foge mais de ninguém.',
  cao: 'ORGANISMO CLASSE 2 (FAUNA). Os cães do vale, tomados pelo Tecido. Caçam em matilha: cercam a vítima, giram em volta e um deles salta quando você se vira. Se ouvir um uivo ao longe, procure uma parede para encostar as costas.',
  corvo: 'ORGANISMO CLASSE 1 (FAUNA). Corvos com o peito aberto e oco. Voam em bando por cima de muros e cercas, rodeiam a vítima e mergulham um de cada vez. Correr não adianta: eles são mais rápidos.',
  cervo_oco: 'ORGANISMO CLASSE 3 (FAUNA). O que restou de um cervo. A galhada virou osso vivo e não para de crescer. Abaixa a cabeça antes de investir em linha reta e fica atordoado se bater em árvores, rochas ou paredes.',
  urso: 'ORGANISMO CLASSE 4 (FAUNA). Um urso-pardo da mata alta, aberto pelo Tecido. Os poucos ursos da serra sempre evitaram gente; este vem atrás. O peito se abre de cima a baixo como uma segunda boca. Golpes lentos e devastadores; ferido, fica mais rápido. NÃO ENFRENTE SEM PREPARO.',
  bruto: 'ORGANISMO CLASSE 4. Massa de vários corpos fundidos. Investe em linha reta. Fica atordoado ao colidir com paredes e rochas.',
  colhedor: 'ORGANISMO CLASSE 5. Muito alto. Lento. Recolhe os que já caíram. NÃO CORRA. NÃO FAÇA BARULHO. NÃO ILUMINE O ROSTO. Se ele parar e virar na sua direção, já é tarde para os três conselhos.',
  alfa: 'ORGANISMO CLASSE 5. Um Brutamontes antigo, cristalizado. Guarda a pedreira. O cristal no peito responde a frequências sísmicas.',
  mae: 'SEM CLASSIFICAÇÃO. Todas as leituras convergem para a cratera. Tudo o que subiu, subiu a partir dela.',
};
const TAPES = [
  ['Boletim 01 · Defesa Civil de Serra Sangrenta', 'PERMANEÇA EM CASA.\nTranque portas e janelas ao anoitecer.\nSe o chão da sua casa estiver quente, saia imediatamente e não volte para buscar nada.'],
  ['Boletim 03 · Sobre o Tecido', 'O material encontrado nas fendas não é fungo e não é animal.\nNÃO TOQUE. NÃO ALIMENTE.\nSe um animal doméstico tiver contato com o tecido, ele não é mais seu animal doméstico.'],
  ['Boletim 05 · Sobre as Vozes', 'Se alguém chamar seu nome do lado de fora depois de escurecer, NÃO RESPONDA.\nConte os moradores da casa.\nSe todos estiverem dentro, quem está chamando não é um morador.'],
  ['Boletim 08 · Sobre os Altos', 'Foram vistos nas estradas após a meia-noite.\nNão corra. Não ilumine o rosto.\nEles recolhem os que já caíram. Não dê a eles motivo para se confundirem.'],
  ['Boletim 11 · Última Transmissão', 'A evacuação foi cancelada.\nOs túneis não desabaram sozinhos.\nRepetimos: OS TÚNEIS NÃO DESABARAM SOZINHOS.\nFiquem juntos. Mantenham as luzes acesas. Que Deus'],
];

/* ===================== SAQUES ===================== */
const LOOT = {
  casa: [['feijao', .45, 1, 2], ['pano', .3, 1, 1], ['garrafa', .4, 1, 1], ['barra', .35, 1, 2], ['bandagem', .3, 1, 1], ['refri', .25, 1, 1], ['fita', .25, 1, 1], ['cafe', .2, 1, 1], ['corda', .2, 1, 1], ['biscoito', .3, 1, 2], ['pessego', .2, 1, 1], ['municao9', .12, 3, 6], ['calmante', .1, 1, 1]],
  cabana: [['garrafa', 1, 1, 1], ['barra', 1, 2, 2], ['bandagem', 1, 1, 1], ['pano', 1, 2, 2]],
  garagem: [['sucata', .9, 2, 4], ['fita', .5, 1, 2], ['eletronica', .35, 1, 1], ['corda', .4, 1, 2], ['gasolina', .3, 1, 1], ['pano', .12, 1, 1], ['kit_reparo', .15, 1, 1], ['pe_cabra', .1, 1, 1]],
  carro: [['sucata', .9, 1, 3], ['eletronica', .3, 1, 1], ['refri', .2, 1, 1], ['fita', .2, 1, 1], ['pano', .15, 1, 1], ['municao9', .1, 2, 5], ['gasolina', .15, 1, 1]],
  bomba: [['gasolina', 1, 2, 3]],
  fazenda: [['milho', .6, 1, 3], ['corda', .6, 1, 2], ['feijao', .4, 1, 2], ['couro', .4, 1, 2], ['cartucho', .35, 2, 5], ['pena', .5, 2, 4], ['sucata', .4, 1, 2], ['osso', .3, 1, 2]],
  mina: [['minerio', .7, 2, 4], ['carvao', .7, 2, 4], ['polvora', .45, 1, 3], ['sucata', .6, 1, 3], ['bala_rifle', .3, 2, 4], ['bandagem', .3, 1, 1], ['fita', .3, 1, 1]],
  lab: [['remedio', .2, 1, 1], ['eletronica', .7, 1, 2], ['kit', .2, 1, 1], ['bandagem', .5, 1, 2], ['cafe', .5, 1, 2], ['fita', .4, 1, 1], ['alcool', .4, 1, 1], ['municao9', .3, 4, 8]],
  caixa: [['sucata', .5, 1, 2], ['corda', .3, 1, 1], ['feijao', .3, 1, 1], ['pano', .15, 1, 1], ['flecha', .3, 2, 5], ['garrafa', .25, 1, 1], ['resina', .3, 1, 2]],
  mercado: [['feijao', .7, 1, 3], ['pessego', .6, 1, 2], ['biscoito', .6, 1, 3], ['refri', .5, 1, 2], ['energetico', .35, 1, 2], ['cafe', .4, 1, 2], ['barra', .5, 1, 3], ['garrafa', .4, 1, 2], ['fita', .2, 1, 1]],
  hospital: [['remedio', .35, 1, 2], ['bandagem', .7, 1, 3], ['alcool', .6, 1, 2], ['kit', .3, 1, 1], ['calmante', .45, 1, 2], ['pano', .2, 1, 1], ['soro', .08, 1, 1], ['garrafa', .3, 1, 1]],
  policia: [['municao9', .8, 6, 14], ['cartucho', .45, 2, 6], ['pecas_arma', .5, 1, 2], ['bandagem', .3, 1, 1], ['jaqueta', .2, 1, 1], ['sinalizador', .4, 1, 2], ['cafe', .3, 1, 1]],
  militar: [['remedio', .2, 1, 1], ['municao9', .8, 8, 18], ['bala_rifle', .5, 3, 8], ['pecas_arma', .5, 1, 2], ['kit', .3, 1, 1], ['feijao', .5, 1, 2], ['sinalizador', .5, 1, 3], ['bomba', .25, 1, 1], ['energetico', .3, 1, 1]],
  igreja: [['pano', .25, 1, 1], ['garrafa', .4, 1, 2], ['calmante', .3, 1, 1], ['resina', .5, 1, 3], ['cafe', .2, 1, 1]],
  serraria: [['madeira', .9, 3, 6], ['resina', .6, 1, 3], ['corda', .5, 1, 2], ['sucata', .5, 1, 3], ['fita', .3, 1, 1], ['gasolina', .25, 1, 1]],
  trem: [['carvao', .7, 2, 5], ['sucata', .7, 2, 4], ['minerio', .4, 2, 4], ['feijao', .3, 1, 2], ['pecas_arma', .15, 1, 1], ['eletronica', .3, 1, 1], ['lingote', .25, 1, 2]],
  oficina: [['sucata', .9, 2, 5], ['pecas_arma', .3, 1, 1], ['eletronica', .5, 1, 2], ['gasolina', .6, 1, 2], ['fita', .6, 1, 2], ['kit_reparo', .4, 1, 1], ['lingote', .3, 1, 2]],
};

/* ===================== HISTÓRIA ===================== */
const WHO = { eu: ['p_eu', 'Você'], tome: ['p_tome', 'Tomé'], iris: ['p_iris', 'Dra. Íris'], nilo: ['p_nilo', 'Cabo Nilo'], radio: ['peca_radio', 'Rádio'], nar: ['u_book', ''], tv: ['u_tv', 'Transmissão gravada'] };
const INTRO = [
  'Serra Sangrenta era um vale tranquilo, cercado de montanhas, com uma única estrada para entrar e sair.',
  'Então veio o Grande Tremor. Os túneis fecharam. O chão se abriu em fendas quentes, e de dentro delas começou a crescer uma coisa vermelha e úmida que os boletins chamaram apenas de "o Tecido".',
  'O Tecido aprendeu a andar. Depois aprendeu a ficar de pé. Quem sobrou no vale diz que, à noite, ele aprendeu a chamar as pessoas pelo nome.',
  'Você acordou sozinho numa cabana de caça, sete dias depois. Ninguém veio buscar ninguém. O rádio só chia.',
];
const NOTES = [
  ['Diário de Anselmo, pág. 1', 'Os sismógrafos enlouqueceram outra vez. Não é falha tectônica. O sinal tem ritmo. Parece respiração.'],
  ['Diário de Anselmo, pág. 2', 'A mineradora perfurou além do que o laudo permitia. Encontraram uma câmara oca, quente, forrada de algo que os operários descreveram como "carne de parede". Mandaram todo mundo calar a boca.'],
  ['Diário de Anselmo, pág. 3', 'Os cristais vibram quando a gente fala perto deles. Íris acha que respondem a frequência. Eu acho que estão ouvindo. E acho que repassam o que ouvem.'],
  ['Diário de Anselmo, pág. 4', 'Primeiro ataque na pedreira. Elas evitam a luz do dia e voltam para as fendas ao amanhecer. As que ficam dentro das casas não precisam voltar.'],
  ['Diário de Anselmo, pág. 5', 'Uma fenda pequena se fechou depois da detonação de ontem. A onda de choque certa faz a rocha colapsar. Dá para selar. Dá para lutar.'],
  ['Diário de Anselmo, pág. 6', 'Todas as fendas levam à cratera do norte. Tem algo enorme lá embaixo, e tudo o que anda aqui em cima é só a ponta dos dedos dela. Se eu não voltar, digam à Íris que a frequência é a chave.'],
  ['Prontuário 0001, Hospital de Alto Ferro', 'Paciente: operário da mineradora, 34 anos. Ferimento na mão que não cicatriza: cresce. Dia 3: o tecido novo não é dele. Dia 5: o paciente pede para apagarmos a luz. Dia 6: o paciente conhece o nome de todos os enfermeiros do turno da noite. Ninguém se apresentou a ele.'],
  ['Ordem de Operação: Protocolo Lacre', 'Contenção total do Vale de Serra Sangrenta. Demolição controlada dos túneis leste e oeste às 04h00. Nenhum civil autorizado a sair após a hora zero. A tropa remanescente na Zona de Quarentena aguarda extração. Extração: cancelada.'],
  ['Memorando interno, Ferro Fundo Mineração', 'Aos diretores: a câmara encontrada a 1.140 m não é geológica. As paredes reagem às brocas. Recomendação da engenharia: parar. Decisão da diretoria: dobrar o turno e proibir celulares na frente de lavra.'],
  ['Caderno do observatório', 'Há três noites o céu está limpo e eu não olho mais para cima. Olho para a cratera. Ela tem luz própria. Uma luz vermelha, lenta, no ritmo de quem dorme. Hoje à noite o ritmo mudou. Acho que ela acordou.'],
  ['Bilhete na cripta', 'Marta, enterrei o medalhão com você porque não aguentava olhar. Hoje eu aguentaria. Hoje eu queria. Seu, Tomé.'],
];

const QUESTS = {
  q_dia: { main: 1, title: 'O Dia Seguinte', desc: 'Sua cabana está em ruínas e você não tem nada. Junte o básico.', obj: [
      { t: 'have', id: 'madeira', n: 3, txt: 'Junte madeira (bata numa árvore)' }, { t: 'have', id: 'pedra', n: 2, txt: 'Junte pedras do chão' },
      { t: 'ev', ev: 'craft:machado_pedra', n: 1, txt: 'Crie um Machado de Pedra (C)' }],
    xp: 40, next: 'q_fogo', end: [['eu', 'Um machado. Não é muito, mas já não estou de mãos vazias.']] },
  q_fogo: { main: 1, title: 'Fogo e Água', desc: 'Sem água você dura pouco. Sem fogo, a noite dura demais.', obj: [
      { t: 'ev', ev: 'place:fogueira', n: 1, txt: 'Monte uma Fogueira' }, { t: 'ev', ev: 'drink', n: 1, txt: 'Beba água (há um riacho a leste)' }, { t: 'ev', ev: 'eat', n: 1, txt: 'Coma alguma coisa' }],
    xp: 50, next: 'q_noite', end: [['eu', 'O céu está escurecendo. Tenho a impressão de que alguma coisa na mata está esperando por isso.']] },
  q_noite: { main: 1, title: 'A Primeira Noite', desc: 'Eles saem quando escurece. Durma perto do fogo ou entre quatro paredes. No escuro, sua sanidade cai.', obj: [
      { t: 'ev', ev: 'place:cama', n: 1, txt: 'Monte uma Cama de Palha' }, { t: 'ev', ev: 'sleep', n: 1, txt: 'Durma e sobreviva até de manhã' }],
    xp: 80, next: 'q_vila', end: [['eu', 'Sobrevivi. Durante a noite alguém ficou parado na beira da mata, olhando. Não quero pensar nisso. Ao norte tem fumaça de chaminé.']] },
  q_vila: { main: 1, title: 'Fumaça no Horizonte', desc: 'Siga a trilha de terra para o norte até a Vila Serra Sangrenta.', seq: 1, obj: [
      { t: 'ev', ev: 'reach:vila', n: 1, txt: 'Chegue à Vila Serra Sangrenta' }, { t: 'ev', ev: 'talk:tome', n: 1, txt: 'Fale com o sobrevivente' }],
    xp: 100, next: 'q_carro', give: { arco: 1, flecha: 12 }, end: [
      ['tome', 'Fica aí. Fala alguma coisa. Qualquer coisa comprida.'],
      ['eu', 'Eu... acordei numa cabana ao sul. Não sei quanto tempo fiquei apagado. Vi a fumaça e vim.'],
      ['tome', 'Tá bom. Tá bom. É gente. Os outros só sabem repetir pedaço de frase.'],
      ['tome', 'E tem nome, criatura?'],
      ['eu', '{nome}.'],
      ['tome', '{nome}. Bom. Sou Tomé. Era o carteiro. Os túneis fecharam dos dois lados, ninguém sai. O vale agora é a vila, a cidade de Alto Ferro lá no leste, e o que anda entre as duas.'],
      ['tome', 'Tem uma torre de rádio no morro do noroeste. Falta peça. E as peças estão longe. A pé você não volta antes de escurecer.'],
      ['tome', 'Minha caminhonete está ali do lado da praça. Sem bateria e sem gasolina. Arruma isso e ela é sua. Leva meu arco enquanto isso.']] },
  q_carro: { main: 1, title: 'Quatro Rodas', desc: 'A caminhonete de Tomé precisa de uma bateria e de gasolina. O posto fica a leste, depois da ponte.', obj: [
      { t: 'have', id: 'bateria', n: 1, txt: 'Ache uma Bateria de Carro (posto de gasolina)' }, { t: 'have', id: 'gasolina', n: 2, txt: 'Junte Gasolina (bombas do posto)' }, { t: 'ev', ev: 'fixcar', n: 1, txt: 'Conserte a caminhonete na vila' }],
    xp: 160, next: 'q_pecas', end: [['eu', 'Pegou! O motor tosse, mas pegou. Estrada é rápido. Fora dela, nem tanto. E o barulho... o barulho vai chamar atenção.']] },
  q_pecas: { main: 1, title: 'A Voz no Rádio', desc: 'Três peças para a torre. Tomé marcou os lugares no mapa (M): a fazenda, o acampamento da mina e a delegacia de Alto Ferro.', obj: [
      { t: 'have', id: 'peca_radio', n: 3, txt: 'Encontre as Peças de Rádio (fazenda, mina, delegacia)' }],
    xp: 220, next: 'q_torre', end: [['eu', 'Três peças. Agora é subir o morro do noroeste e torcer para a torre funcionar.']] },
  q_torre: { main: 1, title: 'Torre de Transmissão', desc: 'Conserte a torre de rádio no morro do noroeste.', obj: [
      { t: 'ev', ev: 'use:radio', n: 1, txt: 'Instale as peças na Torre de Rádio' }],
    xp: 150, next: 'q_iris', end: [
      ['radio', '...chhh... alguém... chhh... repito, aqui é a Estação Sismológica Serra Sangrenta. Alguém na escuta?'],
      ['eu', 'Estou aqui! Tem gente viva no vale!'],
      ['radio', 'Diga o nome completo da sua mãe.'],
      ['eu', '...O quê?'],
      ['radio', 'Hesitou. Ótimo. Eles nunca hesitam. Sou a Dra. Íris. Venha até a estação, ao norte da torre. As fendas podem ser fechadas.']] },
  q_iris: { main: 1, title: 'Ciência do Abismo', desc: 'A Dra. Íris espera na Estação Sismológica, a nordeste da torre.', seq: 1, obj: [
      { t: 'ev', ev: 'reach:estacao', n: 1, txt: 'Chegue à Estação Sismológica' }, { t: 'ev', ev: 'talk:iris', n: 1, txt: 'Fale com a Dra. Íris' }],
    xp: 150, next: 'q_fendas', give: { eletronica: 2, fita: 2, polvora: 4 }, flag: 'receita_carga', end: [
      ['iris', 'Você veio mesmo. Sente-se. Você está com cara de quem não dorme há dias.'],
      ['iris', 'A mineradora abriu uma câmara que não devia. O Tecido sobe pelas fendas, mas a rocha em volta está instável. Uma onda de choque na frequência certa faz a fenda colapsar.'],
      ['iris', 'Eu projetei uma Carga Sísmica. Pólvora, sucata, uma peça eletrônica e fita. Monte numa Mesa de Química. Tem uma no hospital de Alto Ferro, ou construa a sua.'],
      ['iris', 'Feche pelo menos três. Com menos pontos de saída, eu consigo triangular de onde vem o sinal que comanda todas elas.']] },
  q_fendas: { main: 1, title: 'Fechando as Feridas', desc: 'Crie Cargas Sísmicas numa Mesa de Química e use-as nas fendas marcadas no mapa. Enxofre cresce perto delas.', obj: [
      { t: 'ev', ev: 'seal', n: 3, txt: 'Sele fendas com Cargas Sísmicas' }],
    xp: 300, next: 'q_hospital', end: [
      ['radio', 'Íris na escuta. Os sismógrafos acalmaram. Funcionou!'],
      ['radio', 'Mas tem uma coisa que não fecha. O sinal não é só sísmico. Ele tem... estrutura. Como um sistema nervoso.'],
      ['radio', 'O primeiro caso foi internado no hospital de Alto Ferro. Paciente Zero. Devem ter guardado amostras. Eu preciso de uma. Cuidado: o hospital não ficou vazio.']] },
  q_hospital: { main: 1, title: 'Paciente Zero', desc: 'O Hospital de Alto Ferro guarda uma amostra do primeiro infectado. Leve-a para a Dra. Íris.', seq: 1, obj: [
      { t: 'ev', ev: 'reach:hospital', n: 1, txt: 'Chegue ao Hospital de Alto Ferro' }, { t: 'have', id: 'amostra', n: 1, txt: 'Encontre a Amostra do Paciente Zero' }, { t: 'ev', ev: 'talk:iris', n: 1, txt: 'Leve a amostra à Dra. Íris' }],
    xp: 350, next: 'q_barragem', take: { amostra: 1 }, give: { calmante: 2, kit: 1 }, end: [
      ['iris', 'Deixe-me ver. Meu Deus. Ainda está vivo. Depois de semanas num frasco, ainda está vivo.'],
      ['iris', 'É o que eu temia. Não são criaturas. É uma criatura só. Cada Rastejante, cada Hospedeiro, cada coisa alta parada na estrada é o mesmo organismo, com a mesma vontade.'],
      ['iris', 'Para achar o centro eu preciso ligar o analisador de espectro. E a estação está no gerador de emergência desde o Tremor. A Barragem do Ferro, no extremo nordeste, ainda tem turbinas inteiras.'],
      ['iris', 'Religue o gerador auxiliar da casa de controle. Ele pede gasolina e uma peça eletrônica para dar a partida. E vai fazer barulho. Muito barulho.']] },
  q_barragem: { main: 1, title: 'Luz na Escuridão', desc: 'Religue o gerador da Barragem do Ferro, a nordeste de Alto Ferro. Leve 2 Gasolinas e 1 Peça Eletrônica.', seq: 1, obj: [
      { t: 'ev', ev: 'reach:barragem', n: 1, txt: 'Chegue à Barragem do Ferro' }, { t: 'ev', ev: 'gerador', n: 1, txt: 'Religue o gerador (2 Gasolinas, 1 Peça Eletrônica)' }, { t: 'ev', ev: 'kill:any', n: 8, txt: 'Sobreviva ao que o barulho atraiu' }],
    xp: 400, next: 'q_alfa', end: [
      ['radio', 'Íris na escuta! A estação acendeu inteira. Os postes de Alto Ferro também. O analisador está rodando.'],
      ['radio', 'O centro é a cratera do norte. Uma carga comum não fecha aquilo. Eu preciso de um ressonador natural, e só existe um no vale.'],
      ['radio', 'Há um Brutamontes gigante na pedreira. O Alfa. Ele carrega um núcleo de cristal no peito. Traga para mim. E leve tudo o que tiver de arma.']] },
  q_alfa: { main: 1, title: 'O Guardião da Pedreira', desc: 'Derrote o Alfa na pedreira do nordeste e leve o Núcleo Ressonante à Dra. Íris.', seq: 1, obj: [
      { t: 'ev', ev: 'kill:alfa', n: 1, txt: 'Derrote o Alfa da Pedreira' }, { t: 'ev', ev: 'talk:iris', n: 1, txt: 'Mostre o Núcleo à Dra. Íris' }],
    xp: 400, next: 'q_sede', give: { kit: 2 }, end: [
      ['iris', 'Você conseguiu. Olhe para isso... ele canta. Anselmo tinha razão, a frequência é a chave.'],
      ['iris', 'Mas eu não sei em que nota afinar. Se eu errar por pouco, a carga só vai irritá-la. Quem mediu a câmara original foi a mineradora.'],
      ['iris', 'A sede da Ferro Fundo fica no extremo leste, depois de Alto Ferro, onde a estrada termina no túnel. Os registros de perfuração devem estar lá. Fique com o núcleo por enquanto e traga os registros.']] },
  q_sede: { main: 1, title: 'Ferro Fundo', desc: 'A sede da mineradora, no extremo leste do vale, guarda os registros da perfuração que começou tudo.', seq: 1, obj: [
      { t: 'ev', ev: 'reach:sede', n: 1, txt: 'Chegue à Sede da Ferro Fundo' }, { t: 'have', id: 'registro', n: 1, txt: 'Encontre os Registros de Perfuração' }],
    xp: 400, next: 'q_bunker', end: [
      ['eu', 'Está tudo aqui. A profundidade, a frequência... e um carimbo do exército em cada página. Eles estavam lendo isso junto com a mineradora.'],
      ['radio', 'Íris na escuta. Com os registros eu afino a carga. Mas falta o gatilho: uma detonação dessas precisa de um detonador de demolição, e só o exército tinha.'],
      ['radio', 'Os boletins da Defesa Civil saíam de um bunker no sudeste, depois do aeródromo. Se sobrou alguém ou alguma coisa do exército, está lá.']] },
  q_bunker: { main: 1, title: 'A Voz dos Boletins', desc: 'Os boletins de emergência eram transmitidos de um bunker no extremo sudeste. Procure um detonador militar.', seq: 1, obj: [
      { t: 'ev', ev: 'reach:bunker', n: 1, txt: 'Chegue ao Bunker da Defesa Civil' }, { t: 'ev', ev: 'talk:nilo', n: 1, txt: 'Fale com quem estiver lá dentro' }],
    xp: 400, next: 'q_omega', give: { detonador: 1, municao9: 30, sinalizador: 3 }, end: [
      ['nilo', 'Parado. Mãos onde eu veja. Agora diga que dia é hoje.'],
      ['eu', 'Eu... não sei mais. Perdi a conta depois do Tremor.'],
      ['nilo', 'Resposta certa. Os outros sempre sabem. Cabo Nilo, Defesa Civil. Era eu que lia os boletins. O último eu não terminei porque cortaram a energia.'],
      ['nilo', 'Eu estava no pelotão que fechou os túneis. Protocolo Lacre. Disseram que era por três dias. Depois o rádio do comando só repetia o meu nome, com a voz do meu sargento. O sargento morreu na primeira noite.'],
      ['nilo', 'Você quer um detonador para enterrar aquela coisa? Leve. É o mesmo modelo que usamos para trancar vocês aqui dentro. Que sirva para algo decente desta vez.'],
      ['nilo', 'E escute: no aeródromo ao norte daqui ficou um helicóptero. Sem bateria e sem combustível. Quando acabar, se acabar, ele é a única porta deste vale.']] },
  q_omega: { main: 1, title: 'A Carga Ômega', desc: 'Leve o Núcleo, os Registros e o Detonador para a Dra. Íris montar a carga.', seq: 1, obj: [
      { t: 'have', id: 'nucleo', n: 1, txt: 'Núcleo Ressonante' }, { t: 'have', id: 'registro', n: 1, txt: 'Registros de Perfuração' }, { t: 'have', id: 'detonador', n: 1, txt: 'Detonador Militar' }, { t: 'ev', ev: 'talk:iris', n: 1, txt: 'Entregue tudo à Dra. Íris' }],
    xp: 300, next: 'q_mae', give: { carga_omega: 1, kit: 2, bala_rifle: 10 }, take: { nucleo: 1, registro: 1, detonador: 1 }, end: [
      ['iris', 'Núcleo, frequência, gatilho. Me dê uma hora.'],
      ['iris', 'Pronto. Esta é a Carga Ômega. Ela precisa ser plantada na Grande Fenda, no centro da cratera.'],
      ['iris', 'Mas o centro não é um buraco. É ela. O corpo de onde todo o resto brota. Enquanto ela viver, você não chega perto da fenda.'],
      ['iris', 'A passagem da cratera fica a leste daqui. Vá de dia. E se eu chamar você pelo rádio no caminho pedindo para voltar... não sou eu.']] },
  q_mae: { main: 1, title: 'A Mãe das Profundezas', desc: 'Entre na cratera do norte, derrote a Mãe e plante a Carga Ômega na Grande Fenda.', seq: 1, obj: [
      { t: 'ev', ev: 'reach:cratera', n: 1, txt: 'Entre na Cratera' }, { t: 'ev', ev: 'kill:mae', n: 1, txt: 'Derrote a Mãe das Profundezas' }, { t: 'ev', ev: 'omega', n: 1, txt: 'Plante a Carga Ômega na Grande Fenda' }],
    xp: 1000, next: 'q_fuga', end: [] },
  q_fuga: { main: 1, title: 'A Última Saída', desc: 'O Cabo Nilo falou de um helicóptero no aeródromo, ao sul de Alto Ferro. Ele precisa de 4 Gasolinas e 1 Bateria de Carro.', seq: 1, obj: [
      { t: 'ev', ev: 'reach:aerodromo', n: 1, txt: 'Chegue ao Aeródromo' }, { t: 'have', id: 'gasolina', n: 4, txt: 'Junte Gasolina' }, { t: 'have', id: 'bateria', n: 1, txt: 'Ache uma Bateria de Carro (oficina de Alto Ferro)' }, { t: 'ev', ev: 'heli', n: 1, txt: 'Dê a partida no helicóptero' }],
    xp: 800, end: [] },
  // --- secundárias
  s_caca: { title: 'Controle de Pragas', desc: 'Tomé quer ver menos coisas rondando a vila.', obj: [{ t: 'ev', ev: 'kill:any', n: 25, txt: 'Elimine criaturas' }], xp: 220, give: { municao9: 16, bandagem: 2 }, end: [['radio', 'Tomé aqui. Ouvi dizer que você anda limpando o vale. Deixei um presente na sua mochila enquanto você dormia. Não me pergunte como.']] },
  s_tome: { title: 'A Despensa do Carteiro', desc: 'Tomé está sem comida. Leve 4 Carnes Assadas para ele.', obj: [{ t: 'ev', ev: 'deliver:tome', n: 1, txt: 'Entregue 4 Carnes Assadas a Tomé' }], xp: 150, give: { mochila_p: 1, cafe: 2 }, end: [['tome', 'Carne de bicho. De bicho mesmo. Você é uma bênção. Toma, essa mochila era do meu filho.']] },
  s_medalhao: { title: 'O Medalhão de Marta', desc: 'Tomé enterrou a esposa na igreja ao norte de Alto Ferro, com um medalhão. Ele quer vê-lo de novo.', obj: [{ t: 'have', id: 'medalhao', n: 1, txt: 'Ache o medalhão na cripta da igreja' }, { t: 'ev', ev: 'deliver:medalhao', n: 1, txt: 'Entregue o medalhão a Tomé' }], seq: 1, xp: 300, give: { revolver: 1, municao9: 18 }, take: { medalhao: 1 }, end: [['tome', '...É ela. Olha o tamanho desse sorriso.'], ['tome', 'Uma noite dessas alguém bateu na minha janela com a voz dela. Eu quase abri. Com isso aqui no bolso, eu não abro. Leva meu revólver. Eu não vou precisar apontar ele para a janela.']] },
  s_notas: { title: 'Páginas Perdidas', desc: 'O geólogo Anselmo espalhou seu diário pelo vale. Vasculhe os prédios.', obj: [{ t: 'ev', ev: 'note', n: 6, txt: 'Encontre as páginas do diário' }], xp: 250, give: { cristal: 2 }, end: [['eu', 'Então foi isso. A mineradora cavou fundo demais e o Anselmo morreu tentando avisar.']] },
  s_fitas: { title: 'Fitas de Emergência', desc: 'Televisores pelo vale ainda guardam os boletins da Defesa Civil. Assista a todos.', obj: [{ t: 'ev', ev: 'tape', n: 5, txt: 'Assista aos boletins gravados' }], xp: 300, give: { calmante: 3, sinalizador: 4 }, end: [['eu', '"Os túneis não desabaram sozinhos." Então trancaram a gente aqui dentro com isso.']] },
  s_lacre: { title: 'Protocolo Lacre', desc: 'O exército montou uma Zona de Quarentena a sudeste de Alto Ferro. O arsenal continua trancado.', seq: 1, obj: [{ t: 'ev', ev: 'reach:quarentena', n: 1, txt: 'Chegue à Zona de Quarentena' }, { t: 'have', id: 'cartao', n: 1, txt: 'Ache um Cartão de Acesso' }, { t: 'ev', ev: 'armory', n: 1, txt: 'Abra o arsenal' }], xp: 400, end: [['eu', 'Armas, colete, mochila. E uma ordem assinada mandando demolir os túneis com a gente dentro. Eles sabiam.']] },
  s_cura: { title: 'Sangue Contaminado', desc: 'Cada ferida feita por uma criatura deixa um pouco do Tecido no seu sangue. O Remédio Antisséptico só segura o avanço. O exército estudava uma cura na Zona de Quarentena, a sudeste de Alto Ferro.', seq: 1, obj: [
      { t: 'ev', ev: 'learn:antidoto', n: 1, txt: 'Ache a pesquisa do exército na Zona de Quarentena' }, { t: 'ev', ev: 'craft:antidoto', n: 1, txt: 'Prepare o Antídoto do Tecido numa Mesa de Química' }],
    xp: 250, give: { remedio: 2 }, end: [['eu', 'Se eu for mordido de novo, já sei o que fazer. Melhor guardar uma dose para mais tarde.']] },
  s_paz: { title: 'Vale em Paz', desc: 'Sele todas as dez fendas menores do vale.', obj: [{ t: 'ev', ev: 'seal', n: 10, txt: 'Sele todas as fendas' }], xp: 600, give: { kit: 2, soro: 2 }, end: [['radio', 'Íris na escuta. Nenhuma leitura nas fendas menores. As noites vão ficar mais calmas.']] },
};
for (const k in QUESTS) QUESTS[k].id = k;

const TIPS = [
  'As criaturas das fendas odeiam o sol. As que moram dentro de prédios não precisam sair.',
  'Dormir perto de uma fogueira, de um lampião ou dentro de uma casa evita emboscadas.',
  'Mochila pesada deixa você lento. Guarde o excesso num baú ou no porta-malas da caminhonete.',
  'Tiros e motor fazem barulho. Besta e arco são silenciosos.',
  'Água de lago pode fazer mal. Ferva na fogueira, use o poço da vila ou monte um Coletor de Chuva.',
  'Um Imitador só anda quando você não está olhando. Mire nele e recue.',
  'Sanidade baixa faz você ver e ouvir coisas. Luz, comida quente, chá e calmantes ajudam.',
  'Fogo é o que mais fere o Tecido. Molotovs limpam Carne Rasteira depressa.',
  'Na caminhonete: R abastece, X conserta com sucata, Tab abre o porta-malas.',
];
const WHISPERS = ['"...ei..."', '"...aqui..."', '"...me ajuda..."', '"...abre a porta..."', '"...sou eu..."', '"...volta..."', '"...tá frio aqui fora..."'];

// descrições para o Arquivo
const WEAK = {
  larva: 'Qualquer golpe resolve. Golpes em arco pegam o grupo inteiro.', rastejante: 'Recua com empurrões. Lanças mantêm a distância.', cuspidor: 'Frágil de perto. O projétil é lento: ande de lado.',
  escavador: 'Role quando o chão marcar o círculo vermelho. Fica exposto logo depois de emergir.', verme: 'Ataque no instante em que ele recua da mordida.', hospedeiro: 'Lento até notar você. Tiros de longe antes que ele dispare.',
  rasteira: 'Fogo e bile corrosiva causam dano muito maior. Não entre nela.', imitador: 'Fica imóvel enquanto você olha para ele. Sinalizadores o paralisam.', saltador: 'Role quando ele se encolher. Depois do salto, fica parado por um instante.', aglomerado: 'Ao morrer, solta um Rastejante e dois Retalhos. Fogo e explosões limpam tudo de uma vez.',
  gritador: 'Prioridade máxima. Arco ou besta de longe, antes do primeiro grito.', costurado: 'Armas brancas pesadas e armadilhas de urso. Projéteis fazem metade do dano.',
 lebre: 'Golpes em arco pegam o grupo inteiro. Não fuja: elas correm mais.', cao: 'Encoste numa parede para não ser cercado. Ataque logo depois do salto, enquanto ele se recompõe.', corvo: 'Acerte no instante do mergulho. Espingarda e fogo limpam o bando.',
  cervo_oco: 'Desvie do bote e faça-o bater numa árvore ou rocha: fica atordoado.', urso: 'Role para longe quando ele se erguer. Armadilhas de urso, lanças e distância.',
 bruto: 'Faça-o investir contra uma parede ou rocha: fica atordoado.',
  colhedor: 'Não corra perto dele. Armadilhas de urso e explosivos; ou simplesmente evite.', alfa: 'Mesma fraqueza do Brutamontes. Abaixo de metade da vida, chama reforços.', mae: 'Saia do círculo antes do impacto. Elimine as crias para não ser cercado.',
};
const PDESC = {
  cabana: 'Onde você acordou. Metade do telhado caiu no Tremor.', vila: 'Meia dúzia de casas, um poço de água limpa e o último carteiro do vale.', posto: 'Bombas quase secas e uma loja de conveniência revirada.', fazenda: 'Milharal abandonado, um celeiro e galinhas que ninguém mais alimenta.',
  mina: 'Barracões dos operários da Ferro Fundo. Largaram tudo e correram.', pedreira: 'Rocha exposta, veios de ferro e carvão. Território do Alfa.', torre: 'A antena de rádio do vale, no alto do morro.', estacao: 'O posto da Dra. Íris. Sismógrafos, café frio e portas reforçadas.',
  cratera: 'O chão aqui é vermelho e morno. Todas as fendas levam para cá.', lago: 'Água parada e funda. Boa pesca.', pantano: 'Lama, cogumelos e coisas compridas que se mexem na água.', cidade: 'A cidade do vale. As ruas estão vazias. Os prédios, não.',
  delegacia: 'Armários de munição e uma Bancada de Armeiro intacta.', hospital: 'Onde internaram o Paciente Zero. Tem uma Mesa de Química na farmácia.', igreja: 'Uma capela, um cemitério e uma cripta. Algo alto ronda as lápides à noite.', barragem: 'O paredão da represa e a casa de controle do gerador.',
  quarentena: 'Cercas, barracas e um arsenal trancado. O exército não saiu daqui. Dizem que estudavam uma cura.', serraria: 'Pilhas de toras prontas. A mata em volta está cheia de Cordas de Carne.', ferrovia: 'Uma estação e vagões parados. Os trilhos cruzam o vale de ponta a ponta.',
  motel: 'Motel de beira de estrada na passagem da serra. As portas dos quartos estão todas abertas.', sede: 'O prédio da mineradora que cavou fundo demais. Os registros ficaram no arquivo.', observatorio: 'Uma cúpula no ponto mais alto do nordeste, com vista para a cratera.',
  aerodromo: 'Uma pista curta, um hangar e um helicóptero militar parado.', bunker: 'De onde saíam os boletins de emergência. Alguém ainda monta guarda.',
};
