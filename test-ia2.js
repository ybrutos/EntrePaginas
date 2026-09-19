
async function test() {
  const editionsRes = await fetch("https://openlibrary.org/works/OL20470143W/editions.json");
  const editionsData = await editionsRes.json();
  const entries = editionsData.entries || [];
  const ed = entries.find(e => e.key === "/books/OL28199684M");
  console.log(ed);
}
test();

