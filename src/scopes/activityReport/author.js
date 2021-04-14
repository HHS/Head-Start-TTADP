import filterArray from './utils';

const author = '(SELECT STRING_AGG("Users".name, \',\') FROM "Users" where "ActivityReport"."userId" = "Users"."id" GROUP BY "ActivityReport"."id")';

export function withAuthor(names, sequelize) {
  return filterArray(author, names, false, sequelize);
}

export function withoutAuthor(names, sequelize) {
  return filterArray(author, names, true, sequelize);
}
