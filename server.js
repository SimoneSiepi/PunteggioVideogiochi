const express = require('express')
const app = express()
const fs = require("fs").promises;
const bodyParser = require("body-parser");
const path = require("path");
const { isSet } = require('util/types');
const port = 3000

const rottaPublic = path.join(__dirname, "public");
const rottaDati = path.join(__dirname, "public", "asset", "dati.json");


app.set("view engine", "pug");
app.set("views", "./views");

async function read() {
    try {
        const datiJson = await fs.readFile(path.join(rottaDati), "utf-8");
        return JSON.parse(datiJson);
    } catch (error) {
      if (error.code === "ENOENT") {
        console.error("Il file non esiste. Creando un nuovo file vuoto.");
        await fs.writeFile(path.join(rottaDati), JSON.stringify([], null, 2), "utf-8");
        return [];
      } else {
        console.error("Errore durante la lettura del file:", error);
        // Non sovrascrivere il file in caso di altri errori
        return [];
      }
    }
  }

async function write(datiJson) {
    try {
       await fs.writeFile(path.join(rottaDati), JSON.stringify(datiJson, null, 2), 'utf-8');
    } catch (error) {
        console.error("Errore durante la scrittura del file:", error);
    }
}

  
function save(dati) {
    write(dati);
}


//midleware
app.use(bodyParser.urlencoded({extended: true}))
app.use(express.static(rottaPublic))

app.use(async (req,res,next)=>{
    try {
        const dati = await read();
        req.dati = dati;
        next();
    } catch (error) {
        console.error("Errore durante la lettura dei dati:", error);
        next(error); // Passa l'errore al gestore degli errori di Express
    }
})

app.get('/', (req, res) => {
    const giochi= req.dati;
    res.render("index", {giochi});
})

//...

app.get('/games/:id', (req, res) => {
    req.invioVerificato=false;
    const giochi = req.dati;
    const index = parseInt(req.params.id);
    const gioco = giochi[index];
   /*  const giocatori = gioco.giocatori || []; // Assicurati che la proprietà "giocatori" esista
    if (req.invioVerificato) {
        res.render("formGioco", { gioco, index, giocatori });
    } */
    res.render("formGioco", { gioco, index });
});

app.post('/inserisciPunteggio/:id', async (req, res) => {
    const { nome, cognome, score } = req.body;
    const giochi = req.dati;
    const gameIndex = parseInt(req.params.id);

    if (gameIndex >= 0 && gameIndex < giochi.length) {
        const gioco = giochi[gameIndex];
        const giocatori = gioco.giocatori
        //console.log(giocatori)
        gioco.absoluteHighestScore = Math.max(gioco.absoluteHighestScore, score);

        // Trova l'indice del giocatore, se esiste
        const giocatoreIndex = giocatori.findIndex(a => a.nome === nome && a.cognome === cognome);

        if (giocatoreIndex !== -1) {
            // Aggiorna il punteggio massimo del giocatore se esiste
            giocatori[giocatoreIndex].HighestScore = Math.max(gioco.giocatori[giocatoreIndex].HighestScore, score);
        } else {
            // Aggiungi un nuovo giocatore se non esiste
            giocatori.push({
                nome: nome,
                cognome: cognome,
                HighestScore: score
            });
        }

        // Trova il punteggio dell'utente
        const bestPlayerScore = giocatori.find(a => a.nome === nome && a.cognome === cognome)?.HighestScore || 0;

        // Ordina la lista dei giocatori per punteggio più alto
        giocatori.sort((a, b) => b.HighestScore - a.HighestScore);

        // Trova il giocatore con il punteggio assoluto più alto
        const absolutePlayer = giocatori.find(a => a.HighestScore == gioco.absoluteHighestScore);
        //console.log(gioco.giocatori.find(a => a.HighestScore === gioco.absoluteHighestScore))

        // Salvataggio dei dati aggiornati
        save(giochi);

        // Reindirizza alla stessa pagina con i dati aggiornati
        res.render("formGioco", { gioco, index: gameIndex, giocatori: gioco.giocatori, absolutePlayer, bestPlayerScore });
    } else {
        res.status(400).send('Indice del gioco non valido');
    }
});



//avvio del server
app.listen(port, () => console.log(`Server avviato su http://localhost:${port}`))
