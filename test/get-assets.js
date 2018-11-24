import path from 'path';
import test from 'ava';
import {copy, ensureDir} from 'fs-extra';
import {isPlainObject, sortBy} from 'lodash';
import tempy from 'tempy';
import getAssets from '../lib/get-assets';

const sortAssets = assets => sortBy(assets, asset => (isPlainObject(asset) ? asset.path : asset));

const fixtures = 'test/fixtures/files';

test('Retrieve file from single path', async t => {
  const cwd = tempy.directory();
  await copy(fixtures, cwd);
  const finalAssets = await getAssets({cwd}, ['file.txt']);

  t.deepEqual(finalAssets, [{path: 'file.txt', name: 'file.txt'}]);
});

test('Retrieve multiple files from path', async t => {
  const cwd = tempy.directory();
  await copy(fixtures, cwd);
  const finalAssets = await getAssets({cwd}, ['file.txt', 'file.css']);

  t.deepEqual(
    sortAssets(finalAssets),
    sortAssets([{path: 'file.txt', name: 'file.txt'}, {path: 'file.css', name: 'file.css'}])
  );
});

test('Include missing files as defined, using Object definition', async t => {
  const cwd = tempy.directory();
  await copy(fixtures, cwd);
  const finalAssets = await getAssets({cwd}, ['file.txt', {path: 'miss*.txt', label: 'Missing'}]);

  t.deepEqual(
    sortAssets(finalAssets),
    sortAssets([{path: 'file.txt', name: 'file.txt'}, {path: 'miss*.txt', label: 'Missing'}])
  );
});

test('Retrieve multiple files from Object', async t => {
  const cwd = tempy.directory();
  await copy(fixtures, cwd);
  const finalAssets = await getAssets({cwd}, [{path: 'file.txt', name: 'file_name', label: 'File label'}, 'file.css']);

  t.deepEqual(
    sortAssets(finalAssets),
    sortAssets([{path: 'file.txt', name: 'file.txt', label: 'File label'}, {path: 'file.css', name: 'file.css'}])
  );
});

test('Retrieve multiple files without duplicates', async t => {
  const cwd = tempy.directory();
  await copy(fixtures, cwd);
  const finalAssets = await getAssets({cwd}, ['file.css', 'file.txt', 'file.css', 'file.txt', 'file.txt', 'file.css']);

  t.deepEqual(
    sortAssets(finalAssets),
    sortAssets([{path: 'file.css', name: 'file.css'}, {path: 'file.txt', name: 'file.txt'}])
  );
});

test('Favor Object over String values when removing duplicates', async t => {
  const cwd = tempy.directory();
  await copy(fixtures, cwd);
  const finalAssets = await getAssets({cwd}, [
    'file.css',
    'file.txt',
    {path: 'file.txt', label: 'file_name'},
    'file.txt',
    {path: 'file.css', label: 'file_other_name'},
    'file.txt',
    'file.css',
  ]);

  t.deepEqual(
    sortAssets(finalAssets),
    sortAssets([
      {path: 'file.txt', name: 'file.txt', label: 'file_name'},
      {path: 'file.css', name: 'file.css', label: 'file_other_name'},
    ])
  );
});

test('Retrieve file from single glob', async t => {
  const cwd = tempy.directory();
  await copy(fixtures, cwd);
  const finalAssets = await getAssets({cwd}, ['file.*']);

  t.deepEqual(
    sortAssets(finalAssets),
    sortAssets([{path: 'file.css', name: 'file.css'}, {path: 'file.txt', name: 'file.txt'}])
  );
});

test('Retrieve multiple files from single glob', async t => {
  const cwd = tempy.directory();
  await copy(fixtures, cwd);
  const finalAssets = await getAssets({cwd}, ['*.txt']);

  t.deepEqual(
    sortAssets(finalAssets),
    sortAssets([{path: 'file.txt', name: 'file.txt'}, {path: 'file_other.txt', name: 'file_other.txt'}])
  );
});

test('Accept glob array with one value', async t => {
  const cwd = tempy.directory();
  await copy(fixtures, cwd);
  const finalAssets = await getAssets({cwd}, [['*ile.txt'], ['*_other.txt']]);

  t.deepEqual(
    sortAssets(finalAssets),
    sortAssets([{path: 'file_other.txt', name: 'file_other.txt'}, {path: 'file.txt', name: 'file.txt'}])
  );
});

test('Include globs that resolve to no files as defined', async t => {
  const cwd = tempy.directory();
  await copy(fixtures, cwd);
  const finalAssets = await getAssets({cwd}, [['file.txt', '!file.txt']]);

  t.deepEqual(
    sortAssets(finalAssets),
    sortAssets([{path: '!file.txt', name: '!file.txt'}, {path: 'file.txt', name: 'file.txt'}])
  );
});

test('Accept glob array with one value for missing files', async t => {
  const cwd = tempy.directory();
  await copy(fixtures, cwd);
  const finalAssets = await getAssets({cwd}, [['*missing.txt'], ['*.css']]);

  t.deepEqual(
    sortAssets(finalAssets),
    sortAssets([{path: 'file.css', name: 'file.css'}, {path: '*missing.txt', name: '*missing.txt'}])
  );
});

test('Replace name by filename for Object that match dusaplicate name', async t => {
  const cwd = tempy.directory();
  await copy(fixtures, cwd);
  const finalAssets = await getAssets({cwd}, [{path: '*.txt', name: 'file_name', label: 'File label'}]);

  t.deepEqual(
    sortAssets(finalAssets),
    sortAssets([
      {path: 'file.txt', name: 'file.txt', label: 'File label'},
      {path: 'file_other.txt', name: 'file_other.txt', label: 'File label'},
    ])
  );
});

test('Include dotfiles', async t => {
  const cwd = tempy.directory();
  await copy(fixtures, cwd);
  const finalAssets = await getAssets({cwd}, ['.dot*']);

  t.deepEqual(finalAssets, [{path: '.dotfile', name: '.dotfile'}]);
});

test('Ingnore single negated glob', async t => {
  const cwd = tempy.directory();
  await copy(fixtures, cwd);
  const finalAssets = await getAssets({cwd}, ['!*.txt']);

  t.deepEqual(finalAssets, []);
});

test('Ingnore single negated glob in Object', async t => {
  const cwd = tempy.directory();
  await copy(fixtures, cwd);
  const finalAssets = await getAssets({cwd}, [{path: '!*.txt'}]);

  t.deepEqual(finalAssets, []);
});

test('Accept negated globs', async t => {
  const cwd = tempy.directory();
  await copy(fixtures, cwd);
  const finalAssets = await getAssets({cwd}, [['*.txt', '!**/*_other.txt']]);

  t.deepEqual(finalAssets, [{path: 'file.txt', name: 'file.txt'}]);
});

test('Expand directories', async t => {
  const cwd = tempy.directory();
  await copy(fixtures, path.resolve(cwd, 'dir'));
  const finalAssets = await getAssets({cwd}, [['dir']]);

  t.deepEqual(
    sortAssets(finalAssets),
    sortAssets([
      {path: 'dir', name: 'dir'},
      {path: 'dir/file.css', name: 'file.css'},
      {path: 'dir/file.txt', name: 'file.txt'},
      {path: 'dir/file_other.txt', name: 'file_other.txt'},
      {path: 'dir/.dotfile', name: '.dotfile'},
    ])
  );
});

test('Include empty directory as defined', async t => {
  const cwd = tempy.directory();
  await copy(fixtures, cwd);
  await ensureDir(path.resolve(cwd, 'empty'));
  const finalAssets = await getAssets({cwd}, [['empty']]);

  t.deepEqual(finalAssets, [{path: 'empty', name: 'empty'}]);
});

test('Deduplicate resulting files path', async t => {
  const cwd = tempy.directory();
  await copy(fixtures, cwd);
  const finalAssets = await getAssets({cwd}, ['./file.txt', path.resolve(cwd, 'file.txt'), 'file.txt']);

  t.deepEqual(finalAssets, [{path: 'file.txt', name: 'file.txt'}]);
});
