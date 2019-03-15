import url from 'url';
import { promises as fs } from 'fs';
import axios from 'axios';
import path from 'path';
import { _ } from 'lodash';
import cheerio from 'cheerio';

const attrs = {
  link: 'href',
  script: 'src',
  img: 'src',
};

const isResLocal = (link) => {
  const { host } = url.parse(link);
  return !host;
};

const makeCorrectFileOrDirName = (name, endName) => _.words(name, /[^./]+/g).join('-').concat(endName);

const placesForDownload = {
  dirForRes: {
    parse: url.parse,
    combine: urlParts => [`${urlParts.host}/${urlParts.pathname}`, '_files'],
  },
  fileForPage: {
    parse: url.parse,
    combine: urlParts => [`${urlParts.host}/${urlParts.pathname}`, '.html'],
  },
  fileForRes: {
    parse: path.parse,
    combine: pathParts => [path.join(pathParts.dir, pathParts.name), pathParts.ext],
  },
};

const makeFileOrDirNameByLink = (link, type) => {
  const objOfParts = placesForDownload[type].parse(link);
  const [name, postfix] = placesForDownload[type].combine(objOfParts);
  return makeCorrectFileOrDirName(name, postfix);
};

const makePathToFileOrDir = (parentDirPath, name) => path.join(parentDirPath, name);

const responseTypes = {
  js: 'text',
  css: 'text',
  jpeg: 'arraybuffer',
  png: 'arraybuffer',
};

const pageLoader = (pageURL, pathToMainDir) => {
  const nameOfFileForPage = makeFileOrDirNameByLink(pageURL, 'fileForPage');
  const pathToFileForPage = makePathToFileOrDir(pathToMainDir, nameOfFileForPage);
  const nameOfDirForRes = makeFileOrDirNameByLink(pageURL, 'dirForRes');
  const pathToDirForRes = makePathToFileOrDir(pathToMainDir, nameOfDirForRes);
  const resURLs = [];

  return axios.get(pageURL)
    .then((response) => {
      const $ = cheerio.load(response.data, { decodeEntities: false });
      const tags = ['link', 'script', 'img'];
      tags.forEach((tag) => {
        $(tag).each((i, elem) => {
          const link = $(elem).attr(attrs[tag]);
          if ((link !== undefined) && isResLocal(link)) {
            const resURL = url.resolve(pageURL, link);
            const nameOfFileForRes = makeFileOrDirNameByLink(link, 'fileForRes');
            const pathToFileForRes = makePathToFileOrDir(pathToDirForRes, nameOfFileForRes);
            resURLs.push({ resURL, filepath: pathToFileForRes });
            $(elem).attr(attrs[tag], makePathToFileOrDir(nameOfDirForRes, nameOfFileForRes));
          }
        });
      });
      return fs.writeFile(pathToFileForPage, $.html());
    })
    .then(() => fs.mkdir(pathToDirForRes))
    .then(() => {
      resURLs.forEach(({ resURL, filepath }) => {
        axios({
          method: 'get',
          responseType: responseTypes[path.parse(resURL).ext.slice(1)],
          url: resURL,
        }).then(responseRes => fs.writeFile(filepath, responseRes.data));
      });
    })
    .catch(e => throw e);
};

export default pageLoader;
