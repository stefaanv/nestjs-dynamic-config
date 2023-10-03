# TODO

- Load functie afwerken (radash.merge gebruiken !) en er testen voor schrijven
- Toelaten dat alle loaded zonder config bestand gebruikt wordt
- Generic types maken voor de proxies
- inlezen van 1 of meerdere .env bestanden opnieuw manueel testen
- opladen van custom .env bestanden manueel testen
- LATER: infer optie van ".get()" implementeren of toch voorlopig in docs zetten dat niet geimplementeerd
- reload functie (op een of andere manier) testen
- LATER: Report changes in event
- publishing NPM packages according to <https://dev.to/nestjs/publishing-nestjs-packages-with-npm-21fm>

# TODO documentatie
- Auto-discovery van het root path
- Uitgebreide testapplicatie bouwen
- Betekenis van alle config opties definieren

# Alternatief voor eval
```js
console.log(require('../config.js').default())
```
Maar dan niet mogelijk om var substitutie te doen !