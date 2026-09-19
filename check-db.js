
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
async function main() {
  const book = await prisma.book.findFirst({
    where: { id: "ol_OL20470143W" }
  });
  console.log(book);
}
main().finally(() => prisma.$disconnect());

