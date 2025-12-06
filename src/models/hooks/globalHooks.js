import { setUrlOnFiles } from './file';

export default function attachGlobalHooks(sequelize) {
  sequelize.addHook('afterFind', async (result) => {
    if (Array.isArray(result)) {
      await Promise.all(result.map(setUrlOnFiles));
    } else {
      await setUrlOnFiles(result);
    }
  });
}
