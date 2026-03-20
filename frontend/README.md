# This is the place for the frontend part

## 📋 Wymagania systemowe (Requirements)

Zanim spróbujesz uruchomić projekt, upewnij się, że Twoje środowisko spełnia poniższe standardy:

* **Node.js**: wersja **18.13.0** lub nowsza (rekomendowana **v20.x** LTS).
    * *Sprawdź wpisując:* `node -v`
* **npm**: wersja **9.x** lub nowsza (instalowana razem z Node.js).
    * *Sprawdź wpisując:* `npm -v`
* **Angular CLI**: wersja **17.x** lub wyższa.
    * *Sprawdź wpisując:* `ng v` (jeśli nie masz zainstalowanego globalnie, używaj `npx ng`)
* **System operacyjny**: Windows 10+, macOS lub Linux.
* **Przeglądarka**: Dowolna nowoczesna przeglądarka (Chrome, Firefox, Edge) z obsługą standardu **ES2022**.

---
## 🛠️ Instrukcja uruchomienia projektu (Angular)

Projekt znajduje się w strukturze monorepo. Aby uruchomić warstwę wizualną (frontend), wykonaj poniższe kroki w terminalu:

### 1. Przejdź do folderu frontend
Otwórz terminal w głównym katalogu (np. w vs code) `it-hell` i przejdź do podfolderu z aplikacją:
```bash
cd frontend
```
### 2. Zainstaluj biblioteki (tylko za pierwszym razem)
Pobierz folder `node_modules`, który jest niezbędny do działania projektu:
```bash
npm install
```
### 3.Uruchom serwer deweloperski
Wpisz poniższą komendę, aby skompilować i odpalić Angulara:
```bash
npm start
```
### 4.Wyświetl projekt w przeglądarce
Po poprawnym uruchomieniu aplikacja prawdopodobnie będzie dostępna pod adresem:


http://localhost:4200
