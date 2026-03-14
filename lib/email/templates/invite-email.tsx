import { Body, Container, Head, Heading, Html, Preview, Section, Text } from "@react-email/components";

type InviteEmailProps = {
  organizationName: string;
  inviteLink: string;
};

export function InviteEmail({ organizationName, inviteLink }: InviteEmailProps) {
  return (
    <Html>
      <Head />
      <Preview>You have been invited to join {organizationName} on ISCOP.</Preview>
      <Body style={{ backgroundColor: "#f8fafc", fontFamily: "Arial, sans-serif" }}>
        <Container style={{ margin: "40px auto", backgroundColor: "#ffffff", padding: "32px", borderRadius: "16px" }}>
          <Heading>Join {organizationName} on ISCOP</Heading>
          <Section>
            <Text>
              Your team is ready to collaborate on supply chain planning. Use the link below to accept your invitation.
            </Text>
            <Text>{inviteLink}</Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}