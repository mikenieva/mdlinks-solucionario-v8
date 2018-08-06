const Marked = require('marked');
const Path = require('path');
const FS = require('fs');
const fetch = require('node-fetch');

function mdLinks(mdPath, options = {}) {
  return new Promise((resolve, reject) => {
    if (!Path.isAbsolute(mdPath)) {
      mdPath = Path.join(process.cwd(), mdPath);
    }

    const pathStat = FS.statSync(mdPath);
    if (pathStat.isDirectory()) {
      // Si es un directorio llamamos recursivamente a esta función con cada ruta que contenga
      FS.readdir(mdPath, (error, items) => {
        if (error) {
          return reject(error);
        }

        const mdPromises = items.map((item) => {
          // Llamada recursiva a la función que procesa los Markdowns
          return mdLinks(Path.join(mdPath, item), options);
        }
        );
        Promise.all(mdPromises).then((results)=>{
          let ret = [];
          results.forEach((result) => {
            ret = ret.concat(result);
          });
          resolve(ret);
        }).catch((promisesAllError)=>{
          reject(promisesAllError);
        });
      });
    } else {
      /* Caso recursivo base, la ruta llega a un archivo
       *
       * Importante usar utf-8 para leer los archivos o nuestro idioma
       * estropeará todo */
      FS.readFile(mdPath, 'utf-8', (fileError, file)=>{
        if (fileError) {
          reject(fileError);
        } else {
          Promise.all(processMD(file, options)).then((results)=>{
            return resolve(results.map((link) => {
              link.file = mdPath;
              return link;
            }));
          }).catch((error)=>{
            reject(error);
          });
        }
      });
    }
  });
}

function processMD(markdown, options) {
  const links = getMDLinks(markdown);
  return links.map( async (link) => {
    if (options.validate) {
      try {
        const response = await fetch(link.href);
        link.ok = response.status;
      } catch (error) {
        link.ok = 'Error de conexión';
      }
    }
    return link;
  });
}

// Función pre-hecha para entregar tokens de markdown
function getMDLinks(markdown) {
  let ret = [];
  const lines = markdown.split('\n');
  lines.forEach( (line, index) => {
    ret = ret.concat(markdownLinkExtractor(line).map( (link) => {
      return {
        ...link,
        line: index,
      };
    }));
  });
  return ret;
}

// Función necesaria para extraer los links usando marked
// (tomada desde biblioteca del mismo nombre y modificada para el ejercicio)
function markdownLinkExtractor(markdown) {
  const links = [];

  const renderer = new Marked.Renderer();

  // Taken from https://github.com/markedjs/marked/issues/1279
  const linkWithImageSizeSupport = /^!?\[((?:\[[^\[\]]*\]|\\[\[\]]?|`[^`]*`|[^\[\]\\])*?)\]\(\s*(<(?:\\[<>]?|[^\s<>\\])*>|(?:\\[()]?|\([^\s\x00-\x1f()\\]*\)|[^\s\x00-\x1f()\\])*?(?:\s+=(?:[\w%]+)?x(?:[\w%]+)?)?)(?:\s+("(?:\\"?|[^"\\])*"|'(?:\\'?|[^'\\])*'|\((?:\\\)?|[^)\\])*\)))?\s*\)/;

  Marked.InlineLexer.rules.normal.link = linkWithImageSizeSupport;
  Marked.InlineLexer.rules.gfm.link = linkWithImageSizeSupport;
  Marked.InlineLexer.rules.breaks.link = linkWithImageSizeSupport;

  renderer.link = function(href, title, text) {
    links.push({
      href: href,
      text: text,
      title: title,
    });
  };
  renderer.image = function(href, title, text) {
      // Remove image size at the end, e.g. ' =20%x50'
      href = href.replace(/ =\d*%?x\d*%?$/, '');
      links.push({
        href: href,
        text: text,
        title: title,
      });
  };
  Marked(markdown, {renderer: renderer});

  return links;
};

exports.mdLinks = mdLinks;