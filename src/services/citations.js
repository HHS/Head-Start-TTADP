/* eslint-disable import/prefer-default-export */
import { sequelize } from '../models';

/*
  The purpose of this function is to get citations by grant id.
  We then need to format the response for how it needs to be displayed on the FE.
*/
export async function getCitationsByGrantIds(grantIds) {
  /* Utilize Garrett's suggestion here for getting citations for all grants in the grantIds array */
  const citationsFromDB = await sequelize.query(
    `
    `,
  );
  return ['bad'];
}
