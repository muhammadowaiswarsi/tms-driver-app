const awsExports = {
  Auth: {
    Cognito: {
      userPoolId: process.env.EXPO_PUBLIC_USER_POOL_ID || "us-east-1_XBMkDykK0",
      userPoolClientId: process.env.EXPO_PUBLIC_CLIENT_ID || "1pd1i8tir48o3kfom6deivui7",
      region: process.env.EXPO_PUBLIC_REGION || "us-east-1",
      loginWith: {
        email: true,
      },
    },
  },
};

export default awsExports;
