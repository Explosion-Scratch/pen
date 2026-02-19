import { $, build } from "bun";
import { promises as fs } from "fs";
import { join } from "path";

async function main() {
  console.log(" Building web interface...");
  const buildResult = await $`bun run build`.quiet();
  
  if (buildResult.exitCode !== 0) {
    console.error(" Failed to build web interface", buildResult.stderr.toString());
    process.exit(1);
  }

  console.log(" Packaging assets...");
  const distHtml = await fs.readFile(join(import.meta.dir, "dist/index.html"), "utf-8");
  
  // Package project templates
  const templatesDir = join(import.meta.dir, "project-templates");
  const templateDirs = await fs.readdir(templatesDir, { withFileTypes: true });
  const templates = [];
  
  for (const dirent of templateDirs) {
    if (!dirent.isDirectory()) continue;
    const id = dirent.name;
    const dirPath = join(templatesDir, id);
    const configPath = join(dirPath, ".pen.config.json");
    
    try {
      const configStr = await fs.readFile(configPath, "utf-8");
      const config = JSON.parse(configStr);
      if (!config.template) continue;
      
      let icon = "";
      try { icon = await fs.readFile(join(dirPath, "icon.svg"), "utf-8"); } catch(e){}
      
      const files = {};
      if (config.editors) {
        for (const editor of config.editors) {
          try {
            files[editor.filename] = await fs.readFile(join(dirPath, editor.filename), "utf-8");
          } catch(e){}
        }
      }
      
      const templateMeta = config.template;
      const configClean = JSON.parse(JSON.stringify(config));
      delete configClean.template;

      templates.push({
        id,
        title: templateMeta.title || id,
        description: templateMeta.description || '',
        icon,
        config: configClean,
        files
      });
    } catch(e) {
      // skip
    }
  }

  const bundledCode = `
export const indexHtml = ${JSON.stringify(distHtml)};
export const bundledTemplates = ${JSON.stringify(templates)};
  `;
  
  await fs.writeFile(join(import.meta.dir, "cli/bundled_assets.js"), bundledCode);

  console.log(" Compiling release binaries...");
  await fs.mkdir("release", { recursive: true });
  
  // Single HTML Editor piece
  await fs.copyFile("dist/index.html", "release/pen-editor.html");

  // macOS (ARM64/x64)
  console.log("   -> macOS (arm64)");
  await $`bun build ./cli/index.js --compile --target=bun-darwin-arm64 --outfile release/pen-mac-arm64 --external "../project-templates/*"`.quiet();
  console.log("   -> macOS (x64)");
  await $`bun build ./cli/index.js --compile --target=bun-darwin-x64 --outfile release/pen-mac-x64 --external "../project-templates/*"`.quiet();
  
  // Linux (x64)
  console.log("   -> Linux (x64)");
  await $`bun build ./cli/index.js --compile --target=bun-linux-x64 --outfile release/pen-linux-x64 --external "../project-templates/*"`.quiet();
  
  // Windows (x64)
  console.log("   -> Windows (x64)");
  await $`bun build ./cli/index.js --compile --target=bun-windows-x64 --outfile release/pen-windows-x64.exe --external "../project-templates/*"`.quiet();

  // Reset bundled assets file after build so it doesn't pollute the local development environment
  await fs.writeFile(
    join(import.meta.dir, "cli/bundled_assets.js"),
    "export const indexHtml = null;\nexport const bundledTemplates = null;\n"
  );

  console.log(" Done! Releases are in the 'release/' folder.");
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
