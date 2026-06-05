const DEFAULT_STUN_URLS = ["stun:stun.l.google.com:19302"];

const splitUrls = (value?: string) =>
  value
    ?.split(",")
    .map((url) => url.trim())
    .filter(Boolean) ?? [];

export const getIceServers = (): RTCIceServer[] => {
  const stunUrls = splitUrls(import.meta.env.VITE_STUN_URLS);
  const turnUrls = splitUrls(import.meta.env.VITE_TURN_URLS);
  const turnUsername = import.meta.env.VITE_TURN_USERNAME;
  const turnCredential = import.meta.env.VITE_TURN_CREDENTIAL;

  const iceServers: RTCIceServer[] = [
    { urls: stunUrls.length > 0 ? stunUrls : DEFAULT_STUN_URLS },
  ];

  if (turnUrls.length > 0 && turnUsername && turnCredential) {
    iceServers.push({
      urls: turnUrls,
      username: turnUsername,
      credential: turnCredential,
    });
  }

  return iceServers;
};
