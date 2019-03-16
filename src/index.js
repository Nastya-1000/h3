import url from 'url';
import { promises as fs } from 'fs';
import axios from 'axios';
import path from 'path';
import { _ } from 'lodash';
import cheerio from 'cheerio';
import debug from 'debug';

const logDebug = debug('PageLoader');

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

const combineURLParts = urlParts => `${urlParts.host}/${urlParts.pathname}`;

const placesForDownload = {
  dirForRes: {
    parse: url.parse,
    combine: urlParts => [combineURLParts(urlParts), '_files'],
  },
  fileForPage: {
    parse: url.parse,
    combine: urlParts => [combineURLParts(urlParts), '.html'],
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

const errorCodes = {
  ENOENT: "This directory doesn't exists",
  EACCES: 'Permission denied',
};

const errors = {
  url: error => `${error.config.url}: ${error.message}`,
  path: error => `${path.parse(error.path).dir}: ${errorCodes[error.code]}`,
};

const chooseErrorType = error => ((error.path) ? errors.path(error) : errors.url(error));

const makeErrorMessage = error => `There is a problem with ${chooseErrorType(error)}`;

const pageLoader = (pageURL, pathToMainDir) => {
  logDebug(`Page URL - ${pageURL}`);
  const nameOfFileForPage = makeFileOrDirNameByLink(pageURL, 'fileForPage');
  const pathToFileForPage = makePathToFileOrDir(pathToMainDir, nameOfFileForPage);
  logDebug(`Path to file for content of page - ${pathToFileForPage}`);
  const nameOfDirForRes = makeFileOrDirNameByLink(pageURL, 'dirForRes');
  const pathToDirForRes = makePathToFileOrDir(pathToMainDir, nameOfDirForRes);
  logDebug(`Path to dir for resources - ${pathToDirForRes}`);
  const resURLs = [];

  return axios.get(pageURL)
    .then((response) => {
      const $ = cheerio.load(response.data, { decodeEntities: false });
      const tags = ['link', 'script', 'img'];
      tags.forEach((tag) => {
        $(tag).each((i, elem) => {
          const link = $(elem).attr(attrs[tag]);
          if ((link !== undefined) && isResLocal(link)) {
            logDebug(`Resource link (from tag ${tag}) - ${link}`);
            const resURL = url.resolve(pageURL, link);
            const nameOfFileForRes = makeFileOrDirNameByLink(link, 'fileForRes');
            const pathToFileForRes = makePathToFileOrDir(pathToDirForRes, nameOfFileForRes);
            logDebug(`Path to file for this resources - ${pathToFileForRes}`);
            resURLs.push({ resURL, filepath: pathToFileForRes });
            $(elem).attr(attrs[tag], makePathToFileOrDir(nameOfDirForRes, nameOfFileForRes));
          }
        });
      });
      logDebug('Write content of page to file');
      return fs.writeFile(pathToFileForPage, $.html());
    })
    .then(() => {
      logDebug('Create dir for resources');
      return fs.mkdir(pathToDirForRes);
    })
    .then(() => {
      logDebug('Write resources to files');
      const arrPromises = resURLs.map(({ resURL, filepath }) => axios({
        method: 'get',
        responseType: responseTypes[path.parse(resURL).ext.slice(1)],
        url: resURL,
      }).then(responseRes => fs.writeFile(filepath, responseRes.data)));
      return Promise.all(arrPromises);
    })
    .catch((e) => {
      throw new Error(makeErrorMessage(e));
    });
};

export default pageLoader;
