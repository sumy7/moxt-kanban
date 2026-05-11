export type MemberProfile = {
  displayName?: string;
  email?: string;
};

export type MoxtBridge = {
  currentMember?: MemberProfile;
};

export type WindowWithMoxt = Window & {
  moxt?: MoxtBridge;
};
