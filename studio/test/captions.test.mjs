import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import ts from 'typescript';
import {parseSrt} from '../lib/project.mjs';

// Execute the renderer's actual exported TypeScript function, not a test copy.
const rendererSource = fs.readFileSync(new URL('../src/motion.ts', import.meta.url), 'utf8');
const compiledRenderer = ts.transpileModule(rendererSource, {
  compilerOptions: {module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022},
}).outputText;
const {captionText} = await import(`data:text/javascript;base64,${Buffer.from(compiledRenderer).toString('base64')}`);

const examples = [
  {name: 'fullwidth decimal and percent', input: '读数１２．５％。', expected: '读数１２．５％'},
  {name: 'fullwidth negative decimal beside Chinese', input: '温度－２．５度。', expected: '温度－２．５度'},
  {name: 'fullwidth numeric ratio', input: '比例３：２。', expected: '比例３：２'},
  {name: 'fullwidth fraction', input: '取值３／２。', expected: '取值３／２'},
  {name: 'mixed-width decimal notation', input: '读数１2．５%，比例３:2。', expected: '读数１2．５%比例３:2'},
  {name: 'ASCII negative decimal beside Chinese', input: '温度-2.5度。', expected: '温度-2.5度'},
  {name: 'numeric range retains its separator', input: '区间1-2。', expected: '区间1-2'},
  {name: 'mathematical minus and plus keep their original glyphs', input: '温度−２．５度，增量＋２。', expected: '温度−２．５度增量＋２'},
  {name: 'already-supported ASCII numeric notation', input: '读数 12.5% 比例 3:2 和 -2.5。', expected: '读数 12.5% 比例 3:2 和 -2.5'},
  {name: 'percent unit after a parenthesized number', input: '比例(2.5)%。', expected: '比例2.5%'},
  {name: 'fullwidth percent unit after a fullwidth parenthesized number', input: '比例（１２．５）％。', expected: '比例１２．５％'},
  {name: 'percent unit separated from its number by whitespace', input: '比例12.5 %。', expected: '比例12.5 %'},
  {name: 'classification never normalizes the displayed copy', input: '品牌ＡＩ与①的读数１２．５％。', expected: '品牌ＡＩ与①的读数１２．５％'},
  {name: 'ordinary punctuation is still removed', input: '你好，世界！今天（见面）。', expected: '你好世界今天见面'},
  {name: 'multiline numeric cue preserves the line break', input: '温度－２．５度！\n比例３：２。', expected: '温度－２．５度\n比例３：２'},
];

const cue = copy => `1\n00:00:00,123 --> 00:00:02,345\n${copy}\n`;
for (const example of examples) {
  test(`SRT parser preserves number meaning: ${example.name}`, () => {
    const parsed = parseSrt(cue(example.input), 3);
    assert.deepEqual(parsed.issues.errors, []);
    assert.deepEqual(parsed.captions, [{start: .123, end: 2.345, text: example.expected}]);
  });
  test(`actual renderer captionText preserves number meaning: ${example.name}`, () => {
    assert.equal(captionText(example.input), example.expected);
  });
  test(`parser-to-renderer cleanup retains the same numeric cue: ${example.name}`, () => {
    const parsed = parseSrt(cue(example.input), 3);
    assert.deepEqual(parsed.issues.errors, []);
    assert.equal(captionText(parsed.captions[0].text), example.expected);
  });
}
