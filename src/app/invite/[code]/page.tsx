import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import InviteAcceptClient from "./InviteAcceptClient";

interface Props {
  params: Promise<{ code: string }>;
}

export default async function InvitePage({ params }: Props) {
  const { code } = await params;
  const session = await auth();

  // Unauthenticated — send to sign-in with a callback back here
  if (!session?.user?.id) {
    redirect(`/signin?callbackUrl=/invite/${code}`);
  }

  // Look up the invite code
  const invite = await prisma.inviteCode.findUnique({
    where: { code: code.toUpperCase() },
    include: { workspace: true },
  });

  if (!invite) {
    return <InviteAcceptClient status="not_found" code={code} workspaceName={null} />;
  }
  if (invite.usedAt) {
    return <InviteAcceptClient status="used" code={code} workspaceName={invite.workspace.name} />;
  }
  if (invite.expiresAt < new Date()) {
    return <InviteAcceptClient status="expired" code={code} workspaceName={invite.workspace.name} />;
  }

  // Check if user is already in a family
  const existing = await prisma.familyMember.findFirst({
    where: { userId: session.user.id },
    include: { workspace: true },
  });
  if (existing) {
    return <InviteAcceptClient status="already_member" code={code} workspaceName={existing.workspace.name} />;
  }

  return (
    <InviteAcceptClient
      status="valid"
      code={code}
      workspaceName={invite.workspace.name}
    />
  );
}
