import { existsSync } from "fs";
import { join } from "path";
import { Command } from "commander";
import {
  initializeNewProjectFlow,
  interactiveConfigurationFlow,
  productionPreviewFlow,
  buildFlow,
} from "./project_initializer.js";
import { launchEditorFlow } from "./server.js";
import { loadAllProjectTemplates } from "../core/project_templates.js";
import chalk from "chalk";

const CONFIG_FILENAME = ".pen.config.json";

const LOGO = `
  ╭──────────────────────────────────╮
  │       ${chalk.bold("Pen")}  Editor              │
  │   Local Rich programming playground │
  ╰──────────────────────────────────╯`;

export async function handleCliInput(args) {
  const program = new Command();

  program
    .name("pen")
    .description("Local Rich programming playground")
    .version("1.0.0");

  program
    .command("init")
    .alias("new")
    .description("Create a new Pen project")
    .action(async () => {
      const cwd = process.cwd();
      await initializeNewProjectFlow(cwd);
    });

  program
    .command("configure")
    .alias("config")
    .description("Interactively edit editors, settings, CDN links")
    .action(async () => {
      const cwd = process.cwd();
      const configPath = join(cwd, CONFIG_FILENAME);
      if (!existsSync(configPath)) {
        printNoProject();
        process.exit(1);
      }
      await interactiveConfigurationFlow(cwd);
    });

  program
    .command("serve")
    .alias("preview")
    .description("Build and serve a production preview")
    .option("-p, --port <number>", "Port for the server")
    .option("-H, --host <string>", "Host for the server")
    .action(async (options) => {
      const cwd = process.cwd();
      const configPath = join(cwd, CONFIG_FILENAME);
      if (!existsSync(configPath)) {
        printNoProject();
        process.exit(1);
      }
      await productionPreviewFlow(cwd, options);
    });

  program
    .command("build [outputFile]")
    .description("Build the project to a file")
    .action(async (outputFile) => {
      const cwd = process.cwd();
      const configPath = join(cwd, CONFIG_FILENAME);
      if (!existsSync(configPath)) {
        printNoProject();
        process.exit(1);
      }
      await buildFlow(cwd, outputFile);
    });

  program
    .command("templates")
    .alias("list-templates")
    .description("List available project templates")
    .action(async () => {
      await printTemplateList();
    });

  program
    .option("--headless", "Run in headless mode")
    .option("-p, --port <number>", "Port for the server")
    .option("-H, --host <string>", "Host for the server")
    .action(async (options) => {
      const cwd = process.cwd();
      const configPath = join(cwd, CONFIG_FILENAME);
      const hasConfig = existsSync(configPath);

      if (hasConfig) {
        await launchEditorFlow(cwd, options);
      } else {
        await initializeNewProjectFlow(cwd);
      }
    });

  await program.parse(args, { from: "user" });
}

function printNoProject() {
  console.log(`\n${chalk.yellow("No Pen project found in current directory.")}`);
  console.log(`   Run ${chalk.bold("pen init")} to create one.\n`);
}

async function printTemplateList() {
  const templates = await loadAllProjectTemplates();
  console.log(LOGO);
  console.log(`\n  ${chalk.bold("Available Templates")}\n`);

  if (templates.length === 0) {
    console.log("  (no templates found)\n");
    return;
  }

  for (const t of templates) {
    const editors = t.config.editors.map((e) => e.type).join(", ");
    console.log(`  ${chalk.cyan(t.title.padEnd(20))} ${t.description}`);
    console.log(`  ${"".padEnd(20)} ${chalk.dim(editors)}\n`);
  }
}

function printHelp() {
  console.log(`${LOGO}

  ${chalk.bold("Usage:")} pen [command] [options]

  ${chalk.bold("Commands:")}

    ${chalk.cyan("(none)")}              Launch editor, or create project if none exists
    ${chalk.cyan("init")} / ${chalk.cyan("new")}          Create a new Pen project (with template picker)
    ${chalk.cyan("configure")} / ${chalk.cyan("config")}  Interactively edit editors, settings, CDN links
    ${chalk.cyan("serve")} / ${chalk.cyan("build")}       Build and serve a production preview
    ${chalk.cyan("templates")}            List available project templates

  ${chalk.bold("Options:")}

    ${chalk.cyan("-h")}, ${chalk.cyan("--help")}          Show this help message
    ${chalk.cyan("-v")}, ${chalk.cyan("--version")}       Show version number

  ${chalk.bold("Examples:")}

    pen                    Launch or initialize
    pen init               Create from template
    pen config             Modify project settings
    pen serve              Preview the production build
    pen templates          See all starter templates
`);
}
