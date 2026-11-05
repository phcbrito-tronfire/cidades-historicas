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
