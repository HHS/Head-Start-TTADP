import httpContext from 'express-http-context'

interface ReferenceData {
  referenceData: {
    userId: number | string | undefined
    impersonationId: number | string | undefined
    transactionId: string | undefined
    sessionSig: string | undefined
  }
}

const referenceData = (): ReferenceData => {
  const userId = httpContext.get('loggedUser') ? httpContext.get('loggedUser') : ''
  const impersonationId = httpContext.get('impersonationUserId') ? httpContext.get('impersonationUserId') : ''
  const transactionId = httpContext.get('transactionId') ? httpContext.get('transactionId') : ''
  const sessionSig = httpContext.get('sessionSig') ? httpContext.get('sessionSig') : ''

  return {
    referenceData: {
      userId,
      impersonationId,
      transactionId,
      sessionSig,
    },
  }
}

export default referenceData
