# Ritaglia immagini

Webapp gratuita per ritagliare immagini direttamente dal browser, senza caricarle su un server.

**Apri la webapp:** https://pepcoiro.github.io/ritaglia-immagini/

## Funzionalità

- Caricamento di immagini tramite selezione del file o trascinamento.
- Area di ritaglio interattiva, spostabile e ridimensionabile dagli angoli.
- Proporzioni predefinite: 1:1, 4:3, 3:2, 16:9, 3:4, 2:3 e 9:16.
- Possibilità di impostare proporzioni personalizzate.
- Esportazione dell'immagine ritagliata in JPEG, PNG o WebP, quando supportato dal formato originale.
- Elaborazione locale nel browser: le immagini non vengono caricate online.

## Utilizzo

1. Apri https://pepcoiro.github.io/ritaglia-immagini/.
2. Seleziona un'immagine o trascinala nell'area di caricamento.
3. Scegli una proporzione predefinita, personalizzata oppure libera.
4. Sposta l'area di ritaglio e regola le dimensioni trascinando gli angoli.
5. Premi **Ritaglia e scarica** per salvare il risultato.

All'apertura, l'area di ritaglio copre l'intera immagine. Se scegli una proporzione vincolata, l'area si adatta mantenendo il centro.

## Tecnologie

- HTML
- CSS
- JavaScript
- Canvas API del browser

## Struttura del progetto

- `index.html` — struttura della pagina e controlli.
- `style.css` — stile grafico e layout responsive.
- `script.js` — caricamento, selezione dell'area di ritaglio ed esportazione.

## Privacy

L'elaborazione avviene nel browser dell'utente. Le immagini selezionate non vengono inviate a un server.

## Licenza

Non è specificata una licenza per questo repository.
