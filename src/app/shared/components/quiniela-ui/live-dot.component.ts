import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-live-dot',
  standalone: true,
  template: '<span class="live-dot" [style.width.px]="size" [style.height.px]="size"></span>'
})
export class LiveDotComponent {
  @Input() size = 8;
}
