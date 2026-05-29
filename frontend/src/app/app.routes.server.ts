import { RenderMode, ServerRoute } from '@angular/ssr';

export const serverRoutes: ServerRoute[] = [
  {
    // /offers używa filtrów z localStorage i historii nawigacji - musi być renderowany po stronie klienta
    path: 'offers',
    renderMode: RenderMode.Client
  },
  {
    path: '**',
    renderMode: RenderMode.Prerender
  }
];
