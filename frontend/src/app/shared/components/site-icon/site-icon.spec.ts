import { TestBed } from '@angular/core/testing';
import { SiteIcon } from './site-icon';

describe('Site icons', () => {
  async function setup(site: string) {
    const fixture = TestBed.createComponent(SiteIcon);
    fixture.componentRef.setInput('site', site);
    await fixture.whenStable();
    return fixture;
  }

  it('requests only the origin favicon and shows an initial until loaded', async () => {
    const fixture = await setup('https://user:secret@www.example.com/login?token=private#section');
    const img: HTMLImageElement = fixture.nativeElement.querySelector('img');
    expect(img.getAttribute('src')).toBe('https://www.example.com/favicon.ico');
    expect(img.getAttribute('referrerpolicy')).toBe('no-referrer');
    expect(fixture.nativeElement.textContent.trim()).toBe('E');
    img.dispatchEvent(new Event('load'));
    await fixture.whenStable();
    expect(fixture.nativeElement.querySelector('.site-icon__initial')).toBeNull();
    expect(img.classList.contains('is-loaded')).toBe(true);
  });

  it('falls back on error and tries the new site when an entry changes', async () => {
    const fixture = await setup('example.com');
    fixture.nativeElement.querySelector('img').dispatchEvent(new Event('error'));
    await fixture.whenStable();
    expect(fixture.nativeElement.querySelector('img')).toBeNull();
    expect(fixture.nativeElement.textContent.trim()).toBe('E');
    fixture.componentRef.setInput('site', 'https://another.example');
    await fixture.whenStable();
    expect(fixture.nativeElement.querySelector('img').getAttribute('src')).toBe(
      'https://another.example/favicon.ico',
    );
    expect(fixture.nativeElement.textContent.trim()).toBe('A');
  });

  it('does not fetch unsupported schemes or malformed URLs', async () => {
    const fixture = await setup('javascript:alert(1)');
    expect(fixture.nativeElement.querySelector('img')).toBeNull();
    fixture.componentRef.setInput('site', 'not a url');
    await fixture.whenStable();
    expect(fixture.nativeElement.querySelector('img')).toBeNull();
    expect(fixture.nativeElement.textContent.trim()).toBe('N');
    fixture.componentRef.setInput('site', '');
    await fixture.whenStable();
    expect(fixture.nativeElement.textContent.trim()).toBe('?');
  });
});
