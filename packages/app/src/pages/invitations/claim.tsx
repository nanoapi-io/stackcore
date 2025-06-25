import { Link, useSearchParams } from "react-router";
import { InvitationApiTypes } from "@stackcore/coreApiTypes";
import { useCoreApi } from "../../contexts/CoreApi.tsx";
import { toast } from "sonner";
import { useEffect, useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../../components/shadcn/Card.tsx";
import { Button } from "../../components/shadcn/Button.tsx";
import {
  AlertTriangle,
  CheckCircle,
  Clock,
  Loader,
  UserPlus,
  XCircle,
} from "lucide-react";

export default function InvitationClaimPage() {
  type ClaimState =
    | "loading"
    | "success"
    | "invalid"
    | "already_member"
    | "expired"
    | "error";

  const [searchParams] = useSearchParams();
  const coreApi = useCoreApi();

  const invitationUuid = searchParams.get("invitationUuid");
  const [claimState, setClaimState] = useState<ClaimState>("loading");

  async function claimInvitation(uuid: string) {
    try {
      setClaimState("loading");

      const { url, method, body } = InvitationApiTypes.prepareClaimInvitation(
        uuid,
      );

      const response = await coreApi.handleRequest(
        url,
        method,
        body,
      );

      if (response.ok && response.status === 200) {
        setClaimState("success");
        toast.success("Invitation claimed");
      } else {
        // Handle different error cases
        const errorData = await response.json().catch(() => ({}));

        if (response.status === 400) {
          if (errorData.error === "invitation_not_found") {
            setClaimState("invalid");
          } else if (errorData.error === "already_a_member_of_workspace") {
            setClaimState("already_member");
          } else if (errorData.error === "invitation_expired") {
            setClaimState("expired");
          } else {
            setClaimState("error");
          }
        } else {
          setClaimState("error");
        }
      }
    } catch (error) {
      console.error(error);
      setClaimState("error");
      toast.error("Unknown error occurred");
    }
  }

  useEffect(() => {
    console.log("invitationUuid", invitationUuid);
    if (invitationUuid) {
      claimInvitation(invitationUuid);
    } else {
      setClaimState("invalid");
    }
  }, [invitationUuid]);

  const renderContent = () => {
    switch (claimState) {
      case "loading":
        return (
          <Card>
            <CardHeader className="flex flex-col items-center gap-2">
              <CardTitle className="flex flex-col items-center gap-2 text-2xl">
                <Loader className="animate-spin" />
                Processing Invitation
              </CardTitle>
              <CardDescription>
                Please wait while we process your invitation...
              </CardDescription>
            </CardHeader>
          </Card>
        );

      case "success":
        return (
          <Card>
            <CardHeader className="flex flex-col items-center gap-2">
              <CardTitle className="flex flex-col items-center gap-2 text-2xl">
                <CheckCircle />
                Invitation Claimed!
              </CardTitle>
              <CardDescription>
                You've been added to the workspace.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex justify-center">
              <Link to="/">
                <Button>Go to Dashboard</Button>
              </Link>
            </CardContent>
          </Card>
        );

      case "invalid":
        return (
          <Card>
            <CardHeader className="flex flex-col items-center gap-2">
              <CardTitle className="flex flex-col items-center gap-2 text-2xl">
                <AlertTriangle />
                Invalid Invitation
              </CardTitle>
              <CardDescription>
                This invitation link is invalid.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex justify-center">
              <Link to="/">
                <Button>Go to Dashboard</Button>
              </Link>
            </CardContent>
          </Card>
        );

      case "expired":
        return (
          <Card>
            <CardHeader className="flex flex-col items-center gap-2">
              <CardTitle className="flex flex-col items-center gap-2 text-2xl">
                <Clock />
                Invitation Expired
              </CardTitle>
              <CardDescription>
                This invitation has expired. Please request a new invitation
                from the workspace administrator.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex justify-center">
              <Link to="/">
                <Button>Go to Dashboard</Button>
              </Link>
            </CardContent>
          </Card>
        );

      case "already_member":
        return (
          <Card>
            <CardHeader className="flex flex-col items-center gap-2">
              <CardTitle className="flex flex-col items-center gap-2 text-2xl">
                <AlertTriangle />
                Already a Member
              </CardTitle>
              <CardDescription>
                You are already a member of the workspace. You cannot claim this
                invitation.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex justify-center">
              <Link to="/">
                <Button>Go to Dashboard</Button>
              </Link>
            </CardContent>
          </Card>
        );

      case "error":
      default:
        return (
          <Card>
            <CardHeader className="flex flex-col items-center gap-2">
              <CardTitle className="flex flex-col items-center gap-2 text-2xl">
                <XCircle />
                Something Went Wrong
              </CardTitle>
              <CardDescription>
                An unexpected error occurred while processing your invitation.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-3 items-center">
              <Button
                onClick={() =>
                  invitationUuid && claimInvitation(invitationUuid)}
                disabled={!invitationUuid}
              >
                Try Again
              </Button>
              <Link to="/">
                <Button>Go to Dashboard</Button>
              </Link>
            </CardContent>
          </Card>
        );
    }
  };

  return (
    <div className="grow flex items-center justify-center">
      <div className="w-full max-w-md space-y-6">
        {/* Header Card */}
        <Card>
          <CardHeader className="flex flex-col items-center gap-2">
            <CardTitle className="flex flex-col items-center gap-2 text-2xl">
              <UserPlus />
              Workspace Invitation
            </CardTitle>
            <CardDescription>
              You've been invited to join a workspace
            </CardDescription>
          </CardHeader>
        </Card>

        {/* Status Card */}
        {renderContent()}
      </div>
    </div>
  );
}
