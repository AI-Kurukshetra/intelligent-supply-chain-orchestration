import { Body, Container, Head, Heading, Html, Link, Preview, Text } from "@react-email/components";

type SopStepAssignedEmailProps = {
  cycleName: string;
  stepName: string;
  dueDate: string;
  deepLink: string;
};

export function SopStepAssignedEmail({ cycleName, stepName, dueDate, deepLink }: SopStepAssignedEmailProps) {
  return (
    <Html>
      <Head />
      <Preview>S&OP step assigned: {stepName}</Preview>
      <Body style={{ backgroundColor: "#f8fafc", fontFamily: "Arial, sans-serif", padding: "24px" }}>
        <Container style={{ backgroundColor: "#ffffff", borderRadius: "20px", padding: "32px", maxWidth: "600px" }}>
          <Heading style={{ color: "#1e3a5f" }}>S&OP step assignment</Heading>
          <Text>{cycleName}</Text>
          <Text>You have been assigned to {stepName}. Due date: {dueDate}.</Text>
          <Link href={deepLink}>Open S&OP workspace</Link>
        </Container>
      </Body>
    </Html>
  );
}