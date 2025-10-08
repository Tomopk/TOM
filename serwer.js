const http = require('http');
const fs = require('fs');
const url = require('url');
const PORT = 3000;

let visitCount = 0;
let visitorsIPs = new Set();

const style = `
    <style>
        body { font-family: Arial, sans-serif; background: #f0f0f0; padding: 20px; }
        h1, h2 { color: #333; }
        p, li { font-size: 1.1em; }
    </style>
`;

function loadGuests(callback) {
    fs.readFile('guests.json', 'utf-8', (err, data) => {
        if (err || !data) return callback([]);
        try {
            const guests = JSON.parse(data);
            callback(guests);
        } catch {
            callback([]);
        }
    });
}

function saveGuests(guests, callback) {
    fs.writeFile('guests.json', JSON.stringify(guests, null, 2), callback);
}

const server = http.createServer((req, res) => {
    const parsedUrl = url.parse(req.url, true);
    const pathname = parsedUrl.pathname;
    const query = parsedUrl.query;

    res.setHeader('Content-Type', 'text/html; charset=utf-8');

    if (pathname === '/') {
        visitCount++;
        const ip = req.socket.remoteAddress;
        visitorsIPs.add(ip);
        res.end(`${style}<h1>Witaj na stronie!</h1><p>Odwiedziłeś ją już ${visitCount} razy.</p>`);
    }

    else if (pathname === '/add') {
        const name = query.name;
        if (!name) {
            res.end(`${style}<p>Brak parametru "name". Użyj /add?name=TwojeImie</p>`);
            return;
        }

        const entry = {
            name,
            timestamp: new Date().toISOString()
        };

        loadGuests(guests => {
            guests.push(entry);
            saveGuests(guests, err => {
                if (err) {
                    res.end(`${style}<p>Błąd zapisu do pliku.</p>`);
                } else {
                    res.end(`${style}<p>Dodano gościa: ${name}</p>`);
                }
            });
        });
    }

    else if (pathname === '/list') {
        loadGuests(guests => {
            if (guests.length === 0) {
                res.end(`${style}<p>Lista gości jest pusta.</p>`);
                return;
            }

            const listItems = guests.map(g => `<li>${g.name} (dodano: ${new Date(g.timestamp).toLocaleString()})</li>`).join('');
            res.end(`${style}<h2>Lista gości:</h2><ul>${listItems}</ul>`);
        });
    }

    else if (pathname === '/clear') {
        saveGuests([], err => {
            if (err) {
                res.end(`${style}<p>Błąd przy czyszczeniu listy.</p>`);
            } else {
                res.end(`${style}<p>Lista gości została wyczyszczona.</p>`);
            }
        });
    }

    else if (pathname === '/stats') {
        const ipList = [...visitorsIPs].map(ip => `<li>${ip}</li>`).join('');
        res.end(`${style}<h2>Statystyki</h2><p>Łączna liczba odwiedzin: ${visitCount}</p><h3>Adresy IP:</h3><ul>${ipList}</ul>`);
    }

    else if (pathname === '/delete') {
        const name = query.name;
        if (!name) {
            res.end(`${style}<p>Podaj imię do usunięcia, np. /delete?name=Jan</p>`);
            return;
        }

        loadGuests(guests => {
            const filtered = guests.filter(g => g.name !== name);
            saveGuests(filtered, err => {
                if (err) {
                    res.end(`${style}<p>Błąd podczas usuwania.</p>`);
                } else {
                    res.end(`${style}<p>Usunięto: ${name}</p>`);
                }
            });
        });
    }

    else if (pathname === '/form') {
        res.end(`${style}
            <h1>Dodaj gościa</h1>
            <form method="GET" action="/add">
                <input type="text" name="name" placeholder="Twoje imię" required />
                <button type="submit">Dodaj</button>
            </form>
        `);
    }

    else {
        res.statusCode = 404;
        res.end(`${style}<h1>404 - Strona nie istnieje</h1>`);
    }
});

server.listen(PORT, () => {
    console.log(`Serwer działa na http://localhost:${PORT}`);
});
