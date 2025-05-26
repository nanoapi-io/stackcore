import { useNavigate, useParams } from "react-router";
import LoggedInLayout from "../../../layout/loggedIn.tsx";
import { useEffect, useState } from "react";
import {
  type Organization,
  useOrganization,
} from "../../../contexts/Organization.tsx";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../../../components/shadcn/Card.tsx";
import { Separator } from "../../../components/shadcn/Separator.tsx";
import { Button } from "../../../components/shadcn/Button.tsx";
import {
  BillingApiTypes,
  OrganizationApiTypes,
} from "@stackcore/core/responses";
import { Skeleton } from "../../../components/shadcn/Skeleton.tsx";
import {
  ToggleGroup,
  ToggleGroupItem,
} from "../../../components/shadcn/ToggleGroup.tsx";
import { Badge } from "../../../components/shadcn/Badge.tsx";
import { Check, CreditCard, Loader2 } from "lucide-react";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "../../../components/shadcn/Dialog.tsx";
import { toast } from "../../../components/shadcn/hooks/use-toast.tsx";
import { useCoreApi } from "../../../contexts/CoreApi.tsx";

const PLANS = [
  {
    product: OrganizationApiTypes
      .BASIC_PRODUCT as OrganizationApiTypes.StripeProduct,
    title: "Basic",
    description: "Perfect for trying out the platform",
    subscriptionPrice: {
      [OrganizationApiTypes.MONTHLY_BILLING_CYCLE]: 0,
      [OrganizationApiTypes.YEARLY_BILLING_CYCLE]: 0,
    },
    features: [
      "50 credits included",
      "0.50 USD per additional credit",
    ],
  },
  {
    product: OrganizationApiTypes
      .PRO_PRODUCT as OrganizationApiTypes.StripeProduct,
    title: "Pro",
    description: "Great for small teams and growing businesses",
    subscriptionPrice: {
      [OrganizationApiTypes.MONTHLY_BILLING_CYCLE]: 10,
      [OrganizationApiTypes.YEARLY_BILLING_CYCLE]: 100,
    },
    features: [
      "500 credits included",
      "0.25 USD per additional credit",
    ],
  },
  {
    product: OrganizationApiTypes
      .PREMIUM_PRODUCT as OrganizationApiTypes.StripeProduct,
    title: "Premium",
    description: "Perfect for medium teams with high volume needs",
    subscriptionPrice: {
      [OrganizationApiTypes.MONTHLY_BILLING_CYCLE]: 50,
      [OrganizationApiTypes.YEARLY_BILLING_CYCLE]: 500,
    },
    features: [
      "1,000 credits included",
      "0.10 USD per additional credit",
      "Support through discord and email (under 24h)",
    ],
  },
];

export default function ChangePlanPage() {
  const coreApi = useCoreApi();

  const [billingCycle, setBillingCycle] = useState<
    OrganizationApiTypes.StripeBillingCycle
  >(
    OrganizationApiTypes.YEARLY_BILLING_CYCLE,
  );

  const [isBusy, setIsBusy] = useState(false);
  const { organizationId } = useParams<{ organizationId: string }>();
  const { organizations } = useOrganization();
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [subscription, setSubscription] = useState<
    BillingApiTypes.SubscriptionDetails | null
  >(null);

  useEffect(() => {
    if (!organizationId) {
      return;
    }

    const organization = organizations.find(
      (o) => o.id === parseInt(organizationId),
    );

    if (!organization) {
      return;
    }

    setOrganization(organization);
    getSubscription(organization.id);
  }, [organizations, organizationId]);

  async function getSubscription(organizationId: number) {
    setIsBusy(true);

    try {
      const { url, method } = BillingApiTypes.prepareGetSubscription(
        organizationId,
      );

      const response = await coreApi.handleRequest(url, method);

      if (!response.ok || response.status !== 200) {
        throw new Error("Failed to get subscription");
      }

      const data = await response.json() as BillingApiTypes.SubscriptionDetails;

      setSubscription(data);
    } catch (error) {
      console.error(error);
      toast({
        title: "Error",
        description: "Failed to get subscription",
        variant: "destructive",
      });
    } finally {
      setIsBusy(false);
    }
  }

  return (
    <LoggedInLayout>
      <div className="w-full max-w-7xl mx-auto my-5 space-y-8">
        <Card>
          <CardHeader>
            <CardTitle>
              {organization
                ? (
                  <div className="flex items-center space-x-2">
                    <span>
                      Change Plan for organization: {organization.name}
                    </span>
                    {organization.isTeam && (
                      <Badge variant="outline">Team</Badge>
                    )}
                  </div>
                )
                : <Skeleton className="h-6 w-full" />}
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col space-y-4">
            <div className="flex items-center space-x-2">
              <span className="text-sm text-muted-foreground">
                Current Plan:
              </span>
              {subscription
                ? (
                  <Badge variant="outline">
                    {subscription.product} ({subscription.billingCycle})
                  </Badge>
                )
                : <Skeleton className="w-full" />}
            </div>

            <Separator />

            {!isBusy && organization && subscription
              ? (
                <div>
                  {subscription.product ===
                      OrganizationApiTypes.CUSTOM_PRODUCT
                    ? <CustomPricingCard />
                    : (
                      <>
                        <ToggleGroup
                          type="single"
                          value={billingCycle}
                          onValueChange={(value) =>
                            setBillingCycle(
                              value as OrganizationApiTypes.StripeBillingCycle,
                            )}
                        >
                          <ToggleGroupItem
                            value={OrganizationApiTypes.MONTHLY_BILLING_CYCLE}
                          >
                            Monthly
                          </ToggleGroupItem>
                          <ToggleGroupItem
                            value={OrganizationApiTypes.YEARLY_BILLING_CYCLE}
                          >
                            Yearly (save 20%)
                          </ToggleGroupItem>
                        </ToggleGroup>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          {PLANS.map((plan) => (
                            <StandardPricingCard
                              key={plan.product}
                              organizationId={organization.id}
                              plan={plan}
                              selectedBillingCycle={billingCycle}
                              currentProduct={subscription.product}
                              currentBillingCycle={subscription.billingCycle}
                            />
                          ))}
                        </div>
                      </>
                    )}
                </div>
              )
              : (
                <div className="space-y-5">
                  <Separator className="h-8" />
                  <Separator className="h-8" />
                  <Separator className="h-8" />
                  <Separator className="h-8" />
                  <Separator className="h-8" />
                </div>
              )}
          </CardContent>
        </Card>
      </div>
    </LoggedInLayout>
  );
}
function CustomPricingCard() {
  return (
    <Card>
      <CardHeader className="text-center">
        <CardTitle>Custom</CardTitle>
        <CardDescription>
          You are on a custom plan. Please contact us to change your plan.
        </CardDescription>
      </CardHeader>

      <CardContent className="text-center">
        <a
          href="mailto:support@nanoapi.io"
          className="font-bold hover:underline"
        >
          support@nanoapi.io
        </a>
      </CardContent>
    </Card>
  );
}

function StandardPricingCard(props: {
  organizationId: number;
  plan: typeof PLANS[number];
  selectedBillingCycle: OrganizationApiTypes.StripeBillingCycle;
  currentProduct: OrganizationApiTypes.StripeProduct | null;
  currentBillingCycle: OrganizationApiTypes.StripeBillingCycle | null;
}) {
  function getYearlySavingsPerMonth() {
    const monthlyPrice =
      props.plan.subscriptionPrice[OrganizationApiTypes.MONTHLY_BILLING_CYCLE];
    const yearlyPricePerMonth =
      props.plan.subscriptionPrice[OrganizationApiTypes.YEARLY_BILLING_CYCLE] /
      12;
    const savings = monthlyPrice - yearlyPricePerMonth;
    return savings.toFixed(2);
  }

  function determineChangeType(
    currentProduct: OrganizationApiTypes.StripeProduct | null,
    currentBillingCycle: OrganizationApiTypes.StripeBillingCycle | null,
    newProduct: OrganizationApiTypes.StripeProduct,
    newBillingCycle: OrganizationApiTypes.StripeBillingCycle,
  ): "upgrade" | "downgrade" | "same" {
    if (!currentProduct) return "upgrade";

    // Check if changing to a higher tier product
    const isUpgradingProduct =
      (currentProduct === OrganizationApiTypes.BASIC_PRODUCT &&
        [OrganizationApiTypes.PRO_PRODUCT, OrganizationApiTypes.PREMIUM_PRODUCT]
          .includes(newProduct)) ||
      (currentProduct === OrganizationApiTypes.PRO_PRODUCT &&
        newProduct === OrganizationApiTypes.PREMIUM_PRODUCT);

    // If products are different, determine if upgrade or downgrade
    if (currentProduct !== newProduct) {
      return isUpgradingProduct ? "upgrade" : "downgrade";
    }

    // If only billing cycle changed, yearly is an upgrade from monthly
    if (currentBillingCycle !== newBillingCycle) {
      if (!currentBillingCycle) return "upgrade";

      const isUpgradingBilling =
        currentBillingCycle === OrganizationApiTypes.MONTHLY_BILLING_CYCLE &&
        newBillingCycle === OrganizationApiTypes.YEARLY_BILLING_CYCLE;

      return isUpgradingBilling ? "upgrade" : "downgrade";
    }

    return "same";
  }

  const changeType = determineChangeType(
    props.currentProduct,
    props.currentBillingCycle,
    props.plan.product,
    props.selectedBillingCycle,
  );

  return (
    <Card className="flex flex-col">
      <CardHeader className="text-center">
        <CardTitle>{props.plan.title}</CardTitle>
        <CardDescription>
          {props.plan.description}
        </CardDescription>
      </CardHeader>

      <CardContent className="grow flex flex-col justify-between space-y-4">
        <div className="text-center text-3xl font-bold">
          {props.plan.subscriptionPrice[props.selectedBillingCycle]} USD
          <span className="text-lg font-normal text-muted-foreground">
            /{{
              [OrganizationApiTypes.YEARLY_BILLING_CYCLE]: "year",
              [OrganizationApiTypes.MONTHLY_BILLING_CYCLE]: "month",
            }[props.selectedBillingCycle]}
          </span>
        </div>

        <div className="text-sm text-muted-foreground text-center">
          Save {getYearlySavingsPerMonth()} USD/month when billed yearly
        </div>

        <ul className="space-y-3">
          {props.plan.features.map((feature) => (
            <li key={feature} className="flex items-center space-x-2">
              <Check className="text-green-500 w-5 h-5" />
              <span className="text-sm">{feature}</span>
            </li>
          ))}
        </ul>

        {changeType === "same"
          ? <Button className="w-full" disabled>Current Plan</Button>
          : (
            <ChangePlanDialog
              organizationId={props.organizationId}
              changeType={changeType}
              newProduct={props.plan.product}
              newBillingCycle={props.selectedBillingCycle}
            />
          )}
      </CardContent>
    </Card>
  );
}

function ChangePlanDialog(props: {
  organizationId: number;
  changeType: "upgrade" | "downgrade";
  newProduct: OrganizationApiTypes.StripeProduct;
  newBillingCycle: OrganizationApiTypes.StripeBillingCycle;
}) {
  const coreApi = useCoreApi();
  const navigate = useNavigate();

  const [busy, setBusy] = useState(false);

  async function handleManagePaymentMethodClick() {
    setBusy(true);

    try {
      const { url, method, body } = BillingApiTypes.prepareCreatePortalSession({
        organizationId: props.organizationId,
        returnUrl: globalThis.location.href,
      });

      const response = await coreApi.handleRequest(url, method, body);

      if (!response.ok) {
        throw new Error("Failed to create portal session");
      }

      const data = await response
        .json() as BillingApiTypes.CreatePortalSessionResponse;

      globalThis.location.href = data.url;
    } catch (error) {
      console.error(error);
      toast({
        title: "Error",
        description: "Failed to create portal session",
      });
    } finally {
      setBusy(false);
    }
  }

  async function handleSubmit() {
    setBusy(true);

    try {
      if (props.newProduct === OrganizationApiTypes.CUSTOM_PRODUCT) {
        throw new Error("Custom product is not supported");
      }

      if (props.changeType === "upgrade") {
        const { url, method, body } = BillingApiTypes
          .prepareUpgradeSubscription({
            organizationId: props.organizationId,
            product: props.newProduct,
            billingCycle: props.newBillingCycle,
          });

        const response = await coreApi.handleRequest(url, method, body);

        if (!response.ok) {
          throw new Error("Failed to upgrade plan");
        }

        toast({
          title: "Success",
          description: "Plan upgraded successfully",
        });
      } else {
        const { url, method, body } = BillingApiTypes
          .prepareDowngradeSubscription({
            organizationId: props.organizationId,
            product: props.newProduct,
            billingCycle: props.newBillingCycle,
          });

        const response = await coreApi.handleRequest(url, method, body);

        if (!response.ok) {
          throw new Error("Failed to downgrade plan");
        }

        toast({
          title: "Success",
          description: "Plan downgraded successfully",
        });
      }
      navigate(`/organizations/${props.organizationId}`);
    } catch (error) {
      console.error(error);
      toast({
        title: "Error",
        description: (
          <div className="space-y-2">
            <div>
              Failed to update plan. Make sure you have a payment method added
              to your account and try again.
            </div>
            <Button
              onClick={handleManagePaymentMethodClick}
              disabled={busy}
            >
              <CreditCard />
              Manage payment method
            </Button>
          </div>
        ),
        variant: "destructive",
      });
    } finally {
      setBusy(false);
    }
  }

  function Description() {
    if (props.changeType === "upgrade") {
      return (
        <div className="space-y-4 text-muted-foreground">
          <div>
            Your plan will be upgraded immediately to{" "}
            <span className="font-bold">{props.newProduct}</span> with{" "}
            <span className="font-bold">{props.newBillingCycle}</span>{" "}
            billing. You will be billed for your existing plan now, and your new
            subscription will start from today.
          </div>
          <div>
            Are you sure you want to upgrade your plan?
          </div>
        </div>
      );
    }

    return (
      <div className="space-y-4 text-muted-foreground">
        <div>
          You will retain access to your current plan until the end of your
          billing cycle. After that, your plan will be downgraded to{" "}
          <span className="font-bold">{props.newProduct}</span> with{" "}
          <span className="font-bold">{props.newBillingCycle}</span> billing.
        </div>
        <div>
          Are you sure you want to downgrade your plan?
        </div>
      </div>
    );
  }

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button
          className="w-full"
          disabled={busy}
        >
          {props.changeType === "upgrade" ? "Upgrade" : "Downgrade"}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {props.changeType === "upgrade" ? "Upgrade Plan" : "Downgrade Plan"}
          </DialogTitle>
        </DialogHeader>

        <Description />

        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline" disabled={busy}>
              Cancel
            </Button>
          </DialogClose>
          <Button onClick={handleSubmit} disabled={busy}>
            {busy && <Loader2 className="w-4 h-4 animate-spin" />}
            Confirm {props.changeType === "upgrade" ? "Upgrade" : "Downgrade"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
