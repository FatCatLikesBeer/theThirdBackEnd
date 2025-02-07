interface APIResponse {
  success: boolean;
  path: string;
  message: string;
  data?: any;
}

interface Payload {
  user: string;
  exp: number;
  nbf: number;
  iat: number;
}
