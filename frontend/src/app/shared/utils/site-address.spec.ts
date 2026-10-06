import { parseSiteAddress, siteDisplayName } from './site-address';

describe('Site addresses', () => {
  it('accepts addresses with or without a scheme and preserves paths', () => {
    expect(parseSiteAddress(' www.example.com/login?next=home ')?.href).toBe(
      'https://www.example.com/login?next=home',
    );
    expect(parseSiteAddress('http://example.com/path')?.href).toBe('http://example.com/path');
    expect(parseSiteAddress('localhost:8080')?.href).toBe('https://localhost:8080/');
  });

  it('rejects unsupported schemes, credentials, whitespace and malformed addresses', () => {
    for (const value of [
      '',
      'not a site',
      'https://',
      'javascript:alert(1)',
      'data:text/html,test',
      'https://user:secret@example.com',
    ]) {
      expect(parseSiteAddress(value)).toBeNull();
    }
  });

  it('removes schemes, www, suffixes and paths from display names', () => {
    expect(siteDisplayName('https://www.github.com/login')).toBe('github');
    expect(siteDisplayName('example.net')).toBe('example');
    expect(siteDisplayName('accounts.example.co.uk/login')).toBe('accounts.example');
    expect(siteDisplayName('my-project.github.io')).toBe('my-project');
    expect(siteDisplayName('http://127.0.0.1:8080/path')).toBe('127.0.0.1');
    expect(siteDisplayName('localhost:8080')).toBe('localhost');
  });
});
