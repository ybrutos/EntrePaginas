
async function test() {
  const workRes = await fetch("https://openlibrary.org/works/OL20470143W.json");
  const work = await workRes.json();
  console.log("Work:", !!work);
  const editionsRes = await fetch("https://openlibrary.org/works/OL20470143W/editions.json");
  const editionsData = await editionsRes.json();
  const entries = editionsData.entries || [];
  console.log("Editions:", entries.length);
  
  for (const edition of entries) {
    const iaList = edition.ocaid ? [edition.ocaid] : edition.identifiers?.ia || edition.ia || [];
    const isPublic = edition.ebook_access === "public" || edition.public_scan_b === true;
    console.log("Edition:", edition.key, "| isPublic:", isPublic, "| iaList:", iaList);
    if (isPublic && iaList.length > 0) {
      const iaId = iaList[0];
      console.log("Found public IA:", iaId);
      const iaRes = await fetch(`https://archive.org/metadata/${iaId}`);
      if (iaRes.ok) {
        const iaData = await iaRes.json();
        const files = iaData.files || [];
        console.log("IA files:", files.length);
      }
    }
  }
}
test();

