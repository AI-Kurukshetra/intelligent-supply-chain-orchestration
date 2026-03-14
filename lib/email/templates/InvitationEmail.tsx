import { Body, Button, Container, Head, Heading, Html, Preview, Section, Text } from "@react-email/components";

type InvitationEmailProps = {
  organizationName: string;
  inviteLink: string;
  role: string;
};

export function InvitationEmail({ organizationName, inviteLink, role }: InvitationEmailProps) {
  return (
    <Html>
      <Head />
      <Preview>You have been invited to join {organizationName} on ISCOP.</Preview>
      <Body style={{ backgroundColor: "#f8fafc", fontFamily: "Arial, sans-serif", padding: "24px" }}>
        <Container style={{ backgroundColor: "#ffffff", borderRadius: "20px", padding: "32px", maxWidth: "600px" }}>
          <Text style={{ color: "#0ea5e9", letterSpacing: "0.25em", textTransform: "uppercase", fontSize: "12px" }}>
            ISCOP Invitation
          </Text>
          <Heading style={{ color: "#1e3a5f" }}>Join {organizationName}</Heading>
          <Section>
            <Text>You have been invited to ISCOP as a {role.replaceAll("_", " ")}.</Text>
            <Text>Use the secure link below to activate your account and set your password.</Text>
            <Button
              href={inviteLink}
              style={{
                backgroundColor: "#0ea5e9",
                color: "#ffffff",
                borderRadius: "12px",
                padding: "14px 20px",
                textDecoration: "none"
              }}
            >
              Accept invitation
            </Button>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}