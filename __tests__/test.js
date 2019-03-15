import { promises as fs } from 'fs';
import axios from 'axios';
import nock from 'nock';
import httpAdapter from 'axios/lib/adapters/http';
import path from 'path';
import os from 'os';
import pageLoader from '../src';

axios.defaults.adapter = httpAdapter;

const makeFilepath = (dirpath, fileName) => path.join(dirpath, `${fileName}`);

const testDirpath = '__tests__/__fixtures__';

test('should work', async () => {
  const host = 'https://hexlet.io';
  const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), '/'));

  const pageContent = await fs.readFile(makeFilepath(testDirpath, 'pageContent.txt'), 'utf-8');
  const cssContent = await fs.readFile(makeFilepath(testDirpath, 'cssContent.txt'), 'utf-8');
  const jsContent = await fs.readFile(makeFilepath(testDirpath, 'jsContent.txt'), 'utf-8');
  const jpegContent = await fs.readFile(makeFilepath(testDirpath, 'imgJpeg.jpeg'));
  const pngContent = await fs.readFile(makeFilepath(testDirpath, 'imgPng.png'));
  const modPageContent = await fs.readFile(makeFilepath(testDirpath, 'modPageContent.txt'), 'utf-8');

  nock(host)
    .get('/courses')
    .reply(200, pageContent)
    .get('/content/file1.css')
    .reply(200, cssContent)
    .get('/content/file2.js')
    .reply(200, jsContent)
    .get('/content/img1.jpeg')
    .replyWithFile(200, makeFilepath(testDirpath, 'imgJpeg.jpeg'))
    .get('/content/img2.png')
    .replyWithFile(200, makeFilepath(testDirpath, 'imgPng.png'));

  await pageLoader('https://hexlet.io/courses', tmpDir);

  const fileForPageName = 'hexlet-io-courses.html';
  const fileForPagePath = path.resolve(tmpDir, fileForPageName);
  const dirForResName = 'hexlet-io-courses_files';
  const dirForResPath = path.resolve(tmpDir, dirForResName);
  const resultPageContent = await fs.readFile(fileForPagePath, 'utf-8');
  const resultCssContent = await fs.readFile(makeFilepath(dirForResPath, 'content-file1.css'), 'utf-8');
  const resultJsContent = await fs.readFile(makeFilepath(dirForResPath, 'content-file2.js'), 'utf-8');
  const resultJpegContent = await fs.readFile(makeFilepath(dirForResPath, 'content-img1.jpeg'));
  const resultPngContent = await fs.readFile(makeFilepath(dirForResPath, 'content-img2.png'));

  expect(resultPageContent).toBe(modPageContent);
  expect(resultCssContent).toBe(cssContent);
  expect(resultJsContent).toBe(jsContent);
  expect(resultJpegContent).toEqual(jpegContent);
  expect(resultPngContent).toEqual(pngContent);
});
