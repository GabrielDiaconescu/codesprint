import { collectEntries, renderLicensesPage } from '../licenses';

/**
 * The open-source licences page (SPEC §29). Every package once, whatever depends on it; the
 * old `licenses` form read; nothing a package author wrote able to break the page.
 */
describe('the licences page', () => {
  const tree = {
    dependencies: {
      b: {
        version: '1.0.0',
        license: 'MIT',
        dependencies: { c: { version: '2.0.0', license: 'ISC' } },
      },
      a: {
        version: '3.0.0',
        license: { type: 'Apache-2.0' },
        dependencies: { c: { version: '2.0.0', license: 'ISC' } },
      },
    },
  };

  it('lists each package once, sorted, with its declared licence', () => {
    const entries = collectEntries(tree);

    expect(entries.map((e) => `${e.name}@${e.version} ${e.license}`)).toEqual([
      'a@3.0.0 Apache-2.0',
      'b@1.0.0 MIT',
      'c@2.0.0 ISC',
    ]);
  });

  it('escapes what it prints', () => {
    const html = renderLicensesPage([
      { name: '<script>', version: '1', license: 'MIT', text: 'Copyright <me> & co' },
    ]);

    expect(html).not.toContain('<script>');
    expect(html).toContain('&lt;script&gt;');
    expect(html).toContain('Copyright &lt;me&gt; &amp; co');
  });
});
