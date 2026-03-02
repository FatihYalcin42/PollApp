import { Component, Input } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-header',
  imports: [RouterLink],
  templateUrl: './header.html',
  styleUrl: './header.scss',
})
export class Header {
  @Input() logoSrc = '/assets/logo-orange.svg';
  @Input() logoAlt = 'Poll App logo';
  @Input() actionLabel = '';
  @Input() actionRoute: string[] = [];

  protected get showAction(): boolean {
    return this.actionLabel.length > 0 && this.actionRoute.length > 0;
  }
}
