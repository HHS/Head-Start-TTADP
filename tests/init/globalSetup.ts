// @ts-ignore
import { UserValidationStatus } from '../../src/models';

async function globalSetup() {
  if (!process.env.CI) {
    await UserValidationStatus.destroy({ where: {} });
  }
}

export default globalSetup;