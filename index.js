const path = require("path");

const { parse } = require("node-html-parser");

const { NormalModule } = require("webpack");

const pluginName = "HtmlEntryLoader";

function isEntryModule(compilation, module) {
  return compilation.moduleGraph.getIssuer(module) === null;
}

function generateScript(jsFiles, hash) {
  return jsFiles
    .map((x) => `<script type='text/javascript' src='${x}?${hash}'></script>`)
    .join("");
}

function generateLink(cssFiles, hash) {
  return cssFiles
    .map((x) => `<link rel='stylesheet' href='${x}?${hash}' />`)
    .join("");
}

function findEntrypointContainingModule(module, compilation) {
  for (const entrypoint of compilation.entrypoints.values()) {
    if (entrypoint.getModulePreOrderIndex(module) !== undefined) {
      return entrypoint;
    }
  }

  throw Error();
}

function injectChunks(content, module, compilation) {
  const entrypoint = findEntrypointContainingModule(module, compilation);
  const jsFiles = entrypoint.getFiles().filter((x) => x.endsWith(".js"));
  const cssFiles = entrypoint.getFiles().filter((x) => x.endsWith(".css"));

  const inject =
    generateScript(jsFiles, compilation.hash) +
    generateLink(cssFiles, compilation.hash);

  return content.replace("</head>", `${inject}</head>`);
}

class EntryExtractPlugin {
  /* eslint-disable-next-line class-methods-use-this */
  apply(compiler) {
    const entries = {};

    compiler.hooks.thisCompilation.tap(pluginName, (compilation) => {
      compilation.hooks.processAssets.tap(pluginName, () => {
        for (const [moduleId, content] of Object.entries(entries)) {
          const module = compilation.findModule(moduleId);
          const filename = path.basename(module.userRequest);
          const injected = injectChunks(content, module, compilation);

          /* eslint-disable-next-line no-param-reassign */
          compilation.assets[filename] = {
            source: () => injected,
            size: () => injected.length,
          };
        }
      });
    });
    compiler.hooks.thisCompilation.tap(pluginName, (compilation) => {
      NormalModule.getCompilationHooks(compilation).loader.tap(
        pluginName,
        (loaderContext, module) => {
          if (isEntryModule(compilation, module)) {
            /* eslint-disable-next-line no-param-reassign */
            loaderContext[pluginName] = (content) => {
              entries[module.identifier()] = content;
            };
          } else {
            /* eslint-disable-next-line no-param-reassign */
            delete loaderContext[pluginName];
          }
        }
      );
    });
  }
}

function traverseElements(element, callback) {
  callback(element);

  for (const child of element.childNodes) {
    traverseElements(child, callback);
  }
}

function loader(source) {
  this.cacheable();
  const callback = this.async();

  const root = parse(source, { script: true, style: true, pre: true });

  const options = this.getOptions();

  const scripts = [];
  const links = [];

  traverseElements(root, (element) => {
    if (!element.tagName) {
      return;
    }

    if (element.tagName === "SCRIPT") {
      scripts.push(element);
    } else if (element.tagName === "LINK") {
      links.push(element);
    }
  });

  const requires = [];

  for (const script of scripts) {
    const src = script.attributes.src;
    if (src && !(src.startsWith("http") || src.startsWith("//"))) {
      requires.push(src);
      script.parentNode.removeChild(script);
    }
  }

  for (const link of links) {
    const href = link.attributes.href;
    const rel = link.attributes.rel;
    if (
      rel &&
      link.attributes.rel === "stylesheet" &&
      href &&
      !(href.startsWith("http") || href.startsWith("//"))
    ) {
      requires.push(href);
      link.parentNode.removeChild(link);
    }
  }

  if (options.minimize) {
    root.removeWhitespace();
  }

  let result = root.toString();
  if (root.firstChild.tagName === "html") {
    result = `<!doctype html>${result}`;
  }
  if (this[pluginName]) {
    this[pluginName](result);
    result = "";
  }

  const requireClauses = requires.map((x) => `require('${x}');`).join("\n");
  const resultJs = `${requireClauses}\nmodule.exports = ${JSON.stringify(
    result
  )}`;
  callback(null, resultJs);
}

module.exports = loader;
module.exports.EntryExtractPlugin = EntryExtractPlugin;
