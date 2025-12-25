// AWS Amplify Configuration
// OAuth removed because:
// - Localhost redirect doesn't work on mobile
// - If Google/Facebook is needed, a separate setup is required

const awsExports = {
  Auth: {
    Cognito: {
      userPoolId: "eu-north-1_Aa6eXl1gc",
      userPoolClientId: "73kr3ljivik7uut2a72sofb00p",
      region: "eu-north-1",
      loginWith: {
        email: true,
      },
    },
  },
};

export default awsExports;
