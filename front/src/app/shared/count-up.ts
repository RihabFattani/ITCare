import { Directive, ElementRef, effect, inject, input } from '@angular/core';

/** Anime un nombre de 0 jusqu'à la valeur donnée (ex. <span [appCountUp]="12"></span>). */
@Directive({ selector: '[appCountUp]' })
export class CountUp {
  readonly appCountUp = input.required<number>();
  private readonly el = inject<ElementRef<HTMLElement>>(ElementRef);

  constructor() {
    effect(() => {
      const target = this.appCountUp();
      const node = this.el.nativeElement;
      const duration = 1100;
      const start = performance.now();
      const step = (now: number) => {
        const t = Math.min((now - start) / duration, 1);
        const eased = 1 - Math.pow(1 - t, 3);
        node.textContent = String(Math.round(target * eased));
        if (t < 1) {
          requestAnimationFrame(step);
        }
      };
      requestAnimationFrame(step);
    });
  }
}
