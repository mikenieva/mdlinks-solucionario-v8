#!/usr/bin/env node

const mdLinks = require('./lib/mdlinks').mdLinks;

if (require.main === module) {
  let options = {};
  if (process.argv.indexOf('--validate')) {
    options.validate = true;
  }
  mdLinks(process.argv[2], options).then((links)=>{
    links.forEach((link) => {
      if (link.ok) {
        console.log(link.file, ':', link.line, link.href, 'ok:', link.ok);
      } else {
        console.log(link.file, ':', link.line, link.href);
      }
    });
  }).catch((error)=>{
    console.error('MDLinks ha fallado, revisa que has puesto una ruta válida');
    console.error('Error', error);
  });
}

module.exports = mdLinks;
