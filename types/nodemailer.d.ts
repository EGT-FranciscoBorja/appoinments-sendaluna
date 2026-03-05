declare module 'nodemailer' {
  export interface Transporter {
    sendMail(
      mailOptions: {
        from?: string;
        to: string | string[];
        subject?: string;
        text?: string;
        html?: string;
      },
      callback?: (err: Error | null, info: unknown) => void
    ): Promise<unknown>;
  }

  export interface TransportOptions {
    host?: string;
    port?: number;
    secure?: boolean;
    requireTLS?: boolean;
    auth?: { user: string; pass: string };
  }

  export function createTransport(options?: TransportOptions): Transporter;
}
