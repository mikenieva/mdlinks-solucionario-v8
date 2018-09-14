const marked = require('marked');
const Path = require('path');
const FS = require('fs');
const fetch = require('node-fetch');

const mdLinks = (mdPath, options) => {
  return new Promise((resolve, reject) => {
    const pathStat = FS.statSync(mdPath);
    if (pathStat.isDirectory()) {
      FS.readdir(mdPath, (error, items) => {
        console.log(items);
        if (error) {
          return reject(error);
        }
        const mdPromises = items.map((item) => {
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
};

const processMD = (markdown, options) => {
  const links = getMDLinks(markdown);
  return links.map(async (link) => {
    if (options.validate) {
      try {
        const response = await fetch(link.href);
        link.status = response.status;
      } catch (error) {
        link.status = 'Error de conexión';
      }
    }
    return link;
  });
}

const getMDLinks = (markdown) => {
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
};

const markdownLinkExtractor = (markdown) => {
  const links = [];
  const renderer = new marked.Renderer();

  renderer.link = function(href, title, text) {
    links.push({
      href,
      text,
      title,
    });
  };
  renderer.image = function(href, title, text) {
      href = href.replace(/ =\d*%?x\d*%?$/, '');
      links.push({
        href,
        text,
        title,
      });
  };
  marked(markdown, {renderer});

  return links;
};

module.exports = mdLinks;
