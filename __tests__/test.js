import { promises as fs } from 'fs';
import axios from 'axios';
import nock from 'nock';
import httpAdapter from 'axios/lib/adapters/http';
import path from 'path';
import os from 'os';
import pageLoader from '../src';

axios.defaults.adapter = httpAdapter;

test('should work', async () => {
  const host = 'https://hexlet.io';
  const fileName = 'hexlet-io-courses.html';
  const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), '/'));
  const filePath = path.resolve(tmpDir, fileName);

  const data = await fs.readFile('__tests__/__fixtures__/result.txt', 'utf-8');

  nock(host)
    .get('/courses')
    .reply(200, data);

  await pageLoader('https://hexlet.io/courses', tmpDir);
  const result = await fs.readFile(filePath, 'utf-8');
  expect(result).toBe(data);
});
