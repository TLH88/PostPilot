import {
  Body,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Preview,
  Section,
  Tailwind,
  Text,
} from "@react-email/components";

export interface TestSendEmailProps {
  recipientName?: string;
  sentAt?: string;
}

export function TestSendEmail({
  recipientName = "there",
  sentAt = new Date().toISOString(),
}: TestSendEmailProps) {
  return (
    <Html>
      <Head />
      <Preview>PostPilot email delivery test — if you see this, it works</Preview>
      <Tailwind>
        <Body className="bg-white font-sans">
          <Container className="mx-auto max-w-[560px] px-6 py-10">
            <Heading className="text-2xl font-semibold text-slate-900">
              PostPilot email — delivery test
            </Heading>
            <Text className="text-base text-slate-700">
              Hi {recipientName},
            </Text>
            <Text className="text-base text-slate-700">
              This is the first email sent through the PostPilot email pipeline.
              If it landed in your inbox (not spam), the Resend integration,
              DNS records, and domain verification are all working correctly.
            </Text>
            <Section className="my-6 rounded-md border border-slate-200 bg-slate-50 px-4 py-3">
              <Text className="m-0 text-sm text-slate-500">
                Sent at: {sentAt}
              </Text>
            </Section>
            <Hr className="my-6 border-slate-200" />
            <Text className="text-sm text-slate-500">
              You received this because you triggered a test send from the
              PostPilot admin panel. No action is required.
            </Text>
          </Container>
        </Body>
      </Tailwind>
    </Html>
  );
}

export default TestSendEmail;
