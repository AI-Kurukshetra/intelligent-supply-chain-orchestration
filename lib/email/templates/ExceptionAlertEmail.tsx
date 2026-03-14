import { Body, Container, Head, Heading, Html, Link, Preview, Section, Text } from "@react-email/components";

type ExceptionAlertEmailProps = {
  title: string;
  severity: string;
  deepLink: string;
  description: string;
};

export function ExceptionAlertEmail({ title, severity, deepLink, description }: ExceptionAlertEmailProps) {
  return (
    <Html>
      <Head />
      <Preview>Exception alert: {title}</Preview>
      <Body style={{ backgroundColor: "#f8fafc", fontFamily: "Arial, sans-serif", padding: "24px" }}>
        <Container style={{ backgroundColor: "#ffffff", borderRadius: "20px", padding: "32px", maxWidth: "600px" }}>
          <Heading style={{ color: "#1e3a5f" }}>{title}</Heading>
          <Text style={{ color: "#ef4444", fontWeight: 700 }}>Severity: {severity}</Text>
          <Section>
            <Text>{description}</Text>
            <Link href={deepLink}>Open exception in ISCOP</Link>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}