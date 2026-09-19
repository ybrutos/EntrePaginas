
fetch("https://entre-paginas-navy.vercel.app/api/books/ol_OL20470143W", {
  headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)" }
}).then(r => r.text()).then(console.log).catch(console.error);

