import { Component } from '@angular/core';
import { RouterModule } from '@angular/router';
import { NavbarComponent } from '../../app/shared/navbar/navbar.component';

@Component({
  selector: 'app-about',
  standalone: true,
  imports: [RouterModule, NavbarComponent],
  templateUrl: './about.component.html',
  styleUrls: ['./about.component.css'],
})
export class AboutComponent {}
