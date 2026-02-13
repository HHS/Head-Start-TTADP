import { Op } from 'sequelize'
import { sequelize } from '../../models'

export function withGoalName(searchText: string[]) {
  const searchTerms = searchText.map((term) => `%${term.toLowerCase()}%`)

  return {
    where: {
      [Op.or]: searchTerms.map((term) =>
        sequelize.literal(`"Recipient"."id" IN (
          SELECT DISTINCT "Grants"."recipientId"  
          FROM "Grants"  
          INNER JOIN "Goals" ON "Goals"."grantId" = "Grants"."id"  
          GROUP BY "Grants"."id"  
          HAVING LOWER(STRING_AGG("Goals".name, CHR(10))) LIKE ${sequelize.escape(term)}
        )`)
      ),
    },
  }
}

export function withoutGoalName(searchText: string[]) {
  const searchTerms = searchText.map((term) => `%${term.toLowerCase()}%`)

  return {
    where: {
      [Op.and]: searchTerms.map((term) =>
        sequelize.literal(`"Recipient"."id" NOT IN (
          SELECT DISTINCT "Grants"."recipientId"  
          FROM "Grants"  
          INNER JOIN "Goals" ON "Goals"."grantId" = "Grants"."id"  
          GROUP BY "Grants"."id"  
          HAVING LOWER(STRING_AGG("Goals".name, CHR(10))) LIKE ${sequelize.escape(term)}
        )`)
      ),
    },
  }
}
