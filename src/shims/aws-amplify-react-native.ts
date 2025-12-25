/* eslint-disable @typescript-eslint/no-require-imports */
// Expo Go / JS-only shim for `@aws-amplify/react-native`
// This module exists because Amplify's React Native entrypoints import
// `@aws-amplify/react-native` from `*.native.ts` files, but Expo Go cannot use
// Amplify's optional native implementations (Passkeys/WebBrowser/ModPow).
//
// Metro alias in `metro.config.js` points `@aws-amplify/react-native` to this file.

import type { AsyncStorageStatic } from '@react-native-async-storage/async-storage';
import { AppState, Platform } from 'react-native';

type NetInfoLike = {
	addEventListener?: (handler: (state: { isInternetReachable?: boolean | null }) => void) => () => void;
};

export const loadAsyncStorage = (): AsyncStorageStatic => {
	// `@react-native-async-storage/async-storage` must be installed.
	// In Expo Go, it's available when installed as a dependency.
	const mod = require('@react-native-async-storage/async-storage')?.default as AsyncStorageStatic | undefined;
	if (!mod) {
		throw new Error(
			"Ensure `@react-native-async-storage/async-storage` is installed (and you're not using Expo Go without it).",
		);
	}
	return mod;
};

export const loadUrlPolyfill = () => {
	require('react-native-url-polyfill/auto');
};

export const loadGetRandomValues = () => {
	require('react-native-get-random-values');
};

export const loadBase64 = () => {
	const base64 = require('base-64') as { encode: (s: string) => string; decode: (s: string) => string };
	return base64;
};

export const loadBuffer = () => {
	const { Buffer } = require('buffer') as { Buffer: any };
	return Buffer;
};

export const loadAppState = () => AppState;

export const loadNetInfo = (): NetInfoLike => {
	// We intentionally do NOT depend on `@react-native-community/netinfo` in Expo Go.
	// If something in Amplify tries to use reachability, provide a safe stub.
	return {
		addEventListener: handler => {
			try {
				handler({ isInternetReachable: true });
			} catch {
				// ignore
			}
			return () => {};
		},
	};
};

// Optional native helpers (Passkeys / WebBrowser / Push notifications)
// Not available in Expo Go — if called, tell the developer to use a Dev Client.
const notSupported = (feature: string) => () => {
	throw new Error(
		`${feature} is not available in Expo Go. Build a custom Dev Client (expo prebuild + pods) to use this feature.`,
	);
};

export const loadAmplifyRtnPasskeys = notSupported('Amplify Passkeys');
export const loadAmplifyWebBrowser = notSupported('Amplify WebBrowser');
export const loadAmplifyPushNotification = notSupported('Amplify Push Notifications');

export const getOperatingSystem = () => Platform.OS;
export const getDeviceName = async () => 'unknown';
export const getIsNativeError = (error: unknown) => error instanceof Error;

// SRP acceleration (native big-int modPow). We avoid SRP in Expo Go by using USER_PASSWORD_AUTH.
export const computeModPow = notSupported('SRP (computeModPow)');
export const computeS = notSupported('SRP (computeS)');


