import { PrismaClient } from '@prisma/client'
import fs from 'fs'
import { Parser } from 'json2csv'

const prisma = new PrismaClient()

async function exportTable(name: string, data: any[]) {
  const parser = new Parser()
  const csv = parser.parse(
    data.map(row => ({
      ...row,
      piiCategoriesDetected: row.piiCategoriesDetected
        ? JSON.stringify(row.piiCategoriesDetected)
        : null,
      data: row.data ? JSON.stringify(row.data) : null
    }))
  )
  fs.writeFileSync(`${name}.csv`, csv)
}

async function main() {
  await exportTable('interactions', await prisma.interaction.findMany())
  await exportTable('sessions', await prisma.experimentSession.findMany())
  await exportTable('surveyResponses', await prisma.surveyResponse.findMany())
  await exportTable('personas', await prisma.persona.findMany())
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())