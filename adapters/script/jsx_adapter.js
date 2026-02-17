import { JavaScriptAdapter } from "./javascript_adapter.js";
import { loadAndRenderTemplate } from "../../core/template_engine.js";
import { importModule } from "../import_module.js";
import { CompileError } from "../../core/errors.js";

/**
 * @returns {Promise<object>}
 */
async function getBabel() {
  const Babel = await importModule("@babel/standalone", {
    windowGlobal: "Babel",
  });

  if (!Babel.availablePresets["solid"]) {
    try {
      const solidPreset = await importModule("babel-preset-solid", {
        cdnUrl: "https://esm.sh/babel-preset-solid",
        windowGlobal: "babelPresetSolid",
      });
      if (solidPreset) {
        Babel.registerPreset("solid", solidPreset.default || solidPreset);
      }
    } catch (e) {
      console.error("JSXAdapter: Failed to load Solid Babel preset", e);
    }
  }

  return Babel;
}

/**
 * @param {object} Babel
 * @param {string} code
 * @param {object} [options]
 * @param {string} [options.pragma]
 * @param {string} [options.pragmaFrag]
 * @param {string} [options.runtime]
 * @param {string} [options.compiler]
 * @returns {Promise<string>}
 */
async function transpileJsx(Babel, code, options = {}) {
  const { compiler = "react", runtime = "classic" } = options;

  // Compiler-aware defaults, with explicit overrides taking priority
  let pragma, pragmaFrag;
  if (compiler === "preact") {
    pragma = options.pragma || "h";
    pragmaFrag = options.pragmaFrag || "Fragment";
  } else {
    pragma = options.pragma || "React.createElement";
    pragmaFrag = options.pragmaFrag || "React.Fragment";
  }

  const presets = [];
  const plugins = [
    ["proposal-decorators", { legacy: true }],
    ["proposal-class-properties", { loose: true }],
    ["proposal-private-methods", { loose: true }],
    ["proposal-private-property-in-object", { loose: true }],
    "proposal-object-rest-spread",
  ];

  if (compiler === "solid") {
    if (Babel.availablePresets["solid"]) {
      presets.push("solid");
    } else {
      // Fallback if not registered, try to use it as a plugin if we have it
      if (Babel.availablePlugins["solid"]) {
        plugins.push(["solid", { generate: "dom", hydratable: false }]);
        // We still need JSX syntax
        presets.push(["react", { runtime: "classic", pragma: "h" }]);
      }
    }
  } else if (runtime === "automatic") {
    presets.push(["react", { runtime: "automatic" }]);
  } else {
    presets.push([
      "react",
      {
        pragma,
        pragmaFrag,
        runtime: "classic",
        throwIfNamespace: false,
      },
    ]);
  }

  const result = Babel.transform(code, {
    presets,
    plugins,
    filename: options.filename || "script.jsx",
    sourceType: "module",
    sourceMaps: true,
  });

  return { code: result.code, map: result.map };
}

export class JSXAdapter extends JavaScriptAdapter {
  static type = "script";
  static id = "jsx";
  static name = "JSX";
  static description = "JavaScript with JSX syntax";
  static extends = "javascript";
  static fileExtension = ".jsx";
  static mimeType = "text/javascript";
  static compileTargets = ["JavaScript"];
  static canMinify = true;

  static getCdnResources(settings = {}) {
    return { scripts: [], styles: [] };
  }

  static async getDefaultTemplate(variables = {}) {
    const compiler = variables.compiler || "react";
    const templateId = `jsx_${compiler}`;

    // Attempt to load compiler-specific template first
    let template = await loadAndRenderTemplate(templateId, variables);
    if (template) return template;

    // Fallback to generic jsx template
    template = await loadAndRenderTemplate("jsx", variables);
    if (template) return template;

    // Absolute fallback (rarely hit now)
    return `import React from 'react'\nexport default () => <div>Hello World</div>`;
  }

  static getDefaultSettings() {
    return {
      ...JavaScriptAdapter.getDefaultSettings(),
      compiler: "react",
    };
  }

  initialize(codemirrorInstance, fullConfig) {
    const parentInit = super.initialize(codemirrorInstance, fullConfig);
    return {
      ...parentInit,
      syntax: "jsx",
      actions: {
        ...parentInit.actions,
        beautify: (code) => this.beautify(code),
        compile: (target) =>
          target === "JavaScript" || target === "javascript"
            ? this.compileToJavaScript.bind(this)
            : null,
      },
    };
  }

  async beautify(code) {
    return await super.beautify(code, "babel");
  }

  /**
   * @param {string} jsxCode
   * @returns {Promise<string>}
   */
  async compileToJavaScript(jsxCode) {
    try {
      const Babel = await getBabel();
      const { code, map } = await transpileJsx(Babel, jsxCode, {
        compiler: this.settings.compiler,
        pragma: this.settings.pragma,
        pragmaFrag: this.settings.pragmaFrag,
        filename: "script.jsx",
      });
      return { js: code, map };
    } catch (err) {
      // Babel error usually has loc: { line, column } or line, column directly
      // Message often contains code frame, which we don't want in the main message property if possible
      // But for now, let's keep it simple and just rely on the UI to truncate/format it
      let message = err.message;
      if (message.includes("\n")) {
        message = message.split("\n")[0];
      }

      // Remove file path from message if present (e.g. "/script.jsx: ")
      message = message.replace(/^\/.*?\: /, "");

      throw new CompileError(message, {
        adapterId: this.constructor.id,
        filename: "script.jsx",
        line: err.loc ? err.loc.line : err.line,
        column: err.loc ? err.loc.column : err.column,
        originalError: err,
      });
    }
  }

  async render(content, fileMap) {
    try {
      const Babel = await getBabel();
      const filename =
        Object.keys(fileMap).find((k) => fileMap[k] === content) ||
        "script.jsx";
      const { code, map } = await transpileJsx(Babel, content, {
        compiler: this.settings.compiler,
        pragma: this.settings.pragma,
        pragmaFrag: this.settings.pragmaFrag,
        filename: filename,
      });
      return {
        ...fileMap,
        js: code,
        map,
      };
    } catch (err) {
      let message = err.message;
      if (message.includes("\n")) {
        message = message.split("\n")[0];
      }
      message = message.replace(/^\/.*?\: /, "");

      throw new CompileError(message, {
        adapterId: this.constructor.id,
        filename:
          Object.keys(fileMap).find((k) => fileMap[k] === content) ||
          "script.jsx",
        line: err.loc ? err.loc.line : err.line,
        column: err.loc ? err.loc.column : err.column,
        originalError: err,
      });
    }
  }

  static getSchema() {
    return {
      ...super.getSchema(),
      compiler: {
        type: "select",
        name: "JSX Compiler",
        description: "Underlying framework/compiler for JSX",
        default: "react",
        options: ["react", "preact", "solid"],
      },
      pragma: {
        type: "text",
        name: "JSX Pragma",
        description:
          "createElement function (auto-set by compiler, override for custom setups)",
        default: "",
      },
      pragmaFrag: {
        type: "text",
        name: "JSX Fragment Pragma",
        description:
          "Fragment component (auto-set by compiler, override for custom setups)",
        default: "",
      },
    };
  }
}
