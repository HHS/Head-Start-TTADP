import httpContext from 'express-http-context';

interface ReferenceData {
  referenceData: {
    userId: number | undefined;
    impersonationId: number | undefined;
    transactionId: string | undefined;
    sessionSig: string | undefined;
  }
}

const referenceData = (): ReferenceData => {
  const userId = httpContext.get('loggedUser') as number | undefined;
  const impersonationId = httpContext.get('impersonationUserId') as number | undefined;
  const transactionId = httpContext.get('transactionId') as string | undefined;
  const sessionSig = httpContext.get('sessionSig') as string | undefined;

  return {
    referenceData: {
      userId,
      impersonationId,
      transactionId,
      sessionSig,
    },
  };
};

export default referenceData;
