import url from 'url';
import { promises as fs } from 'fs';
import axios from 'axios';
import path from 'path';
import { words } from 'lodash';

const makeFileNameByURL = (pageURL) => {
  const { host, pathname } = url.parse(pageURL);
  const pageURLWithoutProtocol = `${host}/${pathname}`;
  return words(pageURLWithoutProtocol, /[^./]+/g).join('-').concat('.html');
};

const pageLoader = (pageURL, dirpath) => {
  const fileName = makeFileNameByURL(pageURL);
  const filePath = path.join(dirpath, fileName);
  return axios.get(pageURL)
    .then(response => fs.writeFile(filePath, response.data));
};

export default pageLoader;
