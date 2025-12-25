// Note: Polyfills are imported in app/_layout.tsx before this file is imported
// This ensures they're loaded before any AWS Amplify code runs

import { Amplify } from 'aws-amplify';
import awsExports from './aws-exports';

// Configure Amplify
Amplify.configure(awsExports);

export default Amplify;

