/**
 * function createPayload
 * @argument {string} uuid - The uuid of the user
 * @returns {Payload}
 */
export const createPayload = (uuid: string): Payload => {
  const now = Date.now();
  const payload = {
    user: uuid,
    exp: Math.floor(now / 1000) + (60 * 60 * 24 * 5),  // 5 days ago
    nbf: Math.floor(now / 1000) - 300,
    iat: Math.floor(now / 1000)
  }
  return payload;
}
