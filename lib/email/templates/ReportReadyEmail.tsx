import { Body, Container, Head, Heading, Html, Link, Preview, Text } from "@react-email/components";

type ReportReadyEmailProps = {
  reportName: string;
  downloadLink: string;
};

export function ReportReadyEmail({ reportName, downloadLink }: ReportReadyEmailProps) {
  return (
    <Html>
      <Head />
      <Preview>Your report is ready to download.</Preview>
      <Body style={{ backgroundColor: "#f8fafc", fontFamily: "Arial, sans-serif", padding: "24px" }}>
        <Container style={{ backgroundColor: "#ffffff", borderRadius: "20px", padding: "32px", maxWidth: "600px" }}>
          <Heading style={{ color: "#1e3a5f" }}>Report ready</Heading>
          <Text>{reportName} is ready for download.</Text>
          <Link href={downloadLink}>Download report</Link>
        </Container>
      </Body>
    </Html>
  );
}