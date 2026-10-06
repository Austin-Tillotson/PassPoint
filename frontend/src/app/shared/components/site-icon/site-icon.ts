import { Component, computed, input, signal } from '@angular/core';

@Component({
  selector: 'app-site-icon',
  templateUrl: './site-icon.html',
  styleUrl: './site-icon.scss',
  host: { 'aria-hidden': 'true' },
})
export class SiteIcon {
  readonly site = input.required<string>();
  protected readonly loadedUrl = signal<string | null>(null);
  protected readonly failedUrl = signal<string | null>(null);

  private readonly parsedUrl = computed(() => {
    const site = this.site().trim();
    if (!site) return null;
    try {
      const url = new URL(
        /^[a-z][a-z\d+.-]*:/i.test(site) ? site : `https://${site.replace(/^\/\//, '')}`,
      );
      if (!['http:', 'https:'].includes(url.protocol) || !url.hostname) return null;
      return url;
    } catch {
      return null;
    }
  });

  protected readonly faviconUrl = computed(() => {
    const url = this.parsedUrl();
    return url ? new URL('/favicon.ico', url.origin).href : null;
  });

  protected readonly initial = computed(() => {
    const name = (this.parsedUrl()?.hostname ?? this.site().trim()).replace(/^www\./i, '');
    return Array.from(name)[0]?.toUpperCase() || '?';
  });
}
