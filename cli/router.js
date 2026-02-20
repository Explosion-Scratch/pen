import { existsSync } from "fs";
import { join } from "path";
import meow from "meow";
import {
  initializeNewProjectFlow,
  interactiveConfigurationFlow,
  productionPreviewFlow,
  buildFlow,
} from "./project_initializer.js";
import { launchEditorFlow } from "./server.js";
import { createBox } from "./box_util.js";
import { loadAllProjectTemplates } from "../core/project_templates.js";
import chalk from "chalk";

const CONFIG_FILENAME = ".pen.config.json";

const logoText = `${chalk.bold("Pen Editor!")}\nLocal, rich programming playground!`;
const LOGO = createBox(logoText, 2);

const baseHelpText = `${LOGO}

    ${chalk.bold("Usage")}
      ${chalk.dim("$")} ${chalk.cyan("pen")} ${chalk.dim("[command] [options]")}

    ${chalk.bold("Commands")}
      ${chalk.cyan("(none)")}                   Launch editor, or create project if none exists
      ${chalk.cyan("init")}, ${chalk.cyan("new")}                Create a new Pen project (with template picker)
      ${chalk.cyan("configure")}, ${chalk.cyan("config")}        Interactively edit editors, settings, CDN links
      ${chalk.cyan("serve")}, ${chalk.cyan("preview")}           Build and serve a production preview
      ${chalk.cyan("build")} ${chalk.dim("[outputFile]")}       Build the project to a single file
      ${chalk.cyan("publish")}                  Publish the current project to a GitHub Gist
      ${chalk.cyan("templates")}                List available project templates

    ${chalk.bold("Options")}
      ${chalk.cyan("--headless")}               Run in headless mode
      ${chalk.cyan("-p, --port")}               Port for the server
      ${chalk.cyan("-H, --host")}               Host for the server
      ${chalk.cyan("--dev")}                    Run build in development mode (retain source maps/dev features)
      ${chalk.cyan("--prod")}                   Run serve in production mode (no source maps/dev features)
      ${chalk.cyan("-h, --help")}               Show this help message or subcommand help
      ${chalk.cyan("-v, --version")}            Show version number

    ${chalk.bold("Examples")}
      ${chalk.dim("$")} ${chalk.cyan("pen")}                    Launch or initialize
      ${chalk.dim("$")} ${chalk.cyan("pen init")}               Create from template
      ${chalk.dim("$")} ${chalk.cyan("pen config")}             Modify project settings
      ${chalk.dim("$")} ${chalk.cyan("pen serve")}              Preview the production build
      ${chalk.dim("$")} ${chalk.cyan("pen build --dev")}        Compile with dev features
`;

const subcommandHelp = {
  init: `${chalk.bold("Usage")}
    ${chalk.dim("$")} ${chalk.cyan("pen init")}`,
  configure: `${chalk.bold("Usage")}
    ${chalk.dim("$")} ${chalk.cyan("pen configure")}`,
  serve: `${chalk.bold("Usage")}
    ${chalk.dim("$")} ${chalk.cyan("pen serve")} ${chalk.dim("[options]")}

  ${chalk.bold("Options")}
    ${chalk.cyan("-p, --port")}          Port for the server
    ${chalk.cyan("-H, --host")}          Host for the server
    ${chalk.cyan("--prod")}              Run in production mode (no source maps/dev features)`,
  build: `${chalk.bold("Usage")}
    ${chalk.dim("$")} ${chalk.cyan("pen build")} ${chalk.dim("[outputFile] [options]")}

  ${chalk.bold("Options")}
    ${chalk.cyan("--dev")}               Run build in development mode (retain source maps/dev features)`,
  publish: `${chalk.bold("Usage")}
    ${chalk.dim("$")} ${chalk.cyan("pen publish")}`,
  templates: `${chalk.bold("Usage")}
    ${chalk.dim("$")} ${chalk.cyan("pen templates")}`
};

export async function handleCliInput(args) {
  const cli = meow(baseHelpText, {
    importMeta: import.meta,
    argv: args,
    autoHelp: false, // We will handle help routing manually per command
    description: false, // Prevents printing package.json description above our custom help string
    flags: {
      headless: {
        type: "boolean",
        default: false,
      },
      dev: {
        type: "boolean",
        default: false,
      },
      port: {
        type: "number",
        shortFlag: "p",
      },
      host: {
        type: "string",
        shortFlag: "H",
      },
      prod: {
        type: "boolean",
        default: false,
      },
      help: {
        type: "boolean",
        shortFlag: "h",
      },
    },
  });

  const command = cli.input[0];

  // If help flag is passed, route it to subcommand help or base help
  if (cli.flags.help) {
    if (command && ["init", "new"].includes(command)) {
      console.log(`\n${subcommandHelp.init}\n`);
    } else if (command && ["configure", "config"].includes(command)) {
      console.log(`\n${subcommandHelp.configure}\n`);
    } else if (command && ["serve", "preview"].includes(command)) {
      console.log(`\n${subcommandHelp.serve}\n`);
    } else if (command === "build") {
      console.log(`\n${subcommandHelp.build}\n`);
    } else if (command === "publish") {
      console.log(`\n${subcommandHelp.publish}\n`);
    } else if (command && ["templates", "list-templates"].includes(command)) {
      console.log(`\n${subcommandHelp.templates}\n`);
    } else {
      cli.showHelp(0);
    }
    process.exit(0);
  }

  const cwd = process.cwd();
  const configPath = join(cwd, CONFIG_FILENAME);

  try {
    switch (command) {
      case "init":
      case "new": {
        await initializeNewProjectFlow(cwd);
        break;
      }

      case "configure":
      case "config": {
        if (!existsSync(configPath)) {
          printNoProject();
          process.exit(1);
        }
        await interactiveConfigurationFlow(cwd);
        break;
      }

      case "serve":
      case "preview": {
        if (!existsSync(configPath)) {
          printNoProject();
          process.exit(1);
        }
        await productionPreviewFlow(cwd, cli.flags);
        break;
      }

      case "build": {
        if (!existsSync(configPath)) {
          printNoProject();
          process.exit(1);
        }
        const outputFile = cli.input[1];
        await buildFlow(cwd, outputFile, cli.flags);
        break;
      }

      case "publish": {
        if (!existsSync(configPath)) {
          printNoProject();
          process.exit(1);
        }
        const { publishFlow } = await import("./project_initializer.js");
        await publishFlow(cwd);
        break;
      }

      case "templates":
      case "list-templates": {
        await printTemplateList();
        break;
      }

      case undefined: {
        // No command provided, default behavior
        const hasConfig = existsSync(configPath);
        if (hasConfig) {
          await launchEditorFlow(cwd, cli.flags);
        } else {
          await initializeNewProjectFlow(cwd);
        }
        break;
      }

      default: {
        console.error(
          `\n  ${chalk.red("Error:")} Unknown command ${chalk.bold(command)}.\n`
        );
        cli.showHelp(1);
      }
    }
  } catch (error) {
    console.error(`\n  ${chalk.red.bold("Error")} ${chalk.red(error.message)}`);
    if (process.env.DEBUG) {
      console.error(error);
    }
    process.exit(1);
  }
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
