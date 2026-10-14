"""Real local document fixtures and approval transitions; no provider calls."""
import copy
import importlib.util
import json
import os
from pathlib import Path
import shutil
import stat
import subprocess
import sys
import tempfile
import unittest
from unittest import mock
import zipfile


SCRIPT = Path(__file__).with_name('story_intake.py')
SPEC = importlib.util.spec_from_file_location('story_intake', SCRIPT)
story = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(story)


def make_pdf(path, page_texts):
    """A real minimal uncompressed PDF with fonts, page tree and byte-accurate xref."""
    objects = [b'<< /Type /Catalog /Pages 2 0 R >>', b'',
               b'<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>']
    kids = []
    for value in page_texts:
        page_id = len(objects) + 1
        content_id = page_id + 1
        kids.append(str(page_id) + ' 0 R')
        objects.append(('<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] '
                        '/Resources << /Font << /F1 3 0 R >> >> /Contents ' + str(content_id) + ' 0 R >>').encode())
        content = b'' if value is None else ('BT /F1 12 Tf 72 720 Td (' + value + ') Tj ET').encode('ascii')
        objects.append(b'<< /Length ' + str(len(content)).encode() + b' >>\nstream\n' + content + b'\nendstream')
    objects[1] = ('<< /Type /Pages /Kids [' + ' '.join(kids) + '] /Count ' + str(len(kids)) + ' >>').encode()
    output = bytearray(b'%PDF-1.4\n')
    offsets = [0]
    for index, content in enumerate(objects, 1):
        offsets.append(len(output))
        output.extend(str(index).encode() + b' 0 obj\n' + content + b'\nendobj\n')
    xref = len(output)
    output.extend(b'xref\n0 ' + str(len(objects) + 1).encode() + b'\n0000000000 65535 f \n')
    for offset in offsets[1:]:
        output.extend(('%010d 00000 n \n' % offset).encode())
    output.extend(('trailer\n<< /Size ' + str(len(objects) + 1) + ' /Root 1 0 R >>\nstartxref\n' + str(xref) + '\n%%EOF\n').encode())
    path.write_bytes(output)


def pdf_backend_available():
    return importlib.util.find_spec('pypdf') is not None or poppler_backend_available()


def poppler_backend_available():
    binary = shutil.which('pdftotext')
    return binary is not None and Path(binary).resolve().with_name(
        'pdfinfo.exe' if Path(binary).suffix.lower() == '.exe' else 'pdfinfo').is_file()


class StoryIntakeTests(unittest.TestCase):
    def setUp(self):
        self.temporary = tempfile.TemporaryDirectory()
        self.root = Path(self.temporary.name)
        self.source = self.root / 'article.md'
        self.source.write_text('# 纸飞机\n\n小朋友折好纸飞机，第一次试飞掉在脚边。\n\n他调整机翼，第二次飞过了桌子。', encoding='utf-8')
        self.project = self.root / 'story-job'

    def tearDown(self):
        self.temporary.cleanup()

    def ingest(self, *inputs):
        return story.ingest(list(inputs or [self.source]), self.project)

    def prepared(self, mode='regenerate'):
        self.ingest()
        story.template(self.project)
        (self.project / 'STORY.md').write_text('# 纸飞机的小冒险\n\n## 故事正文\n\n折好的纸飞机第一次飞到脚边。小朋友观察机翼，做出调整，再次试飞，这回飞过了桌子。\n', encoding='utf-8')
        plan = json.loads((self.project / 'asset-plan.json').read_text())
        plan['mode'] = mode
        plan['assets'][0]['action'] = 'reuse' if mode == 'reuse' else 'generate'
        plan['assets'][0]['description'] = '纸飞机从折叠到两次试飞的连续主体。'
        if mode == 'mixed':
            plan['assets'].append({'id': 'background', 'kind': 'image', 'action': 'reuse',
                                   'path': 'assets/background.png', 'description': '已确认复用的纸张背景。'})
            plan['sections'][0]['assetIds'].append('background')
        (self.project / 'asset-plan.json').write_bytes(story.json_bytes(plan))
        for item in plan['assets']:
            if item['action'] == 'reuse':
                path = self.project / item['path']
                path.parent.mkdir(exist_ok=True)
                path.write_bytes(b'fixture original image content')
        return plan

    def approve(self, mode='regenerate'):
        return story.approve(self.project, 'Fixture user', '脚本可以，素材按照已选方案制作。',
                             'isolated-test-reply-001', mode, True, True)

    def finish_assets(self, plan):
        for item in plan['assets']:
            path = self.project / item['path']
            if not path.exists():
                path.parent.mkdir(exist_ok=True)
                path.write_bytes(b'fixture generated media')
        story.seal_assets(self.project)

    def test_utf8_bom_paragraphs_and_source_integrity(self):
        self.source.write_bytes(b'\xef\xbb\xbf' + '标题\r\n\r\n第一段\r\n第二行'.encode())
        result = self.ingest()
        self.assertEqual(result['status'], 'complete_text')
        record = json.loads((self.project / 'intake.json').read_text())['sources'][0]
        self.assertEqual(record['sha256'], story.sha(self.source.read_bytes()))
        self.assertEqual([unit['text'] for unit in record['units']], ['标题', '第一段\n第二行'])
        self.assertEqual(record['units'][1]['paragraph'], 2)
        self.assertIsNone(record['units'][1]['page'])
        self.assertEqual(story.extraction_check(self.project)[1], {'s001-n001', 's001-n002'})

    def test_multiple_sources_have_distinct_unit_ids(self):
        second = self.root / 'second.txt'
        second.write_text('第二篇文章', encoding='utf-8')
        self.ingest(self.source, second)
        record, units = story.extraction_check(self.project)
        self.assertEqual(len(record['sources']), 2)
        self.assertIn('s002-n001', units)

    def test_utf8_byte_limit_returns_readable_needs_input_instead_of_false_success(self):
        self.source.write_text('中' * (3 * 1024 * 1024), encoding='utf-8')
        process = subprocess.run([sys.executable, str(SCRIPT), 'ingest', str(self.source),
                                  '--project', str(self.project)], capture_output=True, text=True)
        self.assertEqual(process.returncode, 2, process.stderr)
        self.assertEqual(json.loads(process.stdout)['status'], 'needs_input')
        record = story.read_json(self.project, 'intake.json')['sources'][0]
        self.assertIn('needs_split_sources', record['error'])
        self.assertEqual(record['units'], [])
        self.assertEqual((self.project / record['snapshot']).read_bytes(), self.source.read_bytes())
        with self.assertRaisesRegex(story.IntakeError, 'incomplete'):
            story.template(self.project)

    def test_combined_source_budget_preserves_snapshots_and_reports_needs_input(self):
        self.source.write_text('a' * 2500, encoding='utf-8')
        second = self.root / 'second.txt'
        second.write_text('b' * 2500, encoding='utf-8')
        with mock.patch.object(story, 'MAX_TEXT', 4096):
            self.assertEqual(self.ingest(self.source, second)['status'], 'needs_input')
            extraction = story.read_json(self.project, 'intake.json')
            self.assertTrue(any('needs_split_sources' in (record['error'] or '') for record in extraction['sources']))
            for name in ('intake.json', 'material.md'):
                self.assertLessEqual((self.project / name).stat().st_size, story.MAX_TEXT)
            for record, source in zip(extraction['sources'], (self.source, second)):
                self.assertEqual((self.project / record['snapshot']).read_bytes(), source.read_bytes())
            with self.assertRaisesRegex(story.IntakeError, 'incomplete'):
                story.template(self.project)

    def test_json_escaping_overhead_is_included_in_the_evidence_budget(self):
        self.source.write_text('A"' * 1250, encoding='utf-8')
        with mock.patch.object(story, 'MAX_TEXT', 4096):
            self.assertEqual(self.ingest()['status'], 'needs_input')
            record = story.read_json(self.project, 'intake.json')['sources'][0]
            self.assertIn('needs_split_sources', record['error'])
            self.assertLessEqual((self.project / 'intake.json').stat().st_size, story.MAX_TEXT)
            self.assertLessEqual((self.project / 'material.md').stat().st_size, story.MAX_TEXT)

    def test_same_asset_through_duplicate_separator_is_rejected(self):
        plan = self.prepared('regenerate')
        alias = copy.deepcopy(plan['assets'][0])
        alias.update(id='hero-alias', path='assets//hero.png')
        plan['assets'].append(alias)
        plan['sections'][0]['assetIds'].append('hero-alias')
        (self.project / 'asset-plan.json').write_bytes(story.json_bytes(plan))
        with self.assertRaises(story.IntakeError):
            story.check(self.project)

    def test_distinct_asset_paths_sharing_an_inode_are_rejected(self):
        plan = self.prepared('reuse')
        first = self.project / 'assets/hero.png'
        second = self.project / 'assets/alias.png'
        os.link(first, second)
        alias = copy.deepcopy(plan['assets'][0])
        alias.update(id='hero-alias', path='assets/alias.png')
        plan['assets'].append(alias)
        plan['sections'][0]['assetIds'].append('hero-alias')
        (self.project / 'asset-plan.json').write_bytes(story.json_bytes(plan))
        with self.assertRaises(story.IntakeError):
            story.check(self.project)

    def test_html_headings_lists_tables_and_script_are_separated(self):
        html = self.root / 'material.html'
        html.write_text('<html><head><title>ignore me</title></head><body><h1>飞机实验</h1>'
                        '<p>起飞 &amp; 调整<br>第二行</p><ul><li>第一次失败</li><li>第二次成功</li></ul>'
                        '<table><tr><td>距离</td><td>两米</td></tr></table>'
                        '<script>send_token()</script><style>body{}</style></body></html>', encoding='utf-8')
        self.ingest(html)
        text = (self.project / 'material.md').read_text()
        for value in ('# 飞机实验', '起飞 & 调整\n第二行', '• 第一次失败', '• 第二次成功', '距离 | 两米'):
            self.assertIn(value, text)
        for value in ('ignore me', 'send_token', 'body{}'):
            self.assertNotIn(value, text)

    def test_non_utf8_is_preserved_but_blocks_story(self):
        self.source.write_bytes('无法猜编码'.encode('gbk'))
        result = self.ingest()
        self.assertEqual(result['status'], 'needs_input')
        record = json.loads((self.project / 'intake.json').read_text())['sources'][0]
        self.assertIn('needs_utf8', record['error'])
        self.assertEqual((self.project / record['snapshot']).read_bytes(), self.source.read_bytes())
        with self.assertRaises(story.IntakeError):
            story.template(self.project)

    def test_empty_text_blocks_story(self):
        self.source.write_text('  \n\n', encoding='utf-8')
        self.assertEqual(self.ingest()['status'], 'needs_input')
        with self.assertRaises(story.IntakeError):
            story.template(self.project)

    def test_binary_nul_rejected(self):
        self.source.write_bytes(b'hello\x00world')
        self.assertEqual(self.ingest()['status'], 'needs_input')
        self.assertIn('Binary NUL', (self.project / 'intake.json').read_text())

    def test_existing_output_is_preserved(self):
        self.project.mkdir()
        marker = self.project / 'keep.txt'
        marker.write_text('keep')
        with self.assertRaises(story.IntakeError):
            self.ingest()
        self.assertEqual(marker.read_text(), 'keep')

    def test_unsupported_type_does_not_create_project(self):
        unknown = self.root / 'data.exe'
        unknown.write_bytes(b'unknown')
        with self.assertRaises(story.IntakeError):
            self.ingest(unknown)
        self.assertFalse(self.project.exists())

    def test_input_symlink_is_rejected(self):
        link = self.root / 'link.md'
        link.symlink_to(self.source)
        with self.assertRaises(story.IntakeError):
            self.ingest(link)

    def test_docx_main_text_tabs_and_table_paragraphs(self):
        docx = self.root / 'input.docx'
        xml = '<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body>' \
              '<w:p><w:r><w:t>开头</w:t><w:tab/><w:t>后半句</w:t></w:r></w:p>' \
              '<w:tbl><w:tr><w:tc><w:p><w:r><w:t>表格文字</w:t></w:r></w:p></w:tc></w:tr></w:tbl>' \
              '</w:body></w:document>'
        with zipfile.ZipFile(docx, 'w') as archive:
            archive.writestr('word/document.xml', xml)
        self.assertEqual(self.ingest(docx)['status'], 'complete_text')
        record = json.loads((self.project / 'intake.json').read_text())['sources'][0]
        self.assertEqual([unit['text'] for unit in record['units']], ['开头\t后半句', '表格文字'])
        self.assertIn('headers', record['limitations'][0])

    def test_bad_docx_zip_is_recorded_as_failed(self):
        docx = self.root / 'input.docx'
        docx.write_bytes(b'not a zip')
        self.assertEqual(self.ingest(docx)['status'], 'needs_input')
        self.assertIn('Invalid DOCX', (self.project / 'intake.json').read_text())

    def test_docx_path_traversal_never_extracts_members(self):
        for member in ('../escaped.txt', '/escaped.txt', 'word\\escape.txt', 'C:/escaped.txt'):
            with self.subTest(member=member):
                docx = self.root / 'unsafe.docx'
                with zipfile.ZipFile(docx, 'w') as archive:
                    archive.writestr(member, 'malicious')
                    archive.writestr('word/document.xml', '<document/>')
                with self.assertRaises(story.IntakeError):
                    story.extract_docx(docx)
                self.assertFalse((self.root.parent / 'escaped.txt').exists())

    def test_docx_symlink_and_entity_xml_are_rejected(self):
        docx = self.root / 'unsafe.docx'
        symlink = zipfile.ZipInfo('word/link')
        symlink.create_system = 3
        symlink.external_attr = (stat.S_IFLNK | 0o777) << 16
        with zipfile.ZipFile(docx, 'w') as archive:
            archive.writestr(symlink, '/etc/passwd')
            archive.writestr('word/document.xml', '<document/>')
        with self.assertRaises(story.IntakeError):
            story.extract_docx(docx)
        with zipfile.ZipFile(docx, 'w') as archive:
            archive.writestr('word/document.xml', '<!DOCTYPE foo [<!ENTITY x "x">]><foo/>')
        with self.assertRaises(story.IntakeError):
            story.extract_docx(docx)

    @unittest.skipUnless(pdf_backend_available(), 'A real PDF extractor is not installed')
    def test_real_pdf_page_and_paragraph_provenance(self):
        pdf = self.root / 'input.pdf'
        make_pdf(pdf, ['Paper plane first flight.', 'The second flight crossed the table.'])
        self.assertEqual(self.ingest(pdf)['status'], 'complete_text')
        record = json.loads((self.project / 'intake.json').read_text())['sources'][0]
        self.assertEqual(record['pageCount'], 2)
        self.assertEqual([unit['page'] for unit in record['units']], [1, 2])
        self.assertIn('second flight', record['units'][1]['text'])
        self.assertEqual(record['units'][1]['id'], 's001-p002-n001')

    @unittest.skipUnless(pdf_backend_available(), 'A real PDF extractor is not installed')
    def test_scan_like_or_empty_pdf_page_blocks_even_partial_extraction(self):
        pdf = self.root / 'input.pdf'
        make_pdf(pdf, ['A readable first page.', None])
        self.assertEqual(self.ingest(pdf)['status'], 'needs_input')
        record = json.loads((self.project / 'intake.json').read_text())['sources'][0]
        self.assertEqual(record['emptyPages'], [2])
        self.assertEqual(len(record['units']), 1)
        self.assertIn('no OCR', record['error'])
        with self.assertRaises(story.IntakeError):
            story.template(self.project)

    def test_missing_pdf_backend_has_explicit_fallback(self):
        pdf = self.root / 'input.pdf'
        make_pdf(pdf, ['Readable material.'])
        with mock.patch.dict(sys.modules, {'pypdf': None}), mock.patch.object(story.shutil, 'which', return_value=None):
            self.assertEqual(self.ingest(pdf)['status'], 'needs_input')
        self.assertIn('needs_pdf_extractor', (self.project / 'intake.json').read_text())

    @unittest.skipUnless(poppler_backend_available(), 'A matching pdftotext/pdfinfo Poppler pair is not installed')
    def test_poppler_checks_unencrypted_real_pdf_before_extracting(self):
        pdf = self.root / 'plain.pdf'
        make_pdf(pdf, ['Readable unencrypted material.'])
        with mock.patch.dict(sys.modules, {'pypdf': None}):
            self.assertEqual(self.ingest(pdf)['status'], 'complete_text')
        record = json.loads((self.project / 'intake.json').read_text())['sources'][0]
        self.assertEqual(record['extractor'], 'pdftotext-layout')
        self.assertEqual(record['units'][0]['text'], 'Readable unencrypted material.')

    @unittest.skipUnless(poppler_backend_available() and shutil.which('qpdf'),
                         'A matching Poppler pair and qpdf are needed for the real encrypted PDF fixture')
    def test_poppler_rejects_real_encrypted_pdf_even_with_empty_user_password(self):
        plain = self.root / 'plain.pdf'
        pdf = self.root / 'owner-encrypted.pdf'
        make_pdf(plain, ['Readable but encrypted material.'])
        process = subprocess.run([shutil.which('qpdf'), '--encrypt', '', 'fixture-owner-password',
                                  '256', '--', str(plain), str(pdf)], capture_output=True, text=True, timeout=20)
        self.assertEqual(process.returncode, 0, process.stderr)
        # This exact input really is accepted by pdftotext without a password.
        readable = subprocess.run([shutil.which('pdftotext'), str(pdf), '-'], capture_output=True, timeout=20)
        self.assertEqual(readable.returncode, 0, readable.stderr)
        self.assertIn(b'Readable but encrypted material.', readable.stdout)
        with mock.patch.dict(sys.modules, {'pypdf': None}):
            self.assertEqual(self.ingest(pdf)['status'], 'needs_input')
        record = json.loads((self.project / 'intake.json').read_text())['sources'][0]
        self.assertIn('Encrypted', record['error'])
        self.assertEqual(record['units'], [])
        with self.assertRaises(story.IntakeError):
            story.template(self.project)

    def test_missing_matching_pdfinfo_blocks_before_text_extraction(self):
        pdf = self.root / 'plain.pdf'
        make_pdf(pdf, ['Readable material.'])
        tool = self.root / 'poppler' / 'pdftotext'
        tool.parent.mkdir()
        tool.write_text('not invoked')
        with mock.patch.dict(sys.modules, {'pypdf': None}), \
                mock.patch.object(story.shutil, 'which', return_value=str(tool)), \
                mock.patch.object(story.subprocess, 'run', side_effect=AssertionError('No extraction without pdfinfo')):
            self.assertEqual(self.ingest(pdf)['status'], 'needs_input')
        self.assertIn('needs_pdf_encryption_check', (self.project / 'intake.json').read_text())

    def test_template_cannot_be_approved(self):
        self.ingest()
        story.template(self.project)
        with self.assertRaises(story.IntakeError):
            self.approve()
        self.assertFalse((self.project / 'approval.json').exists())

    def test_no_confirmation_blocks_asset_and_render_actions(self):
        self.prepared()
        for phase in ('assets', 'render'):
            with self.subTest(phase=phase), self.assertRaises(story.IntakeError):
                story.gate(self.project, phase)
        with self.assertRaises(story.IntakeError):
            story.seal_assets(self.project)

    def test_approval_requires_explicit_both_decisions_and_reply(self):
        self.prepared()
        for script_ok, material_ok, reply, mode in ((False, True, 'reply', 'regenerate'),
                                                    (True, False, 'reply', 'regenerate'),
                                                    (True, True, '', 'regenerate'),
                                                    (True, True, 'reply', 'reuse')):
            with self.subTest(script_ok=script_ok, material_ok=material_ok, reply=reply, mode=mode):
                with self.assertRaises(story.IntakeError):
                    story.approve(self.project, 'Fixture user', '已确认脚本素材方案', reply, mode, script_ok, material_ok)
        self.assertFalse((self.project / 'approval.json').exists())

    def test_generated_assets_transition_missing_unsealed_ready(self):
        plan = self.prepared()
        self.approve()
        self.assertEqual(story.gate(self.project, 'assets')['status'], 'allowed')
        with self.assertRaises(story.IntakeError):
            story.gate(self.project, 'render')
        for asset in plan['assets']:
            path = self.project / asset['path']
            path.parent.mkdir(exist_ok=True)
            path.write_bytes(b'new original media')
        with self.assertRaises(story.IntakeError):
            story.gate(self.project, 'render')
        story.seal_assets(self.project)
        self.assertEqual(story.gate(self.project, 'render')['status'], 'allowed')

    def test_all_three_modes_can_complete_with_real_file_integrity(self):
        for mode in ('reuse', 'regenerate', 'mixed'):
            with self.subTest(mode=mode):
                self.project = self.root / ('story-' + mode)
                plan = self.prepared(mode)
                self.approve(mode)
                self.finish_assets(plan)
                self.assertEqual(story.gate(self.project, 'render')['mode'], mode)

    def test_script_or_plan_change_invalidates_approval(self):
        for name in ('STORY.md', 'asset-plan.json'):
            with self.subTest(name=name):
                self.project = self.root / name.replace('.', '-')
                self.prepared()
                self.approve()
                path = self.project / name
                path.write_bytes(path.read_bytes() + b'\n')
                with self.assertRaisesRegex(story.IntakeError, 'stale'):
                    story.gate(self.project, 'assets')

    def test_source_original_and_snapshot_changes_block(self):
        self.prepared()
        self.approve()
        original = self.source.read_bytes()
        self.source.write_bytes(original + b'\nchanged')
        with self.assertRaisesRegex(story.IntakeError, 'Original source changed'):
            story.gate(self.project, 'assets')
        self.source.write_bytes(original)
        snapshot = self.project / 'sources/s001.md'
        snapshot.write_bytes(original + b'\nchanged')
        with self.assertRaisesRegex(story.IntakeError, 'Source snapshot changed'):
            story.gate(self.project, 'assets')

    def test_extracted_evidence_cannot_be_edited(self):
        self.prepared()
        self.approve()
        material = self.project / 'material.md'
        material.write_text(material.read_text() + '\n伪造数字', encoding='utf-8')
        with self.assertRaisesRegex(story.IntakeError, 'differs from extraction'):
            story.gate(self.project, 'assets')

    def test_reused_asset_change_invalidates_user_approval(self):
        plan = self.prepared('reuse')
        self.approve('reuse')
        self.finish_assets(plan)
        (self.project / 'assets/hero.png').write_bytes(b'changed asset')
        for phase in ('assets', 'render'):
            with self.subTest(phase=phase), self.assertRaisesRegex(story.IntakeError, 'stale'):
                story.gate(self.project, phase)

    def test_generated_asset_change_invalidates_receipt(self):
        plan = self.prepared()
        self.approve()
        self.finish_assets(plan)
        (self.project / 'assets/hero.png').write_bytes(b'changed generated asset')
        with self.assertRaisesRegex(story.IntakeError, 'unsealed or changed'):
            story.gate(self.project, 'render')
        story.seal_assets(self.project)
        self.assertEqual(story.gate(self.project, 'render')['status'], 'allowed')

    def test_empty_generated_asset_never_allows_render(self):
        plan = self.prepared()
        self.approve()
        path = self.project / plan['assets'][0]['path']
        path.parent.mkdir()
        path.write_bytes(b'')
        with self.assertRaises(story.IntakeError):
            story.seal_assets(self.project)

    def test_plan_asset_paths_cannot_escape_or_follow_symlinks(self):
        plan = self.prepared()
        for value in ('../escape.png', '/tmp/escape.png', 'assets/../escape.png', 'assets\\escape.png', 'C:/escape.png'):
            with self.subTest(value=value):
                changed = copy.deepcopy(plan)
                changed['assets'][0]['path'] = value
                (self.project / 'asset-plan.json').write_bytes(story.json_bytes(changed))
                with self.assertRaises(story.IntakeError):
                    story.check(self.project)
        (self.project / 'asset-plan.json').write_bytes(story.json_bytes(plan))
        (self.project / 'assets').symlink_to(self.root, target_is_directory=True)
        with self.assertRaises(story.IntakeError):
            story.check(self.project)

    def test_unknown_source_reference_and_unused_asset_rejected(self):
        plan = self.prepared()
        changed = copy.deepcopy(plan)
        changed['sections'][0]['sourceUnitIds'] = ['s999-n001']
        (self.project / 'asset-plan.json').write_bytes(story.json_bytes(changed))
        with self.assertRaisesRegex(story.IntakeError, 'source unit'):
            story.check(self.project)
        changed = copy.deepcopy(plan)
        changed['assets'].append({'id': 'unused', 'kind': 'image', 'action': 'generate',
                                  'path': 'assets/unused.png', 'description': '没有进入故事的图片。'})
        (self.project / 'asset-plan.json').write_bytes(story.json_bytes(changed))
        with self.assertRaisesRegex(story.IntakeError, 'belong to a story section'):
            story.check(self.project)

    def test_mode_mismatch_and_unfinished_material_action_rejected(self):
        plan = self.prepared()
        for action in ('reuse', 'pending'):
            changed = copy.deepcopy(plan)
            changed['assets'][0]['action'] = action
            (self.project / 'asset-plan.json').write_bytes(story.json_bytes(changed))
            with self.assertRaises(story.IntakeError):
                story.check(self.project)

    def test_fiction_has_explicit_flag_when_no_source(self):
        plan = self.prepared()
        plan['sections'][0]['sourceUnitIds'] = []
        (self.project / 'asset-plan.json').write_bytes(story.json_bytes(plan))
        with self.assertRaises(story.IntakeError):
            story.check(self.project)
        plan['sections'][0]['fiction'] = True
        (self.project / 'asset-plan.json').write_bytes(story.json_bytes(plan))
        self.assertEqual(story.check(self.project)[2]['status'], 'ready_for_user_review')

    def test_duplicate_json_fields_are_rejected(self):
        self.prepared()
        (self.project / 'asset-plan.json').write_text('{"mode":"reuse","mode":"regenerate"}')
        with self.assertRaisesRegex(story.IntakeError, 'Duplicate JSON key'):
            story.check(self.project)

    def test_reapproval_keeps_previous_declaration(self):
        self.prepared()
        self.approve()
        original = (self.project / 'approval.json').read_bytes()
        script = self.project / 'STORY.md'
        script.write_text(script.read_text() + '\n用户要求补充结尾。', encoding='utf-8')
        self.approve()
        history = list((self.project / 'history').glob('approval-*.json'))
        self.assertEqual(len(history), 1)
        self.assertEqual(history[0].read_bytes(), original)

    def test_cli_failure_returns_machine_readable_block_without_traceback(self):
        self.prepared()
        process = subprocess.run([sys.executable, str(SCRIPT), 'gate', '--project', str(self.project),
                                  '--stage', 'render'], capture_output=True, text=True)
        self.assertEqual(process.returncode, 2)
        self.assertEqual(json.loads(process.stderr)['status'], 'blocked')
        self.assertNotIn('Traceback', process.stderr)

    def test_cli_ingest_failure_is_saved_and_exits_nonzero(self):
        self.source.write_bytes(b'\xff\xfe')
        process = subprocess.run([sys.executable, str(SCRIPT), 'ingest', str(self.source),
                                  '--project', str(self.project)], capture_output=True, text=True)
        self.assertEqual(process.returncode, 2)
        self.assertEqual(json.loads(process.stdout)['status'], 'needs_input')
        self.assertTrue((self.project / 'sources/s001.md').is_file())


if __name__ == '__main__':
    unittest.main(verbosity=2)
