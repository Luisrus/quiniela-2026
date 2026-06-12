import { Component } from '@angular/core';

@Component({
  selector: 'app-skeleton-card',
  standalone: true,
  template: `
    <div class="card" style="padding: 16px">
      <div style="display: flex; justify-content: space-between; margin-bottom: 14px">
        <div class="skeleton" style="height: 11px; width: 35%"></div>
        <div class="skeleton" style="height: 11px; width: 18%"></div>
      </div>
      <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 14px">
        <div style="flex: 1; display: flex; flex-direction: column; align-items: center; gap: 6px">
          <div class="skeleton" style="width: 44px; height: 44px; border-radius: 50%"></div>
          <div class="skeleton" style="height: 10px; width: 70%"></div>
        </div>
        <div style="display: flex; gap: 8px; align-items: center">
          <div class="skeleton" style="width: 54px; height: 54px; border-radius: 10px"></div>
          <div class="skeleton" style="width: 14px; height: 28px; border-radius: 4px"></div>
          <div class="skeleton" style="width: 54px; height: 54px; border-radius: 10px"></div>
        </div>
        <div style="flex: 1; display: flex; flex-direction: column; align-items: center; gap: 6px">
          <div class="skeleton" style="width: 44px; height: 44px; border-radius: 50%"></div>
          <div class="skeleton" style="height: 10px; width: 70%"></div>
        </div>
      </div>
      <div class="skeleton" style="height: 10px; width: 55%; margin: 0 auto"></div>
    </div>
  `
})
export class SkeletonCardComponent {}
