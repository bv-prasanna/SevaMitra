export const AppPlatform={ANDROID:'ANDROID',IOS:'IOS'} as const;
export type AppPlatform=typeof AppPlatform[keyof typeof AppPlatform];
