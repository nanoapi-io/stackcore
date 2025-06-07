import { useState } from "react";
import { Button } from "../components/shadcn/Button.tsx";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../components/shadcn/Card.tsx";
import { Input } from "../components/shadcn/Input.tsx";
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from "../components/shadcn/InputOTP.tsx";
import { toast } from "sonner";
import { ArrowRight, ChevronLeft, Loader, Mail, Shield } from "lucide-react";
import { useNavigate, useSearchParams } from "react-router";
import { useCoreApi } from "../contexts/CoreApi.tsx";
import z from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "../components/shadcn/Form.tsx";
import { AuthApiTypes } from "@stackcore/core/responses";

export default function LoginPage() {
  const navigate = useNavigate();
  const [searchParams, _] = useSearchParams();

  const coreApiContext = useCoreApi();

  const [isBusy, setIsBusy] = useState(false);

  const emailFormSchema = z.object({
    email: z.string().email(),
  });

  const emailForm = useForm<z.infer<typeof emailFormSchema>>({
    resolver: zodResolver(emailFormSchema),
    defaultValues: {
      email: "",
    },
    disabled: isBusy,
  });

  const otpFormSchema = z.object({
    otp: z.string().min(6, { message: "One time password must be 6 digits" }),
  });

  const otpForm = useForm<z.infer<typeof otpFormSchema>>({
    resolver: zodResolver(otpFormSchema),
    defaultValues: {
      otp: "",
    },
    disabled: isBusy,
  });

  const [step, setStep] = useState<"email" | "otp">("email");

  async function onEmailSubmit(values: z.infer<typeof emailFormSchema>) {
    setIsBusy(true);

    try {
      const { url, method, body } = AuthApiTypes.prepareRequestOtp({
        email: values.email,
      });

      const response = await coreApiContext.handleRequest(
        url,
        method,
        body,
      );

      if (!response.ok && response.status === 400) {
        const { error } = await response.json() as { error: string };
        if (error === "otp_already_requested") {
          toast.error(
            "One time password already requested, please wait and try again later",
          );
          setIsBusy(false);
          return;
        }
        throw new Error(error);
      }

      if (!response.ok || response.status !== 200) {
        throw new Error("Failed to send one time password");
      }

      setStep("otp");
    } catch (error) {
      console.error(error);
      toast.error("Failed to send one time password");
    } finally {
      setIsBusy(false);
    }
  }

  function handleOtpBack() {
    setStep("email");
  }

  async function handleOtpSubmit(values: z.infer<typeof otpFormSchema>) {
    setIsBusy(true);

    try {
      const {
        url,
        method,
        body,
      } = AuthApiTypes.prepareVerifyOtp(
        { email: emailForm.getValues("email"), otp: values.otp },
      );

      const response = await coreApiContext.handleRequest(
        url,
        method,
        body,
      );

      if (!response.ok && response.status === 400) {
        const { error } = await response.json() as { error: string };
        if (error === "invalid_otp") {
          toast.error("Invalid one time password");
          setIsBusy(false);
          return;
        }
        if (error === "otp_max_attempts") {
          toast.error("Too many attempts");
          setStep("email");
          setIsBusy(false);
          return;
        }
        throw new Error(error);
      }

      if (!response.ok || response.status !== 200) {
        throw new Error("Failed to verify one time password");
      }

      const { token } = await response.json() as AuthApiTypes.VerifyOtpResponse;

      coreApiContext.login(token);

      // Redirect to the location parameter or the root page
      const redirectLocation = searchParams.get("from") || "/";

      // Small delay to ensure all auth state is updated before redirecting
      // Should be small enough to not be noticeable to the user
      setTimeout(() => {
        navigate(redirectLocation);
      }, 500);
    } catch (error) {
      toast.error("Failed to verify one time password");
      console.error(error);
    } finally {
      setIsBusy(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="w-full max-w-md space-y-6">
        {/* Welcome Card */}
        <Card>
          <CardHeader className="flex flex-col items-center gap-2">
            <CardTitle className="flex flex-col items-center gap-2">
              <img src="/logo.png" alt="Logo" width={32} height={32} />
              <div className="text-2xl">
                Welcome to Stackcore
              </div>
            </CardTitle>
            <CardDescription>
              {step === "email"
                ? "Enter your email to get started with secure passwordless authentication"
                : "Check your email for the verification code"}
            </CardDescription>
          </CardHeader>
        </Card>

        {/* Auth Card */}
        <Card>
          <CardHeader className="flex flex-col items-center gap-2">
            <CardTitle className="flex items-center gap-2">
              {step === "email"
                ? (
                  <>
                    <Mail />
                    Sign In / Sign Up
                  </>
                )
                : (
                  <>
                    <Shield />
                    Verify Your Email
                  </>
                )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {step === "email"
              ? (
                <Form {...emailForm}>
                  <form
                    onSubmit={emailForm.handleSubmit(onEmailSubmit)}
                    className="space-y-5"
                  >
                    <FormField
                      control={emailForm.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>
                            Email Address
                          </FormLabel>
                          <FormControl>
                            <Input
                              {...field}
                              placeholder="your@email.com"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <Button
                      type="submit"
                      disabled={isBusy}
                      className="w-full"
                    >
                      {isBusy
                        ? <Loader className="animate-spin" />
                        : <ArrowRight />}
                      {isBusy ? "Sending..." : "Send Verification Code"}
                    </Button>
                  </form>
                </Form>
              )
              : (
                <Form {...otpForm}>
                  <form
                    onSubmit={otpForm.handleSubmit(handleOtpSubmit)}
                    className="space-y-5"
                  >
                    <FormDescription className="text-center">
                      We sent a 6-digit code to {emailForm.getValues("email")}
                    </FormDescription>

                    <FormField
                      control={otpForm.control}
                      name="otp"
                      render={({ field }) => (
                        <div className="flex justify-center">
                          <FormItem>
                            <div className="text-center">
                              <FormLabel>
                                Verification Code
                              </FormLabel>
                            </div>
                            <FormControl>
                              <InputOTP maxLength={6} {...field}>
                                <InputOTPGroup>
                                  <InputOTPSlot index={0} />
                                  <InputOTPSlot index={1} />
                                  <InputOTPSlot index={2} />
                                  <InputOTPSlot index={3} />
                                  <InputOTPSlot index={4} />
                                  <InputOTPSlot index={5} />
                                </InputOTPGroup>
                              </InputOTP>
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        </div>
                      )}
                    />

                    <div className="space-y-4">
                      <Button
                        type="submit"
                        disabled={isBusy}
                        className="w-full"
                      >
                        {isBusy
                          ? <Loader className="animate-spin" />
                          : <Shield />}
                        {isBusy ? "Verifying..." : "Verify & Sign In"}
                      </Button>

                      <Button
                        variant="secondary"
                        type="button"
                        disabled={isBusy}
                        onClick={handleOtpBack}
                        className="w-full"
                      >
                        <ChevronLeft />
                        Back to Email
                      </Button>
                    </div>
                  </form>
                </Form>
              )}
          </CardContent>
        </Card>

        {/* Footer */}
        <div className="text-center text-sm text-muted-foreground">
          {step === "email"
            ? (
              <p>
                We'll send you a secure code to verify your identity.
                <br />
                No passwords required.
              </p>
            )
            : (
              <p>
                Didn't receive the code? Check your spam folder or
                <Button
                  onClick={handleOtpBack}
                  variant="link"
                  size="sm"
                >
                  try again
                </Button>
              </p>
            )}
        </div>
      </div>
    </div>
  );
}
