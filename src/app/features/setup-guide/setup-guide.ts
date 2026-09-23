import { Component } from '@angular/core';

@Component({
  selector: 'app-setup-guide',
  imports: [],
  templateUrl: './setup-guide.html',
  styleUrl: './setup-guide.scss'
})
export class SetupGuide {
  // Plain `<a href="#id">` fragment links resolve against this app's <base href="/">, which sends
  // them to the root path (and from there the '**' redirect lands on Dashboard) instead of
  // scrolling within this page. Intercept in-page anchors and scroll manually instead.
  protected onContentClick(event: MouseEvent): void {
    const target = (event.target as HTMLElement).closest('a[href^="#"]');
    if (!target) {
      return;
    }

    const id = target.getAttribute('href')?.slice(1);
    if (id) {
      event.preventDefault();
      this.scrollTo(id);
    }
  }

  protected scrollTo(id: string): void {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
}
