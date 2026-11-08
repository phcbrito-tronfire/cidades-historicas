// Recomprime as texturas fotográficas (ferramenta de desenvolvimento): elas eram mais de metade do que o aluno baixa.
// Cor: mantém o tamanho, JPEG de boa qualidade. Relevo (nor): no máximo 1024, sem subamostrar cor (senão o relevo fica
// serrilhado). Rugosidade (rough): 512 em tons de cinza, porque é informação suave que quase não se percebe.
// Nunca aumenta um arquivo: se o resultado sair maior, fica o original.
// Como rodar: numa pasta à parte, 'npm i sharp' e copiar este arquivo; depois: node texturas.mjs <pasta assets/textures>
import sharp from 'sharp';
import fs from 'fs';
import path from 'path';

const root = process.argv[2];
let before = 0, after = 0;
const JOBS = { diff: { q: 82, max: 2048, sub: '4:2:0' }, nor: { q: 86, max: 1024, sub: '4:4:4' }, rough: { q: 78, max: 512, gray: true, sub: '4:2:0' } };
for (const id of fs.readdirSync(root).sort()) {
  const line = [];
  for (const [name, J] of Object.entries(JOBS)) {
    const f = path.join(root, id, name + '.jpg'); if (!fs.existsSync(f)) continue;
    const src = fs.readFileSync(f); before += src.length;
    const meta = await sharp(src).metadata();
    let img = sharp(src);
    if (meta.width > J.max) img = img.resize(J.max, Math.round((meta.height * J.max) / meta.width));
    if (J.gray) img = img.grayscale();
    const out = await img.jpeg({ quality: J.q, mozjpeg: true, chromaSubsampling: J.sub }).toBuffer();
    if (out.length < src.length) { fs.writeFileSync(f, out); after += out.length; line.push(`${name} ${Math.round(src.length / 1024)}→${Math.round(out.length / 1024)}k`); } else { after += src.length; line.push(`${name} =`); }
  }
  console.log(id.padEnd(28), line.join('  '));
}
console.log(`total: ${(before / 1048576).toFixed(1)} MB → ${(after / 1048576).toFixed(1)} MB`);
