# Personagens do Mixamo — o que já está no jogo

Baixados em 22/10/2026 pela conta do Pedro no Mixamo (Adobe) e convertidos para GLB compactado
(texturas WebP 1024, malha meshopt): `assets/models/mixamo/`. Os FBX originais (~400 MB) ficam só no
computador, em `assets/mixamo/` (fora do git).

| Arquivo | Personagem Mixamo | Uso no jogo |
|---|---|---|
| explorador.glb | Josh | o explorador (jaqueta de couro, calça cáqui, chapéu, bolsa e chicote adicionados) |
| bryce.glb | Bryce | homens egípcios (bermuda vira saiote de linho) |
| brian.glb | Brian | sacerdotes (cabeça raspada) e homens |
| joe.glb | Joe | não usado (sem o terno, o tronco fica oco) |
| kate.glb, megan.glb, elizabeth.glb | Kate, Megan, Elizabeth | mulheres (vestido de linho) |

Animações (`anim/`, exportadas no Josh, sem pele, 30 fps; as de locomoção "In Place"):
idle (Breathing Idle), andar (Standard Walk), andar_f (Female Walk), trotar (Jogging), correr (Fast Run),
pular (Jump In Place), caindo (Falling Idle), aterrissar (Falling To Landing), nadar (Swimming),
boiar (Treading Water), conversar (Talking – General Conversation), pegar (Picking Up),
espada (Sword And Shield Slash), ajoelhado (Kneeling Inspecting), sentado (Sitting Idle).
Acrescentadas em 26/10/2026: borda (Pulling Up To A Ledge — sair da água pelo cais), salto_agua (Diving From A Run Pose),
golpe (Hit Reaction), desmaiar (Shot To The Chest Falling Backwards) e beber (Male Drinking). O Mixamo não tem nado crawl:
o crawl na superfície é procedural (`comum/player.js`); "Swimming" é nado de peito subaquático e fica para o mergulho.

Acrescentadas em 05/11/2026 (pacote "Sword And Shield", no Josh, sem pele, 30 fps; carregadas só em Roma, para as
lutas do Coliseu, com `loadAnims`): gl_guarda (Idle), gl_lado (Left Strafe Walk; para a direita, de trás para a frente),
gl_alto (High Attack), gl_baixo (Low Attack), gl_desce (Downward Slash), gl_combo (Slash Combo), gl_forte (Power Slash),
gl_cabo (Hilt Melee), gl_chute (Sparta Kick), gl_bloqueio (Blocked Impact), gl_impacto (Unblocked Impact), gl_cabeca
(Head Impact), gl_morte_f (Falling Forward Death), gl_morte_t (Falling Back Death), gl_vitoria (Powering Up).
Conversão no navegador: FBXLoader → posições ÷100 → GLTFExporter → gltf-transform resample + meshopt.

Observação técnica: o corpo dos modelos do Mixamo é só cabeça, mãos e pés — o resto é a roupa. Por isso
os egípcios são feitos repintando as peças (camisa = torso nu, calça/bermuda = linho) e adicionando
saiotes, vestidos, perucas e coroas presos aos ossos (`js/egito/mixamo.js`). Alguns modelos vêm com
os ossos prefixados (`mixamorig12Hips`); o carregador padroniza para as animações encaixarem.

Para trocar ou acrescentar personagens: baixar FBX (T-pose), converter com FBX2glTF e otimizar
(script de conversão usado: texturas WebP 1024 + meshopt, sem `dedup/prune`, que quebram os esqueletos).

Acrescentadas em 10/11/2026 (no Josh, sem pele, 30 fps, pela API; para o combate em Roma — soco, esquiva e lança):
| Arquivo | Animação Mixamo (descrição no catálogo) | Duração | Observação |
|---|---|---|---|
| so_guarda | Boxing (Boxing Idle) | 2,20 s | guarda de boxe, laço |
| so_jab | Punching (Jab Punch) | 1,03 s | mão da frente (esquerda) |
| so_direto | Punching (Cross Punch) | 0,87 s | mão de trás (direita) |
| so_gancho | Punching (Hook With The Lead Hand) | 1,27 s | gancho de esquerda |
| so_uppercut | Uppercut (Standing Left Uppercut Punch) | 1,33 s | começa e termina de braços baixos, não na guarda |
| so_soco_forte | Punch Combo (Four Punch Combo) | 2,20 s | sequência de 4 socos |
| es_rola | Stand To Roll (Dive Roll From Standing) | 2,37 s | não é "in place": o quadril anda 4,36 m para a frente |
| es_esquiva | Dodging Right (Dodging To The Right In Place) | 1,43 s | passo para a direita (~14 cm) e volta |
| gl_defesa | Sword And Shield Block Idle | 1,40 s | escudo erguido, laço (agachado: quadril a 0,74 m) |
| gl_saca | Draw Sword 1 (pacote Sword And Shield) | 0,50 s | mão sai do quadril direito (onde o legionário levava o gládio) |
| lanca | Stabbing (Male Knife Stab With The Rear Hand And Fore Grip) | 2,13 s | estocada de uma mão (direita), na altura do ombro |
Na API, `params` do export leva só os valores separados por vírgula (ex.: `"0"` ou `"-1,-1,0,0"`), não "nome,valor"; e o
Josh foi selecionado no site (personagem primário) antes do export. Conversão feita no Node (three r160:
FBXLoader → posições ÷100 → só Hips.position + rotações → GLTFExporter) e depois gltf-transform resample + meshopt.
