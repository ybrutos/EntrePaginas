
async function test() {
  const workRes = await fetch("https://openlibrary.org/works/OL20470143W.json");
  const work = await workRes.json();
  console.log(work);
}
test();

