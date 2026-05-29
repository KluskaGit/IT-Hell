// Komponent strony "O nas" (/about) - czysto prezentacyjna, statyczna strona informacyjna.
// Brak logiki, właściwości i metod - cała treść jest w about.component.html (statyczny HTML).
// Żadne API nie jest tutaj wywoływane, żaden serwis nie jest wstrzykiwany.
//
// Powiązane pliki:
//   about.component.html - treść strony (statyczny markup)
//   about.component.css  - style strony

import { Component } from '@angular/core';
import { RouterModule } from '@angular/router';
import { NavbarComponent } from '../../app/shared/navbar/navbar.component';
import { FooterComponent } from '../../app/shared/footer/footer.component';

// standalone: true - komponent nie należy do żadnego NgModule.
// RouterModule: importowany na wypadek użycia routerLink w szablonie (np. link do /home).
// NavbarComponent i FooterComponent: wspólne elementy layoutu każdej strony aplikacji
@Component({
  selector: 'app-about',
  standalone: true,
  imports: [RouterModule, NavbarComponent, FooterComponent],
  templateUrl: './about.component.html',
  styleUrls: ['./about.component.css'],
})
export class AboutComponent {}
