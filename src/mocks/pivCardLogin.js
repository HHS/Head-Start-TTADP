const userInfoPivCardLogin = {
  authorities: [
    {
      authority: 'ROLE_FEDERAL',
    },
  ],
  details: {
    remoteAddress: '127.1.1.0',
    sessionId: null,
    tokenValue: 'test-f8d5-test-b4b6-test',
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
      remoteAddress: '127.1.1.0',
      sessionId: 'A60A95A0D9A0',
    },
    authenticated: true,
    principal: {
      authorities: [
        {
          authority: 'ROLE_FEDERAL',
        },
      ],
      attributes: {
        name: 'testUser@adhocteam.us',
        user: {
          password: 'pswd',
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
          remoteAddress: '127.1.1.0',
          authenticationStatus: 'Ok',
          passwordExpired: false,
        },
      },
      name: 'testUser@adhocteam.us',
    },
    authorizedClientRegistrationId: 'piv',
    credentials: '',
    name: 'testUser@adhocteam.us',
  },
  credentials: '',
  principal: {
    authorities: [
      {
        authority: 'ROLE_FEDERAL',
      },
    ],
    attributes: {
      name: 'testUser@adhocteam.us',
      user: {
        password: 'pswd',
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
        remoteAddress: '127.1.1.0',
        authenticationStatus: 'Ok',
        passwordExpired: false,
      },
    },
    name: 'testUser@adhocteam.us',
  },
  oauth2Request: {
    clientId: 'test-client-id',
    scope: [
      'user_info',
    ],
    requestParameters: {
      code: 'code',
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
    refreshTokenRequest: null,
    grantType: 'authorization_code',
  },
  clientOnly: false,
  name: 'testUser@adhocteam.us',
};

export default userInfoPivCardLogin;
