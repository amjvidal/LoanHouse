// Confere a sintaxe de todos os .js do site (usado no GitHub Actions).
import { readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { execFileSync } from "node:child_process";

function listar(dir) {
  return readdirSync(dir).flatMap((nome) => {
    const caminho = join(dir, nome);
    return statSync(caminho).isDirectory() ? listar(caminho) : caminho.endsWith(".js") ? [caminho] : [];
  });
}

const arquivos = listar("js");
for (const arquivo of arquivos) execFileSync(process.execPath, ["--check", arquivo], { stdio: "inherit" });
console.log(`${arquivos.length} arquivos JS sem erro de sintaxe.`);
