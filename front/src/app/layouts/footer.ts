import { Component } from '@angular/core';

@Component({
  selector: 'app-footer',
  template: `
    <footer class="footer">
      <div class="row align-items-center justify-content-xl-between">
        <div class="col-xl-6">
          <div class="copyright text-center text-xl-left text-muted">
            &copy; {{ year }} <span class="font-weight-bold ml-1">ITCare</span> - SmartSoft Solutions pour TechSolutions
          </div>
        </div>
        <div class="col-xl-6">
          <ul class="nav nav-footer justify-content-center justify-content-xl-end">
            <li class="nav-item">
              <a class="nav-link" href="https://www.creative-tim.com/product/argon-dashboard-angular" target="_blank"
                 rel="noopener">Template Argon Dashboard (Creative Tim, MIT)</a>
            </li>
          </ul>
        </div>
      </div>
    </footer>
  `,
})
export class Footer {
  protected readonly year = new Date().getFullYear();
}
