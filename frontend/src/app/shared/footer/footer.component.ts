import { Component } from '@angular/core';
import { RouterModule } from '@angular/router'; // routerLink w szablonie (linki do /legal, /about)

@Component({
  selector: 'app-footer',
  standalone: true,
  imports: [RouterModule],
  templateUrl: './footer.component.html',
  styleUrls: ['./footer.component.css'],
})
export class FooterComponent {}
