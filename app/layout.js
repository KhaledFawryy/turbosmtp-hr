import "./globals.css";

export const metadata = {
  title: "turboSMTP HR · First Line Support",
  description: "Internal HR system for turboSMTP support team",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
