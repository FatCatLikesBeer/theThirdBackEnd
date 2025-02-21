import { env } from "hono/adapter";
import * as nodemailer from 'nodemailer';

import type { Context } from "hono";

export default async function mailer({
  recipiant,
  c,
  generatedTotp,
  time,
}: {
  recipiant: string
  c: Context;
  generatedTotp: string;
  time: number | string;
}) {
  const {
    NODE_MAILER_USER,
    NODE_MAILER_PASSWORD,
  } = env<{
    NODE_MAILER_USER: string;
    NODE_MAILER_PASSWORD: string;
    TOTP_SECRET: string;
  }>(c);

  const transporter = nodemailer.createTransport({
    service: "iCloud",
    secure: false,
    auth: {
      user: NODE_MAILER_USER,
      pass: NODE_MAILER_PASSWORD,
    }
  });

  const info = await transporter.sendMail({
    from: "\"💻 Admin: billlaaayyy.dev\"<admin@billlaaayyy.dev>",
    to: recipiant,
    subject: "Message from billlaaayyy.dev",
    html: `
<p>Automated message</p>
<p>Here is the requested information:</p>
<br />
<h2>Login Token: ${generatedTotp}</h2>
<br />
<p>This token is valid for ${time} minutes.</p>
   `
  });

  return info;
}
