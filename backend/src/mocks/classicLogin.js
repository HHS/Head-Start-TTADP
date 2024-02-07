const userInfoClassicLogin = {
  authorities: [
    {
      authority: 'ROLE_FEDERAL',
    },
  ],
  details: {
    remoteAddress: '127.1.1.210',
    sessionId: null,
    tokenValue: 'test-e4b2-test-b016-test',
    tokenType: 'Bearer',
    decodedDetails: null,
  },
  authenticated: true,
  userAuthentication: {
    authorities: [
      {
        authority: 'ROLE_FEDERAL',
      },
    ],
    details: {
      remoteAddress: '127.1.1.210',
      sessionId: '7E583D362871D9',
    },
    authenticated: true,
    principal: {
      password: null,
      username: 'testUser@adhocteam.us',
      authorities: [
        {
          authority: 'ROLE_FEDERAL',
        },
      ],
      accountNonExpired: true,
      accountNonLocked: true,
      credentialsNonExpired: true,
      enabled: true,
      userId: 1,
      grantAgencyId: null,
      remoteAddress: '127.1.1.210',
      authenticationStatus: 'Ok',
      passwordExpired: false,
    },
    credentials: null,
    name: 'testUser@adhocteam.us',
  },
  credentials: '',
  principal: {
    password: null,
    username: 'testUser@adhocteam.us',
    authorities: [
      {
        authority: 'ROLE_FEDERAL',
      },
    ],
    accountNonExpired: true,
    accountNonLocked: true,
    credentialsNonExpired: true,
    enabled: true,
    userId: 1,
    grantAgencyId: null,
    remoteAddress: '127.1.1.210',
    authenticationStatus: 'Ok',
    passwordExpired: false,
  },
  oauth2Request: {
    clientId: 'test-client-id',
    scope: [
      'user_info',
    ],
    requestParameters: {
      code: 'TestCode',
      grant_type: 'authorization_code',
      scope: 'user_info',
      response_type: 'code',
      redirect_uri: 'http://localhost:8080/oauth2-client/login/oauth2/code/',
      state: '',
      client_id: 'test-client-id',
    },
    resourceIds: [],
    authorities: [
      {
        authority: 'ROLE_TRUSTED_CLIENT',
      },
    ],
    approved: true,
    refresh: false,
    redirectUri: 'http://localhost:8080/oauth2-client/login/oauth2/code/',
    responseTypes: [
      'code',
    ],
    extensions: {},
    grantType: 'authorization_code',
    refreshTokenRequest: null,
  },
  clientOnly: false,
  name: 'testUser@adhocteam.us',
};

export default userInfoClassicLogin;
